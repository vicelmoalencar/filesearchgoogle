
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { FILE_SEARCH_STORE_NAME, MODEL_NAME } from "@/lib/gemini";
import { getSystemPrompt } from "@/app/api/prompt/route";
import { getApiKeyById } from "@/lib/api-keys-env";
import { supabase } from "@/lib/supabase";
import { trackUsage, checkAndDeductCredits } from "@/lib/creditos-centralizados";

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let userEmail: string | null = null;

    try {
        // Obter usuário autenticado
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (user) {
                userEmail = user.email || null;
            }
        }

        const { message, history, apiKeyId } = await request.json();

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
                // fail-safe: permite continuar se a verificação falhar
            }
        }

        // Obter a chave API selecionada
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
            return NextResponse.json({ error: "No API key configured" }, { status: 500 });
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
                error: `No File Search Store found for this chat. Please upload files first.`,
            }, { status: 404 });
        }

        let systemInstruction = getSystemPrompt();

        if (apiKeyId) {
            const keyData = getApiKeyById(apiKeyId);
            if (keyData && keyData.customPrompt && keyData.customPrompt.trim()) {
                systemInstruction = keyData.customPrompt;
            }
        }

        const contents = [
            ...(history || []),
            { role: 'user', parts: [{ text: message }] }
        ];

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

        const text = response.text || "";
        const durationMs = Date.now() - startTime;

        // Registrar uso e verificar dedução (não bloqueia a resposta)
        if (userEmail) {
            const promptTokens = estimateTokens(message) + estimateTokens(systemInstruction);
            const completionTokens = estimateTokens(text);

            trackUsage({
                userEmail,
                modelCode: MODEL_NAME,
                inputTokens: promptTokens,
                outputTokens: completionTokens,
                requestDurationMs: durationMs,
                status: 'success',
                metadata: { apiKeyId: apiKeyId || 'default', feature: 'chat' }
            }).then(() => checkAndDeductCredits(userEmail!)).then((result) => {
                if (result.creditsDeducted) {
                    console.log(`[Chat] ✅ Deduzido ${result.creditsDeducted} crédito(s) de ${userEmail}`);
                }
            }).catch(err => {
                console.error('[Chat] Failed to track usage:', err);
            });
        }

        return NextResponse.json({ response: text });
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json({
            error: "Chat failed",
            details: error instanceof Error ? error.message : String(error),
            tip: "Check your API key and ensure the Generative Language API is enabled in Google Cloud."
        }, { status: 500 });
    }
}
