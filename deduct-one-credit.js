/**
 * Deduz 1 crédito do email antoniovicelmo@gmail.com
 */

require('dotenv').config({ path: '.env.local' });

async function deductOneCredit() {
    const email = 'antoniovicelmo@gmail.com';

    console.log('\n💰 DEDUZINDO 1 CRÉDITO\n');
    console.log('═'.repeat(60));
    console.log(`Email: ${email}\n`);

    try {
        const phpUrl = 'https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php';

        console.log('🔄 Chamando API PHP...');
        console.log(`   URL: ${phpUrl}`);
        console.log(`   Créditos a deduzir: 1\n`);

        const response = await fetch(phpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                credits: 1
            })
        });

        console.log(`   Status HTTP: ${response.status}`);

        const data = await response.json();
        console.log(`   Resposta:`, data);

        if (data.success) {
            console.log('\n✅ DEDUÇÃO BEM SUCEDIDA!');
            console.log(`   Mensagem: ${data.message}`);
            console.log(`   Créditos deduzidos: ${data.credits_deducted}`);
            console.log(`   Saldo restante: ${data.credits_remaining || data.credits || 'não informado'} créditos`);
        } else {
            console.log('\n❌ DEDUÇÃO FALHOU!');
            console.log(`   Erro: ${data.message || data.error || 'Desconhecido'}`);
        }

        console.log('\n═'.repeat(60));

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error(error);
    }
}

deductOneCredit();
