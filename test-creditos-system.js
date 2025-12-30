/**
 * Teste do sistema centralizado de créditos
 */

require('dotenv').config({ path: '.env.local' });

async function testCreditosSystem() {
    // Importar funções da biblioteca
    const { trackUsage, checkAndDeductCredits } = require('./src/lib/creditos-centralizados.ts');

    const testEmail = 'teste@ensinoplus.com.br';

    console.log('🧪 Testando sistema de créditos centralizado\n');
    console.log('═'.repeat(60));

    try {
        // 1. Registrar uso de IA
        console.log('\n1️⃣ Registrando uso de IA...');
        await trackUsage({
            userEmail: testEmail,
            modelCode: 'gemini-2.5-flash',
            inputTokens: 1000,
            outputTokens: 500,
            audioTokens: 0,
            requestDurationMs: 1500,
            status: 'success',
            metadata: {
                test: true,
                source: 'test-script'
            }
        });
        console.log('✅ Uso registrado com sucesso!');

        // 2. Verificar saldo e acumulação
        console.log('\n2️⃣ Verificando saldo e acumulação...');
        const result = await checkAndDeductCredits(testEmail);

        console.log('Resultado:');
        console.log('  Sucesso:', result.success);
        console.log('  Mensagem:', result.message);
        console.log('  Saldo de créditos:', result.creditsBalance);
        console.log('  Custo acumulado: R$', result.accumulatedCost?.toFixed(6) || '0.000000');
        console.log('  Falta para deduzir: R$', result.costUntilNextDeduction?.toFixed(6) || '0.000000');

        if (result.creditsDeducted) {
            console.log('  🎉 Créditos deduzidos:', result.creditsDeducted);
        }

        console.log('\n═'.repeat(60));
        console.log('✅ Teste concluído com sucesso!');

    } catch (error) {
        console.error('\n❌ Erro no teste:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testCreditosSystem();
