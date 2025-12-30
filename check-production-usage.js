/**
 * Verifica últimos usos em produção
 */

require('dotenv').config({ path: '.env.local' });

async function checkProductionUsage() {
    const { Pool } = require('pg');

    const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 5,
    });

    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🔍 VERIFICANDO ÚLTIMOS USOS EM PRODUÇÃO\n');
    console.log('═'.repeat(60));

    try {
        // Buscar platform_id
        const platformResult = await pool.query(
            "SELECT id FROM platforms WHERE platform_code = 'chat_cct'"
        );
        const platformId = platformResult.rows[0].id;

        // Buscar últimos 10 usos
        console.log('\n📊 Últimos 10 usos de IA:\n');
        const usageResult = await pool.query(
            `SELECT
                id,
                total_tokens,
                total_cost_brl,
                created_at,
                status
             FROM usage_tracking
             WHERE user_email = $1 AND platform_id = $2
             ORDER BY created_at DESC
             LIMIT 10`,
            [email, platformId]
        );

        if (usageResult.rows.length === 0) {
            console.log('⚠️  Nenhum uso encontrado');
        } else {
            usageResult.rows.forEach((use, i) => {
                const date = new Date(use.created_at);
                console.log(`${i + 1}. ${use.total_tokens.toLocaleString('pt-BR')} tokens = R$ ${parseFloat(use.total_cost_brl).toFixed(6)}`);
                console.log(`   Data: ${date.toLocaleString('pt-BR')}`);
                console.log(`   Status: ${use.status}`);
                console.log('');
            });

            // Calcular total
            const totalTokens = usageResult.rows.reduce((sum, use) => sum + use.total_tokens, 0);
            const totalCost = usageResult.rows.reduce((sum, use) => sum + parseFloat(use.total_cost_brl), 0);

            console.log('═'.repeat(60));
            console.log(`📊 Total dos últimos 10 usos:`);
            console.log(`   Tokens: ${totalTokens.toLocaleString('pt-BR')}`);
            console.log(`   Custo: R$ ${totalCost.toFixed(6)}`);
        }

        // Verificar acumulação atual
        console.log('\n═'.repeat(60));
        console.log('💰 Acumulação atual:\n');

        const accumulationResult = await pool.query(
            `SELECT accumulated_cost_brl, accumulated_tokens, status
             FROM cost_accumulation
             WHERE user_email = $1 AND platform_id = $2
             ORDER BY updated_at DESC
             LIMIT 3`,
            [email, platformId]
        );

        if (accumulationResult.rows.length === 0) {
            console.log('⚠️  Nenhuma acumulação encontrada');
        } else {
            accumulationResult.rows.forEach((acc, i) => {
                console.log(`${i + 1}. Status: ${acc.status}`);
                console.log(`   Custo: R$ ${parseFloat(acc.accumulated_cost_brl).toFixed(6)}`);
                console.log(`   Tokens: ${acc.accumulated_tokens.toLocaleString('pt-BR')}`);
                console.log('');
            });
        }

        console.log('═'.repeat(60));

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkProductionUsage();
