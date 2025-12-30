import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Converter formato Python para Node.js
const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 5,
});

/**
 * Busca configuração do custo por crédito do banco
 */
async function getCostPerCredit(): Promise<number> {
    try {
        const result = await pool.query(
            "SELECT config_value FROM credit_config WHERE config_key = 'cost_per_credit_brl'"
        );

        return result.rows.length > 0
            ? parseFloat(result.rows[0].config_value)
            : 0.04; // Fallback
    } catch (error) {
        console.error('[Credits Progress] Error fetching config:', error);
        return 0.04; // Fallback
    }
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Buscar configuração do custo por crédito
        const COST_PER_CREDIT = await getCostPerCredit();

        // Buscar platform_id do Chat CCT
        const platformResult = await pool.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            ['chat_cct']
        );

        if (platformResult.rows.length === 0) {
            return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
        }

        const platformId = platformResult.rows[0].id;

        // Buscar acumulação atual do usuário
        const accumulationResult = await pool.query(
            `SELECT accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND platform_id = $2 AND status = 'accumulating'`,
            [email, platformId]
        );

        let accumulatedCost = 0;
        let accumulatedTokens = 0;

        if (accumulationResult.rows.length > 0) {
            accumulatedCost = parseFloat(accumulationResult.rows[0].accumulated_cost_brl);
            accumulatedTokens = accumulationResult.rows[0].accumulated_tokens;
        }

        // Calcular porcentagem
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
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
        }, { status: 500 });
    }
}
