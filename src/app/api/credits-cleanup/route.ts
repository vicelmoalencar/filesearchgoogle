import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
    try {
        const { email, action } = await request.json();

        if (!email) {
            return NextResponse.json({
                success: false,
                error: 'Email é obrigatório'
            }, { status: 400 });
        }

        const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

        const pool = new Pool({
            connectionString: connectionString,
            ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
            max: 5,
        });

        let result;

        if (action === 'check') {
            // Ver acumulações
            result = await pool.query(
                `SELECT * FROM cost_accumulation
                 WHERE user_email = $1
                 ORDER BY created_at DESC`,
                [email]
            );

            await pool.end();

            return NextResponse.json({
                success: true,
                accumulations: result.rows,
                count: result.rows.length
            });

        } else if (action === 'delete-active') {
            // Deletar acumulação ativa
            result = await pool.query(
                `DELETE FROM cost_accumulation
                 WHERE user_email = $1
                 AND status = 'accumulating'
                 RETURNING *`,
                [email]
            );

            await pool.end();

            return NextResponse.json({
                success: true,
                deleted: result.rows,
                count: result.rows.length,
                message: result.rows.length > 0 ? 'Acumulação deletada com sucesso' : 'Nenhuma acumulação ativa encontrada'
            });

        } else {
            return NextResponse.json({
                success: false,
                error: 'Action deve ser "check" ou "delete-active"'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ [Cleanup API] Erro:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
