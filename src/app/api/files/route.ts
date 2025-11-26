
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
        console.log(`Listing documents from store: ${store.name}`);

        // Fetch all documents with pagination support
        // Note: API maximum pageSize is 20
        const documentsIterator = await genAIClient.fileSearchStores.documents.list({
            parent: store.name,
            config: {
                pageSize: 20 // Maximum allowed by Gemini API
            }
        });

        const files = [];
        let count = 0;

        try {
            for await (const doc of documentsIterator) {
                count++;
                console.log(`Found document ${count}:`, {
                    name: doc.name,
                    displayName: doc.displayName,
                    state: doc.state,
                    mimeType: doc.mimeType
                });

                files.push({
                    name: doc.name,
                    displayName: doc.displayName || 'Unnamed',
                    state: doc.state || 'UNKNOWN',
                    uri: doc.name,
                    mimeType: doc.mimeType || 'application/octet-stream',
                    size: doc.sizeBytes,
                    createdAt: doc.createTime
                });
            }
        } catch (iterError) {
            console.error("Error iterating documents:", iterError);
        }

        console.log(`Total files found: ${files.length}`);

        // Sort by creation time (newest first)
        files.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

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
