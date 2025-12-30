/**
 * PostgreSQL Database Client
 * Conexão com banco de dados para tracking de tokens e créditos
 */

import { Pool } from 'pg';

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.warn('[PostgreSQL] DATABASE_URL not configured. Token tracking may not work.');
}

// Criar pool de conexões
const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 20, // Máximo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Testar conexão ao iniciar
pool.on('connect', () => {
    console.log('[PostgreSQL] Connected to database');
});

pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client', err);
});

/**
 * Execute a query
 */
export async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('[PostgreSQL] Query executed', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('[PostgreSQL] Query error', { text, error });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
    return await pool.connect();
}

export default pool;
