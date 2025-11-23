
import { NextRequest, NextResponse } from "next/server";
import { fileManager } from "@/lib/gemini";

export async function GET() {
    try {
        const response = await fileManager.listFiles();
        return NextResponse.json({ files: response.files });
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

        await fileManager.deleteFile(name);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete file error:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
