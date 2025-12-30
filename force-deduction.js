/**
 * Força dedução de créditos manualmente (para teste)
 */

require('dotenv').config({ path: '.env.local' });

async function forceDeduction() {
    const { checkAndDeductCredits } = require('./src/lib/creditos-centralizados.ts');

    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🧪 FORÇANDO DEDUÇÃO DE CRÉDITOS (TESTE)\n');
    console.log('═'.repeat(60));
    console.log(`Email: ${email}\n`);

    try {
        const result = await checkAndDeductCredits(email);

        console.log('\n📊 Resultado:');
        console.log(JSON.stringify(result, null, 2));

        if (result.creditsDeducted) {
            console.log('\n✅ SUCESSO! Créditos foram deduzidos.');
            console.log(`   Deduzido: ${result.creditsDeducted} crédito(s)`);
            console.log(`   Saldo restante: ${result.creditsBalance}`);
        } else {
            console.log('\n⚠️  Nenhum crédito foi deduzido ainda.');
            console.log(`   Custo acumulado: R$ ${result.accumulatedCost?.toFixed(6) || '0'}`);
            console.log(`   Falta: R$ ${result.costUntilNextDeduction?.toFixed(6) || '0'}`);
        }

        console.log('\n═'.repeat(60));

    } catch (error) {
        console.error('\n❌ ERRO ao forçar dedução:', error.message);
        console.error(error);
    }
}

forceDeduction();
