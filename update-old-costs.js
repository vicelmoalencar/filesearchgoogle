/**
 * Script para atualizar custos estimados dos registros antigos
 *
 * Recalcula o estimated_cost de todos os registros com custo zerado
 * usando os preços oficiais do GCP em BRL
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Preços em BRL (R$) por 1M tokens - valores oficiais GCP
const PRICING = {
    'gemini-2.5-flash': { prompt: 1.834620875, completion: 15.288507299 },
    'gemini-2.0-flash-exp': { prompt: 0, completion: 0 },
    'gemini-pro-1.5': { prompt: 12.5, completion: 50 },
    'anthropic/claude-3.5-sonnet': { prompt: 15, completion: 75 },
    'anthropic/claude-3-opus': { prompt: 75, completion: 375 },
    'anthropic/claude-3-haiku': { prompt: 1.25, completion: 6.25 },
    'openai/gpt-4-turbo': { prompt: 50, completion: 150 },
    'openai/gpt-3.5-turbo': { prompt: 2.5, completion: 7.5 },
    'google/gemini-pro-1.5': { prompt: 12.5, completion: 50 },
    'meta-llama/llama-3-70b-instruct': { prompt: 2.95, completion: 3.95 },
};

function calculateCost(model, promptTokens, completionTokens) {
    const modelPricing = PRICING[model] || PRICING['gemini-2.5-flash'];
    const promptCost = (promptTokens / 1_000_000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * modelPricing.completion;
    return promptCost + completionCost;
}

console.log('🔄 Atualizando custos estimados dos registros antigos\n');

async function updateOldCosts() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Variáveis de ambiente não configuradas');
        console.log('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
        console.log('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        // 1. Buscar registros com custo zerado
        console.log('📊 Buscando registros com estimated_cost = 0...\n');

        const { data: records, error: fetchError } = await supabase
            .from('token_usage')
            .select('id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, created_at')
            .eq('estimated_cost', 0)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('❌ Erro ao buscar registros:', fetchError.message);
            return;
        }

        if (!records || records.length === 0) {
            console.log('✅ Nenhum registro com custo zerado encontrado!');
            console.log('   Todos os registros já possuem custos calculados.');
            return;
        }

        console.log(`📋 Encontrados ${records.length} registros para atualizar:\n`);

        // 2. Recalcular e atualizar cada registro
        let updated = 0;
        let failed = 0;
        let totalCostCalculated = 0;

        for (const record of records) {
            const newCost = calculateCost(
                record.model,
                record.prompt_tokens,
                record.completion_tokens
            );

            // Atualizar registro
            const { error: updateError } = await supabase
                .from('token_usage')
                .update({ estimated_cost: newCost })
                .eq('id', record.id);

            if (updateError) {
                console.error(`❌ Erro ao atualizar registro ${record.id.substring(0, 8)}:`, updateError.message);
                failed++;
            } else {
                updated++;
                totalCostCalculated += newCost;

                if (updated % 10 === 0) {
                    console.log(`   ✓ Processados ${updated}/${records.length} registros...`);
                }
            }
        }

        console.log('\n📊 Resumo da atualização:');
        console.log(`   ✅ Atualizados: ${updated} registros`);
        console.log(`   ❌ Falhas: ${failed} registros`);
        console.log(`   💰 Custo total calculado: R$ ${totalCostCalculated.toFixed(6)}`);
        console.log(`   📈 Custo médio por registro: R$ ${(totalCostCalculated / updated).toFixed(6)}\n`);

        // 3. Verificar se há registros zerados restantes
        const { data: remaining, error: checkError } = await supabase
            .from('token_usage')
            .select('id', { count: 'exact', head: true })
            .eq('estimated_cost', 0);

        if (!checkError) {
            const remainingCount = remaining || 0;
            if (remainingCount === 0) {
                console.log('✅ Todos os registros foram atualizados com sucesso!\n');
            } else {
                console.log(`⚠️  Ainda restam ${remainingCount} registros com custo zerado.\n`);
            }
        }

        // 4. Mostrar estatísticas gerais
        console.log('📊 Estatísticas gerais da tabela:');

        const { data: stats, error: statsError } = await supabase
            .from('token_usage')
            .select('estimated_cost, total_tokens');

        if (!statsError && stats) {
            const totalCost = stats.reduce((sum, r) => sum + (parseFloat(r.estimated_cost) || 0), 0);
            const totalTokens = stats.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
            const avgCost = totalCost / stats.length;

            console.log(`   Total de registros: ${stats.length}`);
            console.log(`   Total de tokens: ${totalTokens.toLocaleString()}`);
            console.log(`   Custo total: R$ ${totalCost.toFixed(6)}`);
            console.log(`   Custo médio: R$ ${avgCost.toFixed(6)}`);
        }

        console.log('\n✅ Atualização concluída!\n');

    } catch (error) {
        console.error('❌ Erro durante atualização:', error.message);
        console.error(error);
    }
}

// Confirmar antes de executar
console.log('⚠️  ATENÇÃO: Este script irá atualizar registros no banco de dados.\n');
console.log('Pressione Ctrl+C para cancelar ou aguarde 3 segundos para continuar...\n');

setTimeout(() => {
    updateOldCosts();
}, 3000);
