/**
 * Teste direto da API PHP para verificar se está funcionando
 */

async function testPhpApi() {
    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🧪 TESTANDO API PHP DIRETAMENTE\n');
    console.log('═'.repeat(60));

    // Teste 1: POST (correto)
    console.log('\n1️⃣ Teste com POST (CORRETO):');
    try {
        const response = await fetch('https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        console.log('   Status:', response.status);
        const data = await response.json();
        console.log('   Resposta:', JSON.stringify(data, null, 2));

        if (data.success && data.data?.credits !== undefined) {
            console.log('   ✅ SUCESSO! Créditos:', data.data.credits);
        } else {
            console.log('   ❌ FALHA! Data:', data);
        }
    } catch (error) {
        console.error('   ❌ ERRO:', error.message);
    }

    // Teste 2: GET (antigo, pode não funcionar)
    console.log('\n2️⃣ Teste com GET (ANTIGO):');
    try {
        const response = await fetch(`https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('   Status:', response.status);
        const data = await response.json();
        console.log('   Resposta:', JSON.stringify(data, null, 2));

        if (data.success && data.data?.credits !== undefined) {
            console.log('   ✅ SUCESSO! Créditos:', data.data.credits);
        } else {
            console.log('   ❌ FALHA! Data:', data);
        }
    } catch (error) {
        console.error('   ❌ ERRO:', error.message);
    }

    console.log('\n═'.repeat(60));
}

testPhpApi();
