import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

let tableReady = false;

async function ensureTable() {
    if (tableReady) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cct_articles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            topic TEXT NOT NULL,
            tone TEXT DEFAULT 'informativo',
            length TEXT DEFAULT 'medio',
            structure TEXT DEFAULT 'completo',
            tags TEXT[] DEFAULT '{}',
            published BOOLEAN DEFAULT TRUE,
            sources_used TEXT[] DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    tableReady = true;
}

export interface ArticleInsert {
    userEmail: string;
    title: string;
    content: string;
    topic: string;
    tone: string;
    length: string;
    structure: string;
    tags: string[];
    published: boolean;
    sourcesUsed: string[];
}

export interface ArticleSummary {
    id: string;
    title: string;
    topic: string;
    tags: string[];
    user_email: string;
    created_at: string;
    tone: string;
    length: string;
}

export interface ArticleFull extends ArticleSummary {
    content: string;
    structure: string;
    sources_used: string[];
    published: boolean;
    updated_at: string;
}

export async function saveArticle(data: ArticleInsert): Promise<string | null> {
    try {
        await ensureTable();
        const result = await pool.query(
            `INSERT INTO cct_articles
                (user_email, title, content, topic, tone, length, structure, tags, published, sources_used)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING id`,
            [
                data.userEmail,
                data.title,
                data.content,
                data.topic,
                data.tone,
                data.length,
                data.structure,
                data.tags,
                data.published,
                data.sourcesUsed,
            ]
        );
        return result.rows[0]?.id ?? null;
    } catch (err) {
        console.error('[Articles] Erro ao salvar:', err instanceof Error ? err.message : err);
        return null;
    }
}

export async function listPublishedArticles(
    page: number,
    limit: number,
    tag?: string | null,
    search?: string | null
): Promise<{ articles: ArticleSummary[]; total: number }> {
    try {
        await ensureTable();
        const offset = (page - 1) * limit;

        const conditions: string[] = ['published = TRUE'];
        const params: unknown[] = [];

        if (tag) {
            params.push(tag);
            conditions.push(`$${params.length} = ANY(tags)`);
        }

        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            const i = params.length;
            conditions.push(`(title ILIKE $${i} OR topic ILIKE $${i} OR array_to_string(tags, ' ') ILIKE $${i})`);
        }

        const whereClause = 'WHERE ' + conditions.join(' AND ');

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM cct_articles ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        params.push(limit, offset);
        const dataResult = await pool.query(
            `SELECT id, title, topic, tags, user_email, created_at, tone, length
             FROM cct_articles ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        return { articles: dataResult.rows, total };
    } catch (err) {
        console.error('[Articles] Erro ao listar:', err instanceof Error ? err.message : err);
        return { articles: [], total: 0 };
    }
}

export async function getArticleById(id: string): Promise<ArticleFull | null> {
    try {
        await ensureTable();
        const result = await pool.query(
            `SELECT * FROM cct_articles WHERE id = $1 AND published = TRUE`,
            [id]
        );
        return result.rows[0] ?? null;
    } catch (err) {
        console.error('[Articles] Erro ao buscar:', err instanceof Error ? err.message : err);
        return null;
    }
}

export async function setPublished(id: string, published: boolean): Promise<boolean> {
    try {
        await ensureTable();
        await pool.query(
            `UPDATE cct_articles SET published = $1, updated_at = NOW() WHERE id = $2`,
            [published, id]
        );
        return true;
    } catch (err) {
        console.error('[Articles] Erro ao atualizar publicação:', err instanceof Error ? err.message : err);
        return false;
    }
}
