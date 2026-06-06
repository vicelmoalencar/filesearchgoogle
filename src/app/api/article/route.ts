
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { FILE_SEARCH_STORE_NAME, MODEL_NAME } from "@/lib/gemini";
import { getApiKeyById } from "@/lib/api-keys-env";
import { getEmailFromAuthHeader } from "@/lib/supabase-server";
import { saveArticle } from "@/lib/articles-storage";
import { trackUsage, checkAndDeductCredits } from "@/lib/creditos-centralizados";

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '';
}

const ARTICLE_SYSTEM_INSTRUCTION = `Você é um redator especializado em produção de artigos jornalísticos e técnicos.

REGRAS ABSOLUTAS — NUNCA VIOLE ESTAS REGRAS:
1. Você SOMENTE pode usar informações encontradas nos documentos disponibilizados via File Search.
2. É PROIBIDO usar qualquer conhecimento próprio, treinamento interno ou informação da internet.
3. Se os documentos não contiverem informação suficiente sobre o tema solicitado, informe explicitamente: "Não encontrei conteúdo suficiente nos documentos carregados para escrever sobre este tema."
4. Cada afirmação no artigo deve ser fundamentada exclusivamente no conteúdo dos documentos.
5. NUNCA invente dados, estatísticas, citações, nomes ou qualquer informação que não esteja explicitamente nos documentos.
6. Se parte do conteúdo solicitado não estiver nos documentos, omita essa parte e mencione a limitação ao final do artigo.

FORMATO DE SAÍDA:
- Escreva o artigo em português do Brasil.
- Use formatação Markdown (títulos com #, ##, ###; negrito com **texto**; listas com - ou 1.).
- Inclua um título principal (# Título) seguido pelo artigo.
- Ao final, adicione uma seção "## Fontes" listando os documentos consultados, se disponíveis.`;

