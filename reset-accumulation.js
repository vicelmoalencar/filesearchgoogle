/**
 * Reseta acumulação que ficou presa
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function resetAccumulation() {
    const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 5,
    });

    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🔄 RESETANDO ACUMULAÇÃO PRESA\n');
    console.log('═'.repeat(60));
    console.log(`Email: ${email}\n`);

    try {
        // Marcar acumulação atual como 'deducted'
        const result = await pool.query(
            `UPDATE cost_accumulation
             SET status = 'deducted',
                 deducted_at = CURRENT_TIMESTAMP,
                 credits_deducted = FLOOR(accumulated_cost_brl / 0.05)
             WHERE user_email = $1
             AND status = 'accumulating'
             RETURNING *`,
            [email]
        );

        if (result.rows.length > 0) {
            const acc = result.rows[0];
            console.log('✅ Acumulação marcada como deduzida:');
            console.log(`   ID: ${acc.id}`);
            console.log(`   Custo: R$ ${parseFloat(acc.accumulated_cost_brl).toFixed(6)}`);
            console.log(`   Tokens: ${acc.accumulated_tokens}`);
            console.log(`   Créditos que seriam deduzidos: ${acc.credits_deducted}`);
        } else {
            console.log('⚠️ Nenhuma acumulação ativa encontrada');
        }

        console.log('\n═'.repeat(60));

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

resetAccumulation();
