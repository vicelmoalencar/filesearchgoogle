/**
 * Script para aplicar migrations no PostgreSQL
 * Cria as tabelas token_usage e credit_deductions
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada no .env.local');
    process.exit(1);
}

console.log('🔄 Conectando ao PostgreSQL...');
console.log('URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL\n');

        // Ler o arquivo SQL de migration
        const migrationFile = path.join(__dirname, 'postgres-migrations', '001_create_tables.sql');
        const sql = fs.readFileSync(migrationFile, 'utf-8');

        console.log('📄 Executando migration: 001_create_tables.sql');
        console.log('═'.repeat(60));

        await client.query(sql);

        console.log('✅ Migration aplicada com sucesso!');
        console.log('═'.repeat(60));

        // Verificar tabelas criadas
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('\n📊 Tabelas criadas:');
        result.rows.forEach(row => {
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

        console.log('\n🎉 Pronto! Banco de dados configurado com sucesso!');

    } catch (error) {
        console.error('\n❌ Erro ao aplicar migration:', error.message);
        console.error('\nDetalhes:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
