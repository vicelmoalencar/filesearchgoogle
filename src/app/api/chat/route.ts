
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
                systemInstruction: "Atue como um especialista em cálculos trabalhistas e no sistema PJe-Calc. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.\n\n**Diretrizes de Resposta:**\n1.  **Base de Conhecimento:** Priorize sempre as informações contidas nos documentos fornecidos. Responda com base estrita nesse conteúdo.\n2.  **Citação de Fonte:** Apenas se o usuário solicitar explicitamente, informe o link da aula que originou a resposta. Fora dessa situação, não mencione a fonte, nomes de arquivos ou qualquer metadado.\n3.  **Escopo:** Mantenha-se focado nos temas de cálculos trabalhistas e PJe-Calc. Se a pergunta fugir do escopo, informe que você não possui informações sobre o assunto.\n4.  **Linguagem:** Responda de forma direta e profissional, como um consultor.\n5.  **Imagens:** Quando houver links de imagens nas fontes, use a sintaxe markdown `![descrição](url)` para exibir as imagens na resposta. Isso permite que o usuário visualize diagramas, gráficos e ilustrações diretamente no chat.",
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
