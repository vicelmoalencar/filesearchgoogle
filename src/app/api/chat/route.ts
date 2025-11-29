
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { FILE_SEARCH_STORE_NAME, MODEL_NAME } from "@/lib/gemini";
import { getSystemPrompt } from "@/app/api/prompt/route";
import { getApiKeyById } from "@/lib/api-keys-storage";

export async function POST(request: NextRequest) {
    try {
        const { message, apiKeyId } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Obter a chave API selecionada
        let apiKey = process.env.GEMINI_API_KEY;
        let storeSuffix = "";

        if (apiKeyId) {
            const keyData = getApiKeyById(apiKeyId);
            if (keyData) {
                apiKey = keyData.apiKey;
                storeSuffix = `_${keyData.theme.replace(/\s+/g, '_')}`;
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

        if (apiKeyId) {
            const keyData = getApiKeyById(apiKeyId);
            if (keyData && keyData.customPrompt && keyData.customPrompt.trim()) {
                systemInstruction = keyData.customPrompt;
                console.log(`Using custom prompt for key: ${keyData.name}`);
            }
        }

        // Generate content with File Search Tool (RAG)
        const response = await genAIClient.models.generateContent({
            model: MODEL_NAME,
            contents: message,
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
