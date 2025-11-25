
import { NextRequest, NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`Uploading file: ${file.name} (${file.size} bytes)`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save to temp file
        const tempFilePath = path.join(os.tmpdir(), file.name);
        await writeFile(tempFilePath, buffer);

        // Get or create File Search Store
        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];

        for await (const s of storesIterator) {
            stores.push(s);
        }

        let store = stores.find(
            (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store) {
            console.log("Creating new File Search Store...");
            const createResponse = await genAIClient.fileSearchStores.create({
                config: {
                    displayName: FILE_SEARCH_STORE_NAME
                }
            });

            console.log("Create response:", JSON.stringify(createResponse, null, 2));

            // Check if it's an operation or direct response
            if (createResponse.name && !createResponse.displayName) {
                // It's an operation, wait for completion
                console.log("Waiting for store creation operation...");
                let operation: any = createResponse;
                while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    operation = await genAIClient.operations.get({ operation: operation.name });
                }
                store = operation.response || operation.fileSearchStore;
            } else {
                // Direct response
                store = createResponse.fileSearchStore || createResponse;
            }
        }

        if (!store || !store.name) {
            throw new Error("Failed to get or create File Search Store");
        }

        console.log(`Uploading to store: ${store.name}`);

        // Upload file to File Search Store (permanent storage with RAG)
        let uploadResponse = await genAIClient.fileSearchStores.uploadToFileSearchStore({
            file: tempFilePath,
            fileSearchStoreName: store.name,
            config: {
                displayName: file.name,
            }
        });

        console.log("Upload response:", JSON.stringify(uploadResponse, null, 2));

        // If response is already populated, upload is complete
        // No need to poll for completion
        if (uploadResponse.response) {
            console.log("File indexed successfully (instant completion)!");
        } else {
            // Otherwise, wait for operation to complete
            console.log("Waiting for indexing to complete...");
            let operation: any = uploadResponse;
            while (!operation.done && operation.name) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                operation = await genAIClient.operations.get({ operation: operation.name });
            }
            uploadResponse = operation;
            console.log("File indexed successfully (after polling)!");
        }

        // Delete temp file
        await unlink(tempFilePath);

        return NextResponse.json({
            success: true,
            file: {
                name: uploadResponse.response?.name || uploadResponse.name,
                displayName: file.name,
                storeName: store.name,
                storeDisplayName: store.displayName,
                size: file.size,
                mimeType: file.type
            }
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({
            error: "Upload failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
