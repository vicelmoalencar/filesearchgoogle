/**
 * Verifica o saldo de créditos no banco MySQL (onde está o saldo real)
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkMySQLCredits() {
    const email = 'antoniovicelmo.alencar@gmail.com';

    console.log('🔍 VERIFICANDO SALDO REAL DE CRÉDITOS (MySQL)\n');
    console.log('═'.repeat(60));
    console.log(`Email: ${email}\n`);

    try {
        // Conectar ao MySQL
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'chatCCT'
        });

        console.log('✅ Conectado ao MySQL');

        // Buscar usuário
        const [users] = await connection.execute(
            'SELECT id, email, credits, is_admin FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('❌ Usuário não encontrado no MySQL');
            await connection.end();
            return;
        }

        const user = users[0];
        console.log('\n📊 Saldo de Créditos (MySQL):');
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Créditos: ${user.credits}`);
        console.log(`   - Admin: ${user.is_admin ? 'Sim' : 'Não'}`);

        // Verificar últimas movimentações
        const [logs] = await connection.execute(
            `SELECT * FROM credit_logs
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 5`,
            [user.id]
        );

        if (logs.length > 0) {
            console.log('\n📝 Últimas movimentações:');
            logs.forEach((log, i) => {
                console.log(`   ${i + 1}. ${log.action}: ${log.credits_changed > 0 ? '+' : ''}${log.credits_changed} créditos`);
                console.log(`      Saldo após: ${log.credits_remaining}`);
                console.log(`      Data: ${new Date(log.created_at).toLocaleString('pt-BR')}`);
            });
        } else {
            console.log('\n⚠️  Nenhuma movimentação encontrada');
        }

        console.log('\n═'.repeat(60));

        await connection.end();

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error(error);
    }
}

checkMySQLCredits();
