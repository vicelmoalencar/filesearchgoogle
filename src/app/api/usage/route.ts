import { NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";

export async function GET() {
    try {
        // Listar stores
        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];

        for await (const s of storesIterator) {
            stores.push(s);
        }

        const store = stores.find(
            (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store || !store.name) {
            return NextResponse.json({
                store: null,
                documentCount: 0,
                totalSize: 0
            });
        }

        // Contar documentos e calcular tamanho total
        const documentsIterator = await genAIClient.fileSearchStores.documents.list({
            parent: store.name
        });

        let documentCount = 0;
        let totalSize = 0;
        const documents = [];

        for await (const doc of documentsIterator) {
            documentCount++;
            const docSize = parseInt(doc.sizeBytes as any) || 0;
            totalSize += docSize;
            documents.push({
                name: doc.displayName,
                size: docSize,
                sizeMB: (docSize / (1024 * 1024)).toFixed(2),
                state: doc.state,
                createTime: doc.createTime
            });
        }

        return NextResponse.json({
            store: {
                name: store.name,
                displayName: store.displayName,
                createTime: store.createTime,
                updateTime: store.updateTime
            },
            documentCount,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(3),
            percentUsed: ((totalSize / (1024 * 1024 * 1024)) * 100).toFixed(2) + "%",
            storageLimit: "1 GB grátis",
            documents,
            info: "Armazenamento permanente. Você paga apenas $0.15 por 1 milhão de tokens na indexação inicial."
        });
    } catch (error) {
        console.error("Usage check error:", error);
        return NextResponse.json({
            error: "Failed to check usage",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
