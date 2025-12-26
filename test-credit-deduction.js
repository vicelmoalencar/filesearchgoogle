/**
 * Script de teste para verificar o sistema de dedução de créditos
 *
 * Este script simula o consumo de tokens e testa se a dedução está funcionando
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = 'teste@exemplo.com'; // Altere para seu email de teste

console.log('🧪 Iniciando teste de dedução de créditos\n');

async function testCreditDeduction() {
    const { createClient } = require('@supabase/supabase-js');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
        console.log('Configure as variáveis no .env.local');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        console.log('📊 Passo 1: Verificando usuário de teste...');

        // Buscar usuário de teste
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();

        if (userError) {
            console.error('❌ Erro ao buscar usuários:', userError.message);
            return;
        }

        const testUser = users.users.find(u => u.email === TEST_EMAIL);

        if (!testUser) {
            console.error(`❌ Usuário com email ${TEST_EMAIL} não encontrado`);
            console.log('💡 Dica: Faça login no sistema com este email primeiro ou altere TEST_EMAIL no script');
            return;
        }

        const userId = testUser.id;
        console.log(`✅ Usuário encontrado: ${TEST_EMAIL} (ID: ${userId.substring(0, 8)}...)\n`);

        // Passo 2: Verificar tokens existentes
        console.log('📊 Passo 2: Verificando tokens acumulados...');

        const { data: existingTokens, error: tokenError } = await supabase
            .from('token_usage')
            .select('total_tokens')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (tokenError) {
            console.error('❌ Erro ao buscar tokens:', tokenError.message);
            return;
        }

        const currentTotal = existingTokens?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) || 0;
        console.log(`   Total de tokens existentes: ${currentTotal.toLocaleString()}`);
        console.log(`   Faltam ${(50000 - (currentTotal % 50000)).toLocaleString()} tokens para próxima dedução\n`);

        // Passo 3: Simular consumo de tokens
        console.log('📊 Passo 3: Simulando consumo de tokens...');
        console.log('   Vou inserir 3 registros de uso com tokens suficientes para deduzir 1 crédito\n');

        const testTokens = [
            { prompt: 15000, completion: 5000 },   // 20.000 tokens
            { prompt: 18000, completion: 7000 },   // 25.000 tokens
            { prompt: 10000, completion: 5000 }    // 15.000 tokens
            // Total: 60.000 tokens (deve deduzir 1 crédito)
        ];

        for (let i = 0; i < testTokens.length; i++) {
            const { prompt, completion } = testTokens[i];
            const total = prompt + completion;

            const { error: insertError } = await supabase
                .from('token_usage')
                .insert({
                    user_id: userId,
                    user_email: TEST_EMAIL,
                    api_key_id: 'test-key',
                    api_key_name: 'Test Key',
                    provider: 'google',
                    model: 'gemini-2.5-flash',
                    prompt_tokens: prompt,
                    completion_tokens: completion,
                    total_tokens: total,
                    estimated_cost: (prompt * 0.000000075) + (completion * 0.0000003),
                    status: 'success'
                });

            if (insertError) {
                console.error(`❌ Erro ao inserir registro ${i + 1}:`, insertError.message);
                return;
            }

            console.log(`   ✅ Registro ${i + 1} inserido: ${total.toLocaleString()} tokens`);
        }

        const totalSimulatedTokens = testTokens.reduce((sum, t) => sum + t.prompt + t.completion, 0);
        console.log(`\n   Total simulado: ${totalSimulatedTokens.toLocaleString()} tokens`);
        console.log(`   Total acumulado: ${(currentTotal + totalSimulatedTokens).toLocaleString()} tokens\n`);

        // Passo 4: Chamar API de verificação de créditos
        console.log('📊 Passo 4: Chamando API de verificação de créditos...');

        const response = await fetch('http://localhost:3000/api/check-credits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                userEmail: TEST_EMAIL
            })
        });

        const result = await response.json();

        console.log('\n📋 Resultado da API:');
        console.log(JSON.stringify(result, null, 2));

        // Passo 5: Verificar dedução
        console.log('\n📊 Passo 5: Verificando deduções registradas...');

        const { data: deductions, error: deductionError } = await supabase
            .from('credit_deductions')
            .select('*')
            .eq('user_id', userId)
            .order('deducted_at', { ascending: false })
            .limit(5);

        if (deductionError) {
            console.error('❌ Erro ao buscar deduções:', deductionError.message);
            return;
        }

        if (deductions && deductions.length > 0) {
            console.log(`\n✅ Encontradas ${deductions.length} deduções:`);
            deductions.forEach((d, i) => {
                console.log(`\n   Dedução ${i + 1}:`);
                console.log(`   - Tokens consumidos: ${d.tokens_consumed?.toLocaleString()}`);
                console.log(`   - Créditos deduzidos: ${d.credits_deducted}`);
                console.log(`   - Créditos restantes: ${d.credits_remaining}`);
                console.log(`   - Data: ${new Date(d.deducted_at).toLocaleString('pt-BR')}`);
            });
        } else {
            console.log('   ⚠️  Nenhuma dedução encontrada');
        }

        // Passo 6: Limpar dados de teste (opcional)
        console.log('\n📊 Passo 6: Deseja limpar os dados de teste?');
        console.log('   Execute manualmente no Supabase SQL Editor:');
        console.log(`\n   DELETE FROM token_usage WHERE user_id = '${userId}' AND api_key_id = 'test-key';`);
        console.log(`   DELETE FROM credit_deductions WHERE user_id = '${userId}';`);

        console.log('\n✅ Teste concluído!\n');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error(error);
    }
}

// Executar teste
testCreditDeduction();