async function generateTags(client: InstanceType<typeof GoogleGenAI>, topic: string, title: string): Promise<string[]> {
    try {
        const response = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                role: 'user',
                parts: [{ text: `Extraia 5 tags relevantes em português para um artigo intitulado "${title || topic}" sobre o tema "${topic}". Retorne APENAS um array JSON de strings curtas (1-3 palavras cada). Exemplo: ["Direito Trabalhista","CLT","Horas Extras","Rescisão","FGTS"]` }]
            }],
            config: {
                systemInstruction: 'Retorne APENAS um array JSON de strings curtas em português, sem markdown, sem explicações, sem texto adicional.'
            }
        });
        const text = response.text?.trim() || '[]';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) return parsed.slice(0, 5).map(String);
        }
    } catch (err) {
        console.warn('[Article] Tag generation failed:', err instanceof Error ? err.message : err);
    }
    return [topic.slice(0, 30)];
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let userEmail: string | null = null;

    console.log('[Article] DATABASE_URL_CREDITOS configurado:', !!process.env.DATABASE_URL_CREDITOS);

    try {
        const authHeader = request.headers.get('authorization');
        userEmail = getEmailFromAuthHeader(authHeader);
        console.log('[Article] userEmail do JWT:', userEmail || '(não encontrado)');

        const { topic, tone, length, structure, apiKeyIds, publish = true } = await request.json();

        const keyIds: string[] = Array.isArray(apiKeyIds)
            ? apiKeyIds
            : apiKeyIds ? [apiKeyIds] : [];

        if (!topic || !topic.trim()) {
            return NextResponse.json({ error: "O tema do artigo é obrigatório" }, { status: 400 });
        }

        // Verificar saldo de créditos
        if (userEmail) {
            try {
                const creditsResponse = await fetch(
                    'https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail })
                    }
                );
                const creditsData = await creditsResponse.json();
                if (creditsData.success && creditsData.credits <= 0) {
                    return NextResponse.json({
                        error: "Você não possui créditos suficientes para gerar artigos. Por favor, recarregue seus créditos.",
                        credits: creditsData.credits
                    }, { status: 403 });
                }
            } catch (err) {
                console.error('[Article] Failed to check credits:', err);
            }
        }

        if (keyIds.length === 0) {
            return NextResponse.json({ error: "Selecione pelo menos uma fonte." }, { status: 400 });
        }

        // Coleta stores de cada chave
        const selectedStoreNames: string[] = [];
        for (const keyId of keyIds) {
            try {
                const keyData = getApiKeyById(keyId);
                const currentApiKey = keyData?.apiKey || process.env.GEMINI_API_KEY;
                if (!currentApiKey) continue;

                const client = new GoogleGenAI({ apiKey: currentApiKey });
                const suffix = keyData && keyData.id !== 'default'
                    ? `_${keyData.theme.replace(/\s+/g, '_')}`
                    : '';
                const displayName = FILE_SEARCH_STORE_NAME + suffix;

                const iter = await client.fileSearchStores.list();
                for await (const store of iter) {
                    if (store.displayName === displayName && store.name) {
                        if (!selectedStoreNames.includes(store.name as string)) {
                            selectedStoreNames.push(store.name as string);
                            console.log(`[Article] Store adicionado: ${displayName}`);
                        }
                        break;
                    }
                }
            } catch (err) {
                console.warn(`[Article] Erro ao buscar store para keyId ${keyId}:`, err instanceof Error ? err.message : err);
            }
        }

        if (selectedStoreNames.length === 0) {
            return NextResponse.json({
                error: "Nenhum banco de documentos encontrado para as fontes selecionadas. Por favor, faça upload de arquivos primeiro.",
            }, { status: 404 });
        }

        const MAX_STORES = 5;
        const limitedStoreNames = selectedStoreNames.slice(0, MAX_STORES);
        if (selectedStoreNames.length > MAX_STORES) {
            console.warn(`[Article] ${selectedStoreNames.length} stores selecionados, limitando aos primeiros ${MAX_STORES}`);
        }

        const primaryApiKey = getApiKeyById(keyIds[0])?.apiKey || process.env.GEMINI_API_KEY;
        if (!primaryApiKey) {
            return NextResponse.json({ error: "Nenhuma chave API configurada" }, { status: 500 });
        }
        const genAIClient = new GoogleGenAI({ apiKey: primaryApiKey });

        console.log(`[Article] Gerando com ${limitedStoreNames.length} store(s)`);

        const toneMap: Record<string, string> = {
            informativo: "tom informativo e claro, acessível ao público geral",
            tecnico: "tom técnico e preciso, voltado para profissionais da área",
            jornalistico: "tom jornalístico, objetivo e com linguagem direta",
            academico: "tom acadêmico, formal e referenciado",
        };
        const lengthMap: Record<string, string> = {
            curto: "artigo curto de aproximadamente 300 palavras",
            medio: "artigo médio de aproximadamente 600 palavras",
            longo: "artigo longo de aproximadamente 1200 palavras",
        };
        const structureMap: Record<string, string> = {
            completo: "Estruture com: Título, Introdução, Desenvolvimento (com subtópicos), Conclusão e Fontes.",
            resumo: "Estruture com: Título, Resumo executivo e Pontos principais em lista.",
            opiniao: "Estruture com: Título, Contexto, Argumento central, Evidências dos documentos e Considerações finais.",
        };

        const selectedTone = toneMap[tone] || toneMap.informativo;
        const selectedLength = lengthMap[length] || lengthMap.medio;
        const selectedStructure = structureMap[structure] || structureMap.completo;

        const userPrompt = `Escreva um ${selectedLength} sobre o seguinte tema: "${topic.trim()}"

Use ${selectedTone}.

${selectedStructure}

IMPORTANTE: Baseie-se EXCLUSIVAMENTE nos documentos disponíveis via File Search. Se não houver conteúdo suficiente nos documentos sobre este tema, informe claramente e não invente informações.`;

        const response = await genAIClient.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction: ARTICLE_SYSTEM_INSTRUCTION,
                tools: [{ fileSearch: { fileSearchStoreNames: limitedStoreNames } }]
            }
        });

        const article = response.text || "";
        const durationMs = Date.now() - startTime;

        if (!article.trim()) {
            return NextResponse.json({
                error: "Não foi possível gerar o artigo. Verifique se há documentos carregados com conteúdo sobre o tema."
            }, { status: 500 });
        }

        // Extrair título do markdown
        const title = extractTitle(article) || topic.slice(0, 120);

        // Gerar tags
        const tags = await generateTags(genAIClient, topic, title);
        console.log('[Article] Tags geradas:', tags);

        // Salvar artigo no PostgreSQL
        let articleId: string | null = null;
        if (userEmail) {
            articleId = await saveArticle({
                userEmail,
                title,
                content: article,
                topic: topic.trim(),
                tone: tone || 'informativo',
                length: length || 'medio',
                structure: structure || 'completo',
                tags,
                published: publish !== false,
                sourcesUsed: keyIds,
            });
            if (articleId) {
                console.log('[Article] Artigo salvo no PostgreSQL, id:', articleId);
            } else {
                console.warn('[Article] Falha ao salvar artigo no PostgreSQL');
            }
        } else {
            console.warn('[Article] userEmail nulo — artigo não salvo no banco');
        }

        // Tracking de créditos (fire-and-forget)
        if (userEmail) {
            const promptTokens = estimateTokens(userPrompt) + estimateTokens(ARTICLE_SYSTEM_INSTRUCTION);
            const completionTokens = estimateTokens(article);
            trackUsage({
                userEmail,
                modelCode: MODEL_NAME,
                inputTokens: promptTokens,
                outputTokens: completionTokens,
                requestDurationMs: durationMs,
                status: 'success',
                metadata: { apiKeyIds: keyIds, feature: 'article', tone, length, structure, storesUsed: selectedStoreNames.length }
            }).then(() => checkAndDeductCredits(userEmail!))
              .then((result) => {
                console.log(`[Article] Créditos: balance=${result.creditsBalance}, deduzido=${result.creditsDeducted || 0}`);
              })
              .catch(err => console.error('[Article] ERRO tracking:', err instanceof Error ? err.message : err));
        }

        return NextResponse.json({ article, articleId, tags });
    } catch (error) {
        console.error("Article generation error:", error);
        return NextResponse.json({
            error: "Falha ao gerar artigo",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
