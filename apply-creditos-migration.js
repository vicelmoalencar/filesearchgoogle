/**
 * Script para aplicar migration no banco Creditos_Ensinoplus
 * Cria estrutura centralizada para gerenciar créditos de múltiplas plataformas
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL_CREDITOS;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL_CREDITOS não encontrada no .env.local');
    console.error('   Adicione: DATABASE_URL_CREDITOS=postgresql://...');
    process.exit(1);
}

console.log('🔄 Conectando ao PostgreSQL (Creditos_Ensinoplus)...');
console.log('URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL (Creditos_Ensinoplus)\n');

        // Ler o arquivo SQL de migration
        const migrationFile = path.join(__dirname, 'postgres-migrations', '002_create_creditos_system.sql');
        const sql = fs.readFileSync(migrationFile, 'utf-8');

        console.log('📄 Executando migration: 002_create_creditos_system.sql');
        console.log('═'.repeat(70));

        await client.query(sql);

        console.log('✅ Migration aplicada com sucesso!');
        console.log('═'.repeat(70));

        // Verificar tabelas criadas
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('\n📊 Tabelas criadas:');
        tablesResult.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        // Verificar views criadas
        const viewsResult = await client.query(`
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('\n📊 Views criadas:');
        viewsResult.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        // Verificar plataformas inseridas
        const platformsResult = await client.query('SELECT platform_code, platform_name FROM platforms ORDER BY id');

        console.log('\n🏢 Plataformas registradas:');
        platformsResult.rows.forEach(row => {
            console.log(`  ✓ ${row.platform_code.padEnd(30)} - ${row.platform_name}`);
        });

        // Verificar modelos inseridos
        const modelsResult = await client.query(`
            SELECT model_code, model_name, cost_input_brl, cost_output_brl, cost_audio_brl
            FROM ai_models
            ORDER BY id
        `);

        console.log('\n🤖 Modelos de IA registrados:');
        modelsResult.rows.forEach(row => {
            console.log(`  ✓ ${row.model_code}`);
            console.log(`    ${row.model_name}`);
            console.log(`    Input: R$ ${row.cost_input_brl}/M | Output: R$ ${row.cost_output_brl}/M | Audio: R$ ${row.cost_audio_brl}/M`);
        });

        // Verificar configurações
        const configResult = await client.query('SELECT config_key, config_value, description FROM credit_config ORDER BY id');

        console.log('\n⚙️  Configurações:');
        configResult.rows.forEach(row => {
            console.log(`  ✓ ${row.config_key.padEnd(25)} = ${row.config_value.padEnd(10)} (${row.description})`);
        });

        console.log('\n🎉 Banco de dados Creditos_Ensinoplus configurado com sucesso!');
        console.log('\n📝 Próximos passos:');
        console.log('  1. Integrar este banco com as plataformas');
        console.log('  2. Migrar dados existentes (se houver)');
        console.log('  3. Atualizar a API PHP para usar este banco');
        console.log('  4. Testar acumulação e dedução de créditos');

    } catch (error) {
        console.error('\n❌ Erro ao aplicar migration:', error.message);
        console.error('\nDetalhes:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
