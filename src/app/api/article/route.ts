
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { FILE_SEARCH_STORE_NAME, MODEL_NAME } from "@/lib/gemini";
import { getApiKeyById } from "@/lib/api-keys-env";

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

export async function POST(request: NextRequest) {
    try {
        const { topic, tone, length, structure, apiKeyId } = await request.json();

        if (!topic || !topic.trim()) {
            return NextResponse.json({ error: "O tema do artigo é obrigatório" }, { status: 400 });
        }

        let apiKey = process.env.GEMINI_API_KEY;
        let storeSuffix = "";

        if (apiKeyId) {
            const keyData = getApiKeyById(apiKeyId);
            if (keyData) {
                apiKey = keyData.apiKey;
                if (keyData.id !== 'default') {
                    storeSuffix = `_${keyData.theme.replace(/\s+/g, '_')}`;
                }
            }
        }

        if (!apiKey) {
            return NextResponse.json({ error: "Nenhuma chave API configurada" }, { status: 500 });
        }

        const genAIClient = new GoogleGenAI({ apiKey });

        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];
        for await (const store of storesIterator) {
            stores.push(store);
        }

        const storeDisplayName = FILE_SEARCH_STORE_NAME + storeSuffix;
        const store = stores.find((s: any) => s.displayName === storeDisplayName);

        if (!store || !store.name) {
            return NextResponse.json({
                error: "Nenhum banco de documentos encontrado para este chat. Por favor, faça upload de arquivos primeiro.",
            }, { status: 404 });
        }

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
                tools: [{
                    fileSearch: {
                        fileSearchStoreNames: [store.name as string]
                    }
                }]
            }
        });

        const article = response.text || "";

        if (!article.trim()) {
            return NextResponse.json({
                error: "Não foi possível gerar o artigo. Verifique se há documentos carregados com conteúdo sobre o tema."
            }, { status: 500 });
        }

        return NextResponse.json({ article });
    } catch (error) {
        console.error("Article generation error:", error);
        return NextResponse.json({
            error: "Falha ao gerar artigo",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
