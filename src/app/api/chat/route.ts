
import { NextRequest, NextResponse } from "next/server";
import { genAI, fileManager, MODEL_NAME } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { message, history } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Get all active files
        const filesResponse = await fileManager.listFiles();
        const activeFiles = filesResponse.files || [];

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: "Você é um assistente prestativo que responde perguntas sobre cálculos trabalhistas e sistema pje-calc em português do Brasil. Somente se o usuário pedir, procure na fonte aulas_do_cct.txt e informe o link da aula que tratem exclusiva e diretamente sobre o assunto perguntado. Sempre responda em português, mesmo que a pergunta seja feita em outro idioma. Analise os documentos fornecidos e forneça respostas precisas e detalhadas baseadas no conteúdo dos arquivos. IMPORTANTE: Não inclua informações sobre a fonte dos dados, como números de páginas, nomes de arquivos, seções ou qualquer metadado sobre a origem da informação. Forneça apenas o conteúdo da resposta de forma direta e natural."
        });

        const chat = model.startChat({
            history: history || [],
        });

        // Construct the prompt with file references
        const fileParts = activeFiles.map(file => ({
            fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
            },
        }));

        const result = await chat.sendMessage([...fileParts, { text: message }]);
        const response = await result.response;
        const text = response.text();

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
