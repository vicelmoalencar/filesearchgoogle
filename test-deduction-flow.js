/**
 * Testa o fluxo completo: Limpar acumulação → Testar dedução PHP
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testDeductionFlow() {
    const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 5,
    });

    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('\n🧪 TESTE DE DEDUÇÃO COMPLETO\n');
    console.log('═'.repeat(60));

    try {
        // 1️⃣ LIMPAR ACUMULAÇÃO PRESA
        console.log('\n1️⃣ Limpando acumulações presas...\n');

        const deleteResult = await pool.query(
            `DELETE FROM cost_accumulation
             WHERE user_email = $1
             AND status = 'accumulating'
             RETURNING *`,
            [email]
        );

        if (deleteResult.rows.length > 0) {
            console.log(`✅ ${deleteResult.rows.length} acumulação(ões) deletada(s):`);
            deleteResult.rows.forEach(acc => {
                console.log(`   - ID ${acc.id}: R$ ${parseFloat(acc.accumulated_cost_brl).toFixed(6)}, ${acc.accumulated_tokens} tokens`);
            });
        } else {
            console.log('ℹ️  Nenhuma acumulação presa encontrada');
        }

        // 2️⃣ TESTAR API PHP DE DEDUÇÃO
        console.log('\n2️⃣ Testando dedução na API PHP...\n');

        const phpUrl = 'https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php';
        console.log(`   URL: ${phpUrl}`);
        console.log(`   Email: ${email}`);
        console.log(`   Créditos a deduzir: 1`);

        const phpResponse = await fetch(phpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                credits: 1
            })
        });

        console.log(`   Status HTTP: ${phpResponse.status}`);

        const phpData = await phpResponse.json();
        console.log(`   Resposta:`, phpData);

        if (phpData.success) {
            console.log('\n✅ DEDUÇÃO BEM SUCEDIDA!');
            console.log(`   Novo saldo: ${phpData.new_balance || phpData.credits || 'não informado'} créditos`);
        } else {
            console.log('\n❌ DEDUÇÃO FALHOU!');
            console.log(`   Erro: ${phpData.message || phpData.error || 'Desconhecido'}`);
        }

        // 3️⃣ VERIFICAR SALDO ATUAL
        console.log('\n3️⃣ Verificando saldo atual...\n');

        const getUrl = 'https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php';
        const getResponse = await fetch(getUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const getData = await getResponse.json();
        console.log(`   Resposta:`, getData);

        if (getData.success) {
            const currentCredits = getData.credits;
            console.log(`\n💰 Saldo atual: ${currentCredits} créditos`);
        }

        console.log('\n═'.repeat(60));

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

testDeductionFlow();
