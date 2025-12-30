/**
 * Verifica acumulações no PostgreSQL
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkAccumulations() {
    const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 5,
    });

    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🔍 VERIFICANDO ACUMULAÇÕES\n');
    console.log('═'.repeat(60));
    console.log(`Email: ${email}\n`);

    try {
        // Buscar TODAS as acumulações (independente do status)
        const result = await pool.query(
            `SELECT * FROM cost_accumulation
             WHERE user_email = $1
             ORDER BY created_at DESC`,
            [email]
        );

        console.log(`📊 Total de acumulações: ${result.rows.length}\n`);

        if (result.rows.length === 0) {
            console.log('⚠️ Nenhuma acumulação encontrada');
        } else {
            result.rows.forEach((acc, i) => {
                console.log(`${i + 1}. Acumulação ID ${acc.id}:`);
                console.log(`   Status: ${acc.status}`);
                console.log(`   Custo: R$ ${parseFloat(acc.accumulated_cost_brl).toFixed(6)}`);
                console.log(`   Tokens: ${acc.accumulated_tokens}`);
                console.log(`   Criado: ${new Date(acc.created_at).toLocaleString('pt-BR')}`);
                console.log(`   Atualizado: ${new Date(acc.updated_at).toLocaleString('pt-BR')}`);
                if (acc.deducted_at) {
                    console.log(`   Deduzido em: ${new Date(acc.deducted_at).toLocaleString('pt-BR')}`);
                }
                console.log('');
            });
        }

        console.log('═'.repeat(60));

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkAccumulations();
