
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

        // List documents in the store
        const documentsIterator = await genAIClient.fileSearchStores.listDocuments({
            fileSearchStoreName: store.name
        });

        const documents = [];
        for await (const doc of documentsIterator) {
            documents.push({
                name: doc.name,
                displayName: doc.displayName || doc.name?.split('/').pop(),
                mimeType: doc.mimeType || 'application/octet-stream',
                state: 'ACTIVE',
                uri: doc.name
            });
        }

        return NextResponse.json({ files: documents });
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
        await genAIClient.fileSearchStores.deleteDocument({ name });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete file error:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
