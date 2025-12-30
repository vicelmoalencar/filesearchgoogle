/**
 * Script de diagnóstico para verificar por que a dedução não está funcionando
 */

require('dotenv').config({ path: '.env.local' });

async function diagnosticar() {
    const { Pool } = require('pg');

    const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 5,
    });

    const email = 'antoniovicelmo@gmail.com'; // Altere para seu email

    console.log('🔍 DIAGNÓSTICO DO SISTEMA DE DEDUÇÃO DE CRÉDITOS\n');
    console.log('═'.repeat(60));

    try {
        // 1. Verificar plataforma
        console.log('\n1️⃣ Verificando plataforma...');
        const platformResult = await pool.query(
            "SELECT * FROM platforms WHERE platform_code = 'chat_cct'"
        );

        if (platformResult.rows.length === 0) {
            console.error('❌ ERRO: Plataforma chat_cct não encontrada!');
            console.log('Execute: INSERT INTO platforms (platform_code, platform_name) VALUES (\'chat_cct\', \'Chat CCT\');');
            process.exit(1);
        }

        const platformId = platformResult.rows[0].id;
        console.log(`✅ Plataforma encontrada: ID ${platformId}`);

        // 2. Verificar configuração
        console.log('\n2️⃣ Verificando configuração de custo...');
        const configResult = await pool.query(
            "SELECT * FROM credit_config WHERE config_key = 'cost_per_credit_brl'"
        );

        if (configResult.rows.length === 0) {
            console.error('❌ ERRO: Configuração cost_per_credit_brl não encontrada!');
            process.exit(1);
        }

        const costPerCredit = parseFloat(configResult.rows[0].config_value);
        console.log(`✅ Custo por crédito: R$ ${costPerCredit}`);

        // 3. Verificar usuário
        console.log('\n3️⃣ Verificando usuário...');
        const userResult = await pool.query(
            'SELECT * FROM users_credits WHERE user_email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            console.log('⚠️  Usuário não existe ainda, será criado no primeiro uso');
        } else {
            const user = userResult.rows[0];
            console.log(`✅ Usuário encontrado:`);
            console.log(`   - Saldo: ${user.credits_balance} créditos`);
            console.log(`   - Total usado: ${user.total_credits_used} créditos`);
            console.log(`   - Total comprado: ${user.total_credits_purchased} créditos`);
        }

        // 4. Verificar acumulação
        console.log('\n4️⃣ Verificando acumulação...');
        const accumulationResult = await pool.query(
            `SELECT * FROM cost_accumulation
             WHERE user_email = $1 AND platform_id = $2 AND status = 'accumulating'`,
            [email, platformId]
        );

        if (accumulationResult.rows.length === 0) {
            console.log('⚠️  Nenhuma acumulação ativa encontrada');
        } else {
            const acc = accumulationResult.rows[0];
            const accumulatedCost = parseFloat(acc.accumulated_cost_brl);
            const creditsReady = Math.floor(accumulatedCost / costPerCredit);
            const percentage = (accumulatedCost / costPerCredit) * 100;

            console.log(`✅ Acumulação ativa:`);
            console.log(`   - Custo acumulado: R$ ${accumulatedCost.toFixed(6)}`);
            console.log(`   - Tokens acumulados: ${acc.accumulated_tokens.toLocaleString('pt-BR')}`);
            console.log(`   - Progresso: ${percentage.toFixed(1)}%`);
            console.log(`   - Créditos prontos para deduzir: ${creditsReady}`);

            if (creditsReady > 0) {
                console.log('\n✨ ATENÇÃO: Há créditos prontos para dedução!');
                console.log(`   Ao fazer a próxima pergunta no chat, ${creditsReady} crédito(s) serão deduzidos.`);
            } else {
                const remaining = costPerCredit - accumulatedCost;
                console.log(`\n⏳ Faltam R$ ${remaining.toFixed(6)} para deduzir 1 crédito`);
            }
        }

        // 5. Verificar últimas deduções
        console.log('\n5️⃣ Verificando histórico de deduções...');
        const deductionsResult = await pool.query(
            `SELECT * FROM credit_deductions
             WHERE user_email = $1 AND platform_id = $2
             ORDER BY deducted_at DESC
             LIMIT 5`,
            [email, platformId]
        );

        if (deductionsResult.rows.length === 0) {
            console.log('⚠️  Nenhuma dedução encontrada ainda');
        } else {
            console.log(`✅ Últimas ${deductionsResult.rows.length} deduções:`);
            deductionsResult.rows.forEach((ded, i) => {
                console.log(`   ${i + 1}. R$ ${parseFloat(ded.cost_accumulated_brl).toFixed(6)} → ${ded.credits_deducted} crédito(s) deduzidos`);
                console.log(`      Data: ${new Date(ded.deducted_at).toLocaleString('pt-BR')}`);
                console.log(`      Saldo após: ${ded.credits_remaining} créditos`);
            });
        }

        // 6. Verificar últimos usos
        console.log('\n6️⃣ Verificando últimos usos de IA...');
        const usageResult = await pool.query(
            `SELECT * FROM usage_tracking
             WHERE user_email = $1 AND platform_id = $2
             ORDER BY created_at DESC
             LIMIT 3`,
            [email, platformId]
        );

        if (usageResult.rows.length === 0) {
            console.log('⚠️  Nenhum uso registrado ainda');
        } else {
            console.log(`✅ Últimos ${usageResult.rows.length} usos:`);
            usageResult.rows.forEach((use, i) => {
                console.log(`   ${i + 1}. ${use.total_tokens.toLocaleString('pt-BR')} tokens = R$ ${parseFloat(use.total_cost_brl).toFixed(6)}`);
                console.log(`      Data: ${new Date(use.created_at).toLocaleString('pt-BR')}`);
            });
        }

        console.log('\n═'.repeat(60));
        console.log('✅ Diagnóstico concluído!');

    } catch (error) {
        console.error('\n❌ ERRO no diagnóstico:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

diagnosticar();
