
import { NextRequest, NextResponse } from "next/server";
import { genAIClient, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

// Configure route for large file uploads
export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic';

// Helper function to make API calls with timeout and retry
async function withTimeoutAndRetry<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 30000,
    maxRetries: number = 3
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await Promise.race([
                fn(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);
        } catch (error: any) {
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message || error);

            // Check if it's a retryable error
            const isRetryable = error.status === 503 ||
                               error.status === 429 ||
                               error.message?.includes('timeout') ||
                               error.code === 'ECONNRESET';

            if (attempt === maxRetries || !isRetryable) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            console.log(`Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
    throw new Error('Retry logic failed');
}

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
        console.log(`Uploading file: ${file.name} (${file.size} bytes / ${fileSizeMB.toFixed(2)}MB)`);

        // Warn if file is too large (Gemini File Search API has issues with files > 10MB)
        if (file.size > 10 * 1024 * 1024) {
            console.warn(`Warning: File is larger than 10MB. The Gemini API may fail with 503 errors for large files.`);
        }

        // Sanitize filename - remove special characters that might cause issues
        const sanitizedFileName = file.name.replace(/[^\w\s.-]/g, '_');
        console.log(`Sanitized filename: ${sanitizedFileName}`);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save to temp file with sanitized name
        tempFilePath = path.join(os.tmpdir(), sanitizedFileName);
        await writeFile(tempFilePath, buffer);

        // Get or create File Search Store with timeout and retry
        console.log("Fetching File Search Stores...");
        const storesIterator = await withTimeoutAndRetry(
            () => genAIClient.fileSearchStores.list(),
            15000
        );
        const stores = [];

        for await (const s of storesIterator) {
            stores.push(s);
        }

        let store = stores.find(
            (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
        );

        if (!store) {
            console.log("Creating new File Search Store...");
            const createResponse = await withTimeoutAndRetry(
                () => genAIClient.fileSearchStores.create({
                    config: {
                        displayName: FILE_SEARCH_STORE_NAME
                    }
                }),
                20000
            );

            console.log("Create response:", JSON.stringify(createResponse, null, 2));

            // Check if it's an operation or direct response
            if (createResponse.name && !createResponse.displayName) {
                // It's an operation, wait for completion with timeout
                console.log("Waiting for store creation operation...");
                let operation: any = createResponse;
                const startTime = Date.now();
                const maxWaitTime = 60000; // 1 minute max

                while (!operation.done) {
                    if (Date.now() - startTime > maxWaitTime) {
                        throw new Error("Store creation timed out");
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    operation = await withTimeoutAndRetry(
                        () => genAIClient.operations.get({ operation: operation.name }),
                        10000
                    );
                }
                store = operation.response;
            } else {
                // Direct response
                store = createResponse;
            }
        }

        if (!store || !store.name) {
            throw new Error("Failed to get or create File Search Store");
        }

        console.log(`Uploading to store: ${store.name}`);

        // Upload file to File Search Store with timeout and retry
        console.log(`Uploading to File Search Store: ${store.name}`);
        console.log(`File path: ${tempFilePath}`);
        console.log(`Display name: ${sanitizedFileName}`);

        // Calculate timeout based on file size (minimum 60s, add 10s per MB)
        const uploadTimeout = Math.max(60000, 60000 + (fileSizeMB * 10000));
        console.log(`Upload timeout set to ${uploadTimeout}ms for ${fileSizeMB.toFixed(2)}MB file`);

        let uploadResponse = await withTimeoutAndRetry(
            () => genAIClient.fileSearchStores.uploadToFileSearchStore({
                file: tempFilePath!,
                fileSearchStoreName: store.name as string,
                config: {
                    displayName: sanitizedFileName,
                }
            }),
            uploadTimeout,
            2 // Allow 2 attempts for 503 errors
        );

        console.log("Upload response:", JSON.stringify(uploadResponse, null, 2));

        let finalUploadResponse: any;

        // If response is already populated, upload is complete
        if (uploadResponse.response) {
            console.log("File indexed successfully (instant completion)!");
            finalUploadResponse = uploadResponse;
        } else {
            // Otherwise, wait for operation to complete with timeout
            console.log("Waiting for indexing to complete...");
            let operation: any = uploadResponse;
            const startTime = Date.now();
            const maxWaitTime = 120000; // 2 minutes max for indexing

            while (!operation.done && operation.name) {
                if (Date.now() - startTime > maxWaitTime) {
                    throw new Error("File indexing timed out");
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
                operation = await withTimeoutAndRetry(
                    () => genAIClient.operations.get({ operation: operation.name }),
                    10000
                );
            }
            finalUploadResponse = operation;
            console.log("File indexed successfully (after polling)!");
        }

        // Delete temp file
        await unlink(tempFilePath);
        tempFilePath = null;

        const documentName = finalUploadResponse.response?.name;

        return NextResponse.json({
            success: true,
            file: {
                name: documentName,
                displayName: sanitizedFileName,
                originalName: file.name,
                storeName: store.name,
                storeDisplayName: store.displayName,
                size: file.size,
                mimeType: file.type
            }
        });
    } catch (error: any) {
        console.error("Upload error:", error);

        // Clean up temp file if it exists
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (unlinkError) {
                console.error("Failed to clean up temp file:", unlinkError);
            }
        }

        // Provide more specific error messages
        let errorMessage = "Upload failed";
        let statusCode = 500;
        let userGuidance = "";

        if (error.status === 503) {
            errorMessage = "Gemini API service is temporarily unavailable";
            statusCode = 503;

            // Provide specific guidance for large files
            if (fileSizeMB > 10) {
                userGuidance = "A API do Gemini está rejeitando este arquivo grande (" + fileSizeMB.toFixed(2) + "MB). Isso acontece porque a API tem limitações não documentadas para arquivos grandes. Por favor:\n\n" +
                              "1. Tente dividir o PDF em partes menores (até 5-10MB cada)\n" +
                              "2. Use uma ferramenta online para comprimir o PDF\n" +
                              "3. Se for um documento de texto, converta para TXT que é menor\n" +
                              "4. Aguarde alguns minutos e tente novamente (pode ser instabilidade temporária)\n\n" +
                              "Arquivos menores que 5MB geralmente funcionam sem problemas.";
            } else {
                userGuidance = "A API do Google Gemini está com problemas temporários. Por favor:\n\n" +
                              "1. Aguarde alguns minutos e tente novamente\n" +
                              "2. Verifique o status em: https://aistudio.google.com\n" +
                              "3. Tente fazer upload de um arquivo menor primeiro para testar\n" +
                              "4. Se o problema persistir, o serviço pode estar em manutenção";
            }
        } else if (error.status === 429) {
            errorMessage = "Limite de taxa da API excedido";
            statusCode = 429;
            userGuidance = "Você excedeu os limites de taxa da API do Gemini. Por favor:\n\n" +
                          "1. Aguarde alguns minutos antes de fazer upload de mais arquivos\n" +
                          "2. Verifique sua cota de API em: https://aistudio.google.com/app/apikey\n" +
                          "3. Considere fazer upgrade do seu plano se precisar de limites maiores";
        } else if (error.message?.includes('timeout')) {
            errorMessage = "Upload expirou (timeout)";
            statusCode = 504;
            userGuidance = "O upload demorou muito para ser concluído. Isso pode acontecer com:\n\n" +
                          "1. Arquivos grandes (seu arquivo tem " + (fileSizeMB || 0).toFixed(2) + "MB)\n" +
                          "2. Conexão de internet lenta\n" +
                          "3. API do Gemini lenta ou sobrecarregada\n\n" +
                          "Tente fazer upload de um arquivo menor ou tente novamente em horário de menor movimento.";
        }

        return NextResponse.json({
            error: errorMessage,
            details: error instanceof Error ? error.message : String(error),
            code: error.status || error.code,
            guidance: userGuidance || undefined
        }, { status: statusCode });
    }
}
