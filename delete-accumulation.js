/**
 * Deleta acumulação que ficou presa para permitir recomeçar
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function deleteAccumulation() {
    const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 5,
    });

    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🗑️  DELETANDO ACUMULAÇÃO PRESA\n');
    console.log('═'.repeat(60));
    console.log(`Email: ${email}\n`);

    try {
        // Deletar acumulação ativa
        const result = await pool.query(
            `DELETE FROM cost_accumulation
             WHERE user_email = $1
             AND status = 'accumulating'
             RETURNING *`,
            [email]
        );

        if (result.rows.length > 0) {
            const acc = result.rows[0];
            console.log('✅ Acumulação deletada:');
            console.log(`   ID: ${acc.id}`);
            console.log(`   Custo: R$ ${parseFloat(acc.accumulated_cost_brl).toFixed(6)}`);
            console.log(`   Tokens: ${acc.accumulated_tokens}`);
            console.log(`   Status: ${acc.status}`);
            console.log('\n⚠️ ATENÇÃO: Esses tokens/custos foram PERDIDOS!');
            console.log('   Mas agora o sistema pode recomeçar a acumular do zero.');
        } else {
            console.log('⚠️  Nenhuma acumulação ativa encontrada');
        }

        console.log('\n═'.repeat(60));

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

deleteAccumulation();
