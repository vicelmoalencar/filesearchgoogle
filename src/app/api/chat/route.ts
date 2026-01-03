
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { FILE_SEARCH_STORE_NAME, MODEL_NAME } from "@/lib/gemini";
import { getSystemPrompt } from "@/app/api/prompt/route";
import { getApiKeyById } from "@/lib/api-keys-env";
import { trackTokenUsage, estimateTokens } from "@/lib/usage-tracking";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let userId: string | null = null;
    let userEmail: string | null = null;
    let apiKeyId: string | undefined;

    try {
        // Obter usuário autenticado
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (user) {
                userId = user.id;
                userEmail = user.email || null;
            }
        }

        const requestBody = await request.json();
        const message = requestBody.message;
        const history = requestBody.history;
        apiKeyId = requestBody.apiKeyId;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Verificar saldo de créditos antes de processar
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
                        error: "Você não possui créditos suficientes para fazer perguntas. Por favor, recarregue seus créditos.",
                        credits: creditsData.credits
                    }, { status: 403 });
                }
            } catch (err) {
                console.error('[Chat] Failed to check credits:', err);
                // Em caso de erro na verificação, permite continuar (fail-safe)
            }
        }

        // Obter a chave API selecionada
        let apiKey = process.env.GEMINI_API_KEY;
        let storeSuffix = "";

        if (apiKeyId) {
            const keyData = getApiKeyById(apiKeyId);
            if (keyData) {
                apiKey = keyData.apiKey;
                // Apenas adicionar sufixo se não for a chave default
                if (keyData.id !== 'default') {
                    storeSuffix = `_${keyData.theme.replace(/\s+/g, '_')}`;
                }
            }
        }

        if (!apiKey) {
            return NextResponse.json({
                error: "No API key configured"
            }, { status: 500 });
        }

        // Criar cliente com a chave selecionada
        const genAIClient = new GoogleGenAI({ apiKey });

        // Get File Search Store
        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];

        for await (const store of storesIterator) {
            stores.push(store);
        }

        // Buscar store específico do tema ou store padrão
        const storeDisplayName = FILE_SEARCH_STORE_NAME + storeSuffix;
        const store = stores.find(
            (s: any) => s.displayName === storeDisplayName
        );

        if (!store || !store.name) {
            return NextResponse.json({
                error: `No File Search Store found for this chat. Please upload files first.`,
            }, { status: 404 });
        }

        console.log(`Using File Search Store: ${store.name} (${storeDisplayName})`);

        // Get dynamic system prompt - verifica se a chave tem prompt customizado
        let systemInstruction = getSystemPrompt();

        console.log('\n=== PROMPT DEBUG START ===');
        console.log(`[Chat] API Key ID received: ${apiKeyId || 'none'}`);
        console.log(`[Chat] Default system prompt length: ${systemInstruction.length}`);
        console.log(`[Chat] Default prompt preview: ${systemInstruction.substring(0, 150)}...`);

        if (apiKeyId) {
            const keyData = getApiKeyById(apiKeyId);
            console.log(`\n[Chat] Key Data found:`, {
                id: keyData?.id,
                name: keyData?.name,
                theme: keyData?.theme,
                hasCustomPrompt: !!keyData?.customPrompt,
                promptLength: keyData?.customPrompt?.length || 0,
                customPromptPreview: keyData?.customPrompt?.substring(0, 100) || 'NONE'
            });
            console.log('[Chat] Full customPrompt value:', keyData?.customPrompt);

            if (keyData && keyData.customPrompt && keyData.customPrompt.trim()) {
                systemInstruction = keyData.customPrompt;
                console.log(`\n[Chat] ✅ Using custom prompt for key: ${keyData.name}`);
                console.log(`[Chat] Custom prompt length: ${systemInstruction.length}`);
                console.log(`[Chat] Custom prompt preview: ${systemInstruction.substring(0, 150)}...`);
            } else {
                console.log(`\n[Chat] ⚠️ No custom prompt found, using default system prompt`);
                console.log(`[Chat] Reason: ${!keyData ? 'Key not found' : !keyData.customPrompt ? 'customPrompt is undefined/null' : 'customPrompt is empty after trim'}`);
            }
        } else {
            console.log(`\n[Chat] ⚠️ No apiKeyId provided, using default system prompt`);
        }
        console.log('=== PROMPT DEBUG END ===\n');

        // Construir array de contents com histórico + mensagem atual
        const contents = [
            ...(history || []), // Histórico de conversação anterior
            { role: 'user', parts: [{ text: message }] } // Mensagem atual do usuário
        ];

        console.log('\n🚀 [GEMINI API CALL]');
        console.log('Model:', MODEL_NAME);
        console.log('System Instruction being sent to API:', systemInstruction.substring(0, 200) + '...');
        console.log('System Instruction length:', systemInstruction.length);

        // Generate content with File Search Tool (RAG) e histórico de contexto
        const response = await genAIClient.models.generateContent({
            model: MODEL_NAME,
            contents: contents,
            config: {
                systemInstruction,
                tools: [{
                    fileSearch: {
                        fileSearchStoreNames: [store.name as string]
                    }
                }]
            }
        });

        console.log('✅ [GEMINI API RESPONSE] Received\n');

        const text = response.text || "";
        const durationMs = Date.now() - startTime;

        // Estimar tokens (o Gemini não retorna contagem de tokens no response)
        const promptTokens = estimateTokens(message) + estimateTokens(systemInstruction);
        const completionTokens = estimateTokens(text);
        const totalTokens = promptTokens + completionTokens;

        // Registrar uso de tokens (não bloquear a resposta)
        if (userId) {
            const keyData = apiKeyId ? getApiKeyById(apiKeyId) : null;

            console.log('\n🎯 [CHAT] Rastreando uso de tokens...');
            console.log(`   User: ${userEmail}`);
            console.log(`   Model: ${MODEL_NAME}`);
            console.log(`   Prompt tokens: ${promptTokens}`);
            console.log(`   Completion tokens: ${completionTokens}`);
            console.log(`   Total: ${totalTokens}`);

            // trackTokenUsage JÁ chama checkAndDeductCredits internamente
            trackTokenUsage({
                userId,
                userEmail: userEmail || undefined,
                apiKeyId: apiKeyId || 'default',
                apiKeyName: keyData?.name,
                provider: 'google',
                model: MODEL_NAME,
                promptText: message,
                responseText: text,
                promptTokens,
                completionTokens,
                totalTokens,
                durationMs,
                status: 'success'
            }).then(() => {
                console.log('✅ [CHAT] trackTokenUsage concluído (inclui verificação de créditos)');
            }).catch(err => {
                console.error('❌ [CHAT] Failed to track usage:', err);
            });
        }

        return NextResponse.json({ response: text });
    } catch (error) {
        console.error("Chat error:", error);
        const durationMs = Date.now() - startTime;

        // Registrar erro (não bloquear a resposta de erro)
        if (userId) {
            const keyData = apiKeyId ? getApiKeyById(apiKeyId) : null;

            trackTokenUsage({
                userId,
                userEmail: userEmail || undefined,
                apiKeyId: apiKeyId || 'default',
                apiKeyName: keyData?.name,
                provider: 'google',
                model: MODEL_NAME,
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                durationMs,
                status: 'error',
                errorMessage: error instanceof Error ? error.message : String(error)
            }).catch(err => {
                console.error('[Chat] Failed to track error:', err);
            });
        }

        return NextResponse.json({
            error: "Chat failed",
            details: error instanceof Error ? error.message : String(error),
            tip: "Check your API key and ensure the Generative Language API is enabled in Google Cloud."
        }, { status: 500 });
    }
}
