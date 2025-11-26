
import { NextRequest, NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

// Configure route for large file uploads
export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic';

/**
 * Resumable upload implementation for large files
 * Based on Google's recommended approach for files > 10MB
 */
export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null;
    let fileSizeMB = 0;

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        fileSizeMB = file.size / (1024 * 1024);
        console.log(`[Resumable Upload] Uploading file: ${file.name} (${file.size} bytes / ${fileSizeMB.toFixed(2)}MB)`);

        // Sanitize filename
        const sanitizedFileName = file.name.replace(/[^\w\s.-]/g, '_');
        console.log(`[Resumable Upload] Sanitized filename: ${sanitizedFileName}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save to temp file
        tempFilePath = path.join(os.tmpdir(), sanitizedFileName);
        await writeFile(tempFilePath, buffer);

        // Get or create File Search Store
        console.log("[Resumable Upload] Fetching File Search Stores...");
        const storesIterator = await genAIClient.fileSearchStores.list();
        const stores = [];

        for await (const s of storesIterator) {
            stores.push(s);
        }

        let store = stores.find(
            (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store) {
            console.log("[Resumable Upload] Creating new File Search Store...");
            const createResponse = await genAIClient.fileSearchStores.create({
                config: {
                    displayName: FILE_SEARCH_STORE_NAME
                }
            });

            // Wait for store creation
            if (createResponse.name && !createResponse.displayName) {
                let operation: any = createResponse;
                while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    operation = await genAIClient.operations.get({ operation: operation.name });
                }
                store = operation.response;
            } else {
                store = createResponse;
            }
        }

        if (!store || !store.name) {
            throw new Error("Failed to get or create File Search Store");
        }

        console.log(`[Resumable Upload] Uploading to store: ${store.name}`);

        // Initiate resumable upload session
        console.log("[Resumable Upload] Initiating upload session...");

        // Use the SDK's upload method with file path
        // The SDK handles the resumable upload internally for large files
        const uploadResponse = await genAIClient.fileSearchStores.uploadToFileSearchStore({
            file: tempFilePath,
            fileSearchStoreName: store.name,
            config: {
                displayName: sanitizedFileName,
            }
        });

        console.log("[Resumable Upload] Upload initiated, polling for completion...");

        // Poll for operation completion with proper timeout
        let operation: any = uploadResponse;
        const startTime = Date.now();
        const maxWaitTime = 300000; // 5 minutes for large files
        let pollCount = 0;

        while (!operation.done && operation.name) {
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error("File indexing timed out after 5 minutes");
            }

            // Poll every 5 seconds as recommended
            await new Promise(resolve => setTimeout(resolve, 5000));
            pollCount++;
            console.log(`[Resumable Upload] Polling attempt ${pollCount}...`);

            operation = await genAIClient.operations.get({ operation: operation.name });

            // Check if operation has progress info
            if (operation.metadata) {
                console.log(`[Resumable Upload] Progress: ${JSON.stringify(operation.metadata)}`);
            }
        }

        console.log("[Resumable Upload] File indexed successfully!");

        // Delete temp file
        await unlink(tempFilePath);
        tempFilePath = null;

        // Get the document name from the operation response
        const documentName = operation.response?.documentName ||
                            (uploadResponse.response ? uploadResponse.response.documentName : undefined);

        return NextResponse.json({
            success: true,
            file: {
                name: documentName,
                displayName: sanitizedFileName,
                originalName: file.name,
                storeName: store.name,
                storeDisplayName: store.displayName,
                size: file.size,
                mimeType: file.type,
                uploadMethod: 'resumable'
            }
        });

    } catch (error: any) {
        console.error("[Resumable Upload] Error:", error);

        // Clean up temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (unlinkError) {
                console.error("[Resumable Upload] Failed to clean up temp file:", unlinkError);
            }
        }

        // Provide specific error messages
        let errorMessage = "Upload failed";
        let statusCode = 500;
        let userGuidance = "";

        if (error.status === 503) {
            errorMessage = "Gemini API service is temporarily unavailable";
            statusCode = 503;
            userGuidance = "A API do Gemini está com problemas. Possíveis soluções:\n\n" +
                          "1. Este pode ser um problema temporário - aguarde 5-10 minutos\n" +
                          "2. Divida o arquivo em partes menores (5-10MB cada)\n" +
                          "3. Comprima o PDF usando ferramentas online\n" +
                          "4. Verifique se o arquivo tem menos de 500.000 tokens (~500 páginas)\n\n" +
                          "Nota: A API tem problemas conhecidos com arquivos grandes desde a última atualização.";
        } else if (error.status === 429) {
            errorMessage = "Limite de taxa excedido";
            statusCode = 429;
            userGuidance = "Você excedeu o limite de requisições. Aguarde alguns minutos e tente novamente.";
        } else if (error.message?.includes('timeout')) {
            errorMessage = "Upload expirou";
            statusCode = 504;
            userGuidance = `O upload de ${fileSizeMB.toFixed(2)}MB demorou muito. Tente:\n` +
                          "1. Dividir o arquivo em partes menores\n" +
                          "2. Verificar sua conexão de internet\n" +
                          "3. Tentar em horário de menor movimento";
        } else if (error.message?.includes('count tokens')) {
            errorMessage = "Erro ao processar tokens do arquivo";
            statusCode = 503;
            userGuidance = "Este é um bug conhecido da API do Gemini desde a última atualização.\n" +
                          "O arquivo pode ter muitos tokens ou conteúdo complexo.\n" +
                          "Tente dividir em arquivos menores ou aguarde uma correção do Google.";
        }

        return NextResponse.json({
            error: errorMessage,
            details: error instanceof Error ? error.message : String(error),
            code: error.status || error.code,
            guidance: userGuidance || undefined
        }, { status: statusCode });
    }
}
