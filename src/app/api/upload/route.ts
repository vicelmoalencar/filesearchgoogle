
import { NextRequest, NextResponse } from "next/server";
import { fileManager } from "@/lib/gemini";
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

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save to temp file
        const tempFilePath = path.join(os.tmpdir(), file.name);
        await writeFile(tempFilePath, buffer);

        // Upload to Google File Manager
        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type,
            displayName: file.name,
        });

        // Delete temp file
        await unlink(tempFilePath);

        return NextResponse.json({ success: true, file: uploadResponse.file });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
