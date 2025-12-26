/**
 * Script de diagnóstico para verificar se tokens estão sendo salvos
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Diagnóstico de tracking de tokens\n');

async function checkTracking() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Variáveis de ambiente não configuradas');
        console.log('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
        console.log('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        // 1. Verificar últimos registros na tabela token_usage
        console.log('📊 Últimos 10 registros de token_usage:\n');

        const { data: recentUsage, error: usageError } = await supabase
            .from('token_usage')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (usageError) {
            console.error('❌ Erro ao buscar token_usage:', usageError.message);
            return;
        }

        if (!recentUsage || recentUsage.length === 0) {
            console.log('⚠️  Nenhum registro encontrado na tabela token_usage');
            console.log('\n💡 Possíveis causas:');
            console.log('   1. Usuário não está autenticado (userId está null)');
            console.log('   2. A função trackTokenUsage não está sendo chamada');
            console.log('   3. Há erro no trackTokenUsage que está sendo silenciado');
            console.log('\n🔧 Verificações:');
            console.log('   - Faça login no sistema');
            console.log('   - Envie uma mensagem no chat');
            console.log('   - Verifique os logs do console do servidor (terminal onde roda npm run dev)');
            return;
        }

        console.log(`✅ Encontrados ${recentUsage.length} registros:\n`);

        recentUsage.forEach((usage, i) => {
            console.log(`${i + 1}. ID: ${usage.id.substring(0, 8)}...`);
            console.log(`   Email: ${usage.user_email || 'N/A'}`);
            console.log(`   Modelo: ${usage.model}`);
            console.log(`   Tokens: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);
            console.log(`   Custo estimado: $${usage.estimated_cost?.toFixed(6) || '0.000000'}`);
            console.log(`   Status: ${usage.status}`);
            console.log(`   Criado: ${new Date(usage.created_at).toLocaleString('pt-BR')}`);
            console.log('');
        });

        // 2. Estatísticas gerais
        const totalTokens = recentUsage.reduce((sum, u) => sum + (u.total_tokens || 0), 0);
        const totalCost = recentUsage.reduce((sum, u) => sum + (parseFloat(u.estimated_cost) || 0), 0);
        const withZeroCost = recentUsage.filter(u => parseFloat(u.estimated_cost || 0) === 0).length;

        console.log('📈 Estatísticas (últimos 10 registros):');
        console.log(`   Total de tokens: ${totalTokens.toLocaleString()}`);
        console.log(`   Custo total: $${totalCost.toFixed(6)}`);
        console.log(`   Registros com custo zero: ${withZeroCost}/10`);

        if (withZeroCost > 0) {
            console.log('\n⚠️  ATENÇÃO: Há registros com custo estimado zerado!');
            console.log('   Isso indica que os preços não estão sendo aplicados corretamente.');
        }

        // 3. Verificar usuários únicos
        const uniqueUsers = [...new Set(recentUsage.map(u => u.user_email).filter(Boolean))];
        console.log(`\n👥 Usuários únicos: ${uniqueUsers.length}`);
        uniqueUsers.forEach(email => {
            console.log(`   - ${email}`);
        });

    } catch (error) {
        console.error('❌ Erro durante diagnóstico:', error.message);
        console.error(error);
    }
}

checkTracking();
