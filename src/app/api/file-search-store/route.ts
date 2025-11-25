
import { NextRequest, NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";

// Get or create File Search Store
export async function GET(request: NextRequest) {
    try {
        console.log("Checking for existing File Search Store...");

        // List all stores and collect them into an array
        const storesResult = await genAIClient.fileSearchStores.list();
        const allStores = [];
        for await (const s of storesResult) {
            allStores.push(s);
        }

        // Find existing store by name
        let store = allStores.find(
            (s) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (store) {
            console.log("Found existing store:", store.name);
            return NextResponse.json({
                success: true,
                store: {
                    name: store.name,
                    displayName: store.displayName,
                    createTime: store.createTime,
                    updateTime: store.updateTime
                }
            });
        }

        // Create new store if not found
        console.log("Creating new File Search Store...");
        const createOp = await genAIClient.fileSearchStores.create({
            config: {
                displayName: FILE_SEARCH_STORE_NAME
            }
        });

        store = createOp;
        console.log("Store created:", store?.name);

        return NextResponse.json({
            success: true,
            store: {
                name: store?.name,
                displayName: store?.displayName,
                createTime: store?.createTime,
                updateTime: store?.updateTime
            },
            created: true
        });

    } catch (error) {
        console.error("File Search Store error:", error);
        return NextResponse.json({
            error: "Failed to get or create File Search Store",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

// Delete File Search Store
export async function DELETE(request: NextRequest) {
    try {
        const storesResult = await genAIClient.fileSearchStores.list();
        const allStores = [];
        for await (const s of storesResult) {
            allStores.push(s);
        }
        const store = allStores.find(
            (s) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store || !store.name) {
            return NextResponse.json({
                success: false,
                message: "Store not found or has no name"
            }, { status: 404 });
        }

        await genAIClient.fileSearchStores.delete({ name: store.name });

        return NextResponse.json({
            success: true,
            message: "Store deleted successfully"
        });

    } catch (error) {
        console.error("Delete store error:", error);
        return NextResponse.json({
            error: "Failed to delete store",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
