
import { NextRequest, NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME, MODEL_NAME } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { message } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Get File Search Store
        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];

        for await (const store of storesIterator) {
            stores.push(store);
        }

        const store = stores.find(
            (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store || !store.name) {
            return NextResponse.json({
                error: "No File Search Store found. Please upload files first.",
            }, { status: 404 });
        }

        console.log(`Using File Search Store: ${store.name}`);

        // Generate content with File Search Tool (RAG)
        const response = await genAIClient.models.generateContent({
            model: MODEL_NAME,
            contents: message,
            config: {
                systemInstruction: "Você é um assistente prestativo que responde perguntas sobre cálculos trabalhistas e sistema pje-calc em português do Brasil. Somente se o usuário pedir, procure na fonte aulas_do_cct.txt e informe o link da aula que tratem exclusiva e diretamente sobre o assunto perguntado. Sempre responda em português, mesmo que a pergunta seja feita em outro idioma. Analise os documentos fornecidos e forneça respostas precisas e detalhadas baseadas no conteúdo dos arquivos. IMPORTANTE: Não inclua informações sobre a fonte dos dados, como números de páginas, nomes de arquivos, seções ou qualquer metadado sobre a origem da informação. Forneça apenas o conteúdo da resposta de forma direta e natural.",
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
