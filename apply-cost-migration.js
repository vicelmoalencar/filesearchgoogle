/**
 * Script para aplicar migração: adicionar coluna cost_accumulated
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Aplicando migração: add_cost_accumulated_column\n');

async function applyMigration() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Variáveis de ambiente não configuradas');
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        // Ler arquivo SQL
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'add_cost_accumulated_column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 SQL a ser executado:');
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
        console.log();

        // Executar migration via SQL Editor
        console.log('⚠️  IMPORTANTE: Você precisa executar este SQL manualmente no Supabase SQL Editor:');
        console.log('\n1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
        console.log('2. Cole o SQL acima');
        console.log('3. Clique em "Run"\n');

        // Verificar se a coluna já existe
        const { data: columns, error } = await supabase
            .from('credit_deductions')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Erro ao verificar tabela:', error.message);
            return;
        }

        if (columns && columns.length > 0) {
            const hasColumn = 'cost_accumulated' in columns[0];
            if (hasColumn) {
                console.log('✅ Coluna cost_accumulated já existe!');
            } else {
                console.log('⚠️  Coluna cost_accumulated ainda não existe. Execute o SQL acima.');
            }
        } else {
            console.log('ℹ️  Tabela está vazia, não foi possível verificar estrutura.');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

applyMigration();
