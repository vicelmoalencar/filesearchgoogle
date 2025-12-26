import { NextRequest, NextResponse } from "next/server";
import { checkAndDeductCredits } from "@/lib/credit-checker";

export async function POST(request: NextRequest) {
    try {
        const { userId, userEmail } = await request.json();

        if (!userId || !userEmail) {
            return NextResponse.json(
                { error: "userId and userEmail are required" },
                { status: 400 }
            );
        }

        const result = await checkAndDeductCredits(userId, userEmail);

        if (!result.success && result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('[Check Credits API] Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
