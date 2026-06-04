
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 5,
});

async function getCostPerCredit(): Promise<number> {
    try {
        const result = await pool.query(
            "SELECT config_value FROM credit_config WHERE config_key = 'cost_per_credit_brl'"
        );
        return result.rows.length > 0 ? parseFloat(result.rows[0].config_value) : 0.04;
    } catch {
        return 0.04;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required', success: false }, { status: 400 });
        }

        if (!connectionString) {
            return NextResponse.json({
                success: false,
                error: 'Database not configured',
                accumulatedCost: 0,
                accumulatedTokens: 0,
                costPerCredit: 0.04,
                costRemaining: 0.04,
                percentage: 0,
                isReady: false
            });
        }

        const COST_PER_CREDIT = await getCostPerCredit();

        const accumulationResult = await pool.query(
            `SELECT accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND status = 'accumulating' AND platform_id IS NULL`,
            [email]
        );

        let accumulatedCost = 0;
        let accumulatedTokens = 0;

        if (accumulationResult.rows.length > 0) {
            accumulatedCost = parseFloat(accumulationResult.rows[0].accumulated_cost_brl);
            accumulatedTokens = accumulationResult.rows[0].accumulated_tokens;
        }

        const percentage = Math.min((accumulatedCost / COST_PER_CREDIT) * 100, 100);
        const costRemaining = Math.max(COST_PER_CREDIT - accumulatedCost, 0);

        return NextResponse.json({
            success: true,
            accumulatedCost,
            accumulatedTokens,
            costPerCredit: COST_PER_CREDIT,
            costRemaining,
            percentage: Math.round(percentage),
            isReady: accumulatedCost >= COST_PER_CREDIT
        });

    } catch (error) {
        console.error('[Credits Progress] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            accumulatedCost: 0,
            accumulatedTokens: 0,
            costPerCredit: 0.04,
            costRemaining: 0.04,
            percentage: 0,
            isReady: false
        });
    }
}
