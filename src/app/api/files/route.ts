
import { NextRequest, NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";

export async function GET() {
    try {
        // Get File Search Store
        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];

        for await (const s of storesIterator) {
            stores.push(s);
        }

        const store = stores.find(
            (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store || !store.name) {
            return NextResponse.json({ files: [] });
        }

        // List documents from File Search Store
        const documentsIterator = await genAIClient.fileSearchStores.documents.list({
            parent: store.name
        });

        const files = [];
        for await (const doc of documentsIterator) {
            files.push({
                name: doc.name,
                displayName: doc.displayName,
                state: doc.state,
                uri: doc.name,
                mimeType: doc.mimeType || 'application/octet-stream',
                size: doc.sizeBytes,
                createdAt: doc.createTime
            });
        }

        return NextResponse.json({ files });
    } catch (error) {
        console.error("List files error:", error);
        return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get("name");

        if (!name) {
            return NextResponse.json({ error: "File name is required" }, { status: 400 });
        }

        // Delete document from File Search Store
        // force: true é necessário para deletar documentos que foram indexados
        await genAIClient.fileSearchStores.documents.delete({
            name,
            config: {
                force: true
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete file error:", error);
        return NextResponse.json({
            error: "Failed to delete file",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
