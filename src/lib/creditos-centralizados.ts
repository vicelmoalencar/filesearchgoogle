/**
 * Sistema Centralizado de Créditos - Creditos_Ensinoplus
 * Gerencia créditos de múltiplas plataformas
 *
 * Regra: R$ 0,04 acumulado = 1 crédito deduzido
 */

import { Pool } from 'pg';

// Pool de conexões para o banco Creditos_Ensinoplus
// Converter formato Python (postgresql+psycopg2://) para Node.js (postgresql://)
const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');

const creditosPool = new Pool({
    connectionString: connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

creditosPool.on('connect', () => {
    console.log('[Creditos] Connected to Creditos_Ensinoplus database');
});

creditosPool.on('error', (err) => {
    console.error('[Creditos] Unexpected error on idle client', err);
});

// Código da plataforma Chat CCT
const PLATFORM_CODE = 'chat_cct';

// Cache para configurações (evitar consultas repetidas ao banco)
let configCache: { costPerCredit: number; lastUpdated: number } | null = null;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configurações do banco com cache
 */
async function getConfig(): Promise<{ costPerCredit: number }> {
    // Verificar cache
    if (configCache && Date.now() - configCache.lastUpdated < CONFIG_CACHE_TTL) {
        return { costPerCredit: configCache.costPerCredit };
    }

    // Buscar do banco
    const result = await creditosPool.query(
        "SELECT config_value FROM credit_config WHERE config_key = 'cost_per_credit_brl'"
    );

    const costPerCredit = result.rows.length > 0
        ? parseFloat(result.rows[0].config_value)
        : 0.04; // Fallback para valor padrão

    // Atualizar cache
    configCache = {
        costPerCredit,
        lastUpdated: Date.now()
    };

    console.log(`[Creditos] Config loaded: R$ ${costPerCredit} = 1 crédito`);

    return { costPerCredit };
}

/**
 * Interface para tracking de uso
 */
export interface UsageData {
    userEmail: string;
    modelCode: string;
    inputTokens: number;
    outputTokens: number;
    audioTokens?: number;
    requestDurationMs?: number;
    status?: 'success' | 'error' | 'rate_limit';
    errorMessage?: string;
    metadata?: Record<string, any>;
}

/**
 * Interface para resultado de checagem de créditos
 */
export interface CreditCheckResult {
    success: boolean;
    message?: string;
    userEmail: string;
    creditsBalance: number;
    accumulatedCost: number;
    creditsDeducted?: number;
    costPerCredit: number;
    costUntilNextDeduction: number;
    error?: string;
}

/**
 * Registrar uso de IA no sistema centralizado
 */
export async function trackUsage(data: UsageData): Promise<void> {
    const client = await creditosPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscar platform_id
        const platformResult = await client.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            [PLATFORM_CODE]
        );

        if (platformResult.rows.length === 0) {
            throw new Error(`Platform ${PLATFORM_CODE} not found`);
        }

        const platformId = platformResult.rows[0].id;

        // 2. Buscar model_id e calcular custos
        const modelResult = await client.query(
            `SELECT id, cost_input_brl, cost_output_brl, cost_audio_brl
             FROM ai_models
             WHERE model_code = $1`,
            [data.modelCode]
        );

        if (modelResult.rows.length === 0) {
            throw new Error(`Model ${data.modelCode} not found`);
        }

        const model = modelResult.rows[0];

        // 3. Calcular custos
        const costInputBrl = (data.inputTokens / 1_000_000) * parseFloat(model.cost_input_brl);
        const costOutputBrl = (data.outputTokens / 1_000_000) * parseFloat(model.cost_output_brl);
        const costAudioBrl = ((data.audioTokens || 0) / 1_000_000) * parseFloat(model.cost_audio_brl || 0);
        const totalCostBrl = costInputBrl + costOutputBrl + costAudioBrl;

        const totalTokens = data.inputTokens + data.outputTokens + (data.audioTokens || 0);

        // 4. Inserir tracking de uso
        await client.query(
            `INSERT INTO usage_tracking (
                platform_id, user_email, model_id,
                input_tokens, output_tokens, audio_tokens, total_tokens,
                cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                request_duration_ms, status, error_message, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                platformId,
                data.userEmail,
                model.id,
                data.inputTokens,
                data.outputTokens,
                data.audioTokens || 0,
                totalTokens,
                costInputBrl,
                costOutputBrl,
                costAudioBrl,
                totalCostBrl,
                data.requestDurationMs,
                data.status || 'success',
                data.errorMessage,
                data.metadata ? JSON.stringify(data.metadata) : null
            ]
        );

        // 5. Atualizar/criar acumulação de custos
        await client.query(
            `INSERT INTO cost_accumulation (user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status)
             VALUES ($1, $2, $3, $4, 'accumulating')
             ON CONFLICT (user_email, platform_id, status)
             DO UPDATE SET
                accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + $3,
                accumulated_tokens = cost_accumulation.accumulated_tokens + $4,
                updated_at = CURRENT_TIMESTAMP`,
            [data.userEmail, platformId, totalCostBrl, totalTokens]
        );

        // 6. Garantir que o usuário existe em users_credits
        await client.query(
            `INSERT INTO users_credits (user_email, credits_balance, is_active)
             VALUES ($1, 0, true)
             ON CONFLICT (user_email) DO NOTHING`,
            [data.userEmail]
        );

        await client.query('COMMIT');

        console.log('[Creditos] ✅ Usage tracked:', {
            user: data.userEmail,
            platform: PLATFORM_CODE,
            model: data.modelCode,
            tokens: totalTokens,
            cost: `R$ ${totalCostBrl.toFixed(6)}`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Creditos] Error tracking usage:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Verificar e deduzir créditos se necessário
 */
export async function checkAndDeductCredits(userEmail: string): Promise<CreditCheckResult> {
    const client = await creditosPool.connect();

    try {
        await client.query('BEGIN');

        // 0. Buscar configuração do custo por crédito
        const config = await getConfig();
        const COST_PER_CREDIT_BRL = config.costPerCredit;

        // 1. Buscar platform_id
        const platformResult = await client.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            [PLATFORM_CODE]
        );

        if (platformResult.rows.length === 0) {
            throw new Error(`Platform ${PLATFORM_CODE} not found`);
        }

        const platformId = platformResult.rows[0].id;

        // 2. Buscar saldo de créditos do usuário
        const creditsResult = await client.query(
            'SELECT credits_balance FROM users_credits WHERE user_email = $1',
            [userEmail]
        );

        let creditsBalance = 0;

        if (creditsResult.rows.length > 0) {
            creditsBalance = creditsResult.rows[0].credits_balance;
        } else {
            // Criar usuário se não existir
            await client.query(
                'INSERT INTO users_credits (user_email, credits_balance) VALUES ($1, 0)',
                [userEmail]
            );
        }

        // 3. Buscar custo acumulado
        const accumulationResult = await client.query(
            `SELECT id, accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND platform_id = $2 AND status = 'accumulating'`,
            [userEmail, platformId]
        );

        let accumulatedCost = 0;
        let accumulatedTokens = 0;
        let accumulationId = null;

        if (accumulationResult.rows.length > 0) {
            const acc = accumulationResult.rows[0];
            accumulatedCost = parseFloat(acc.accumulated_cost_brl);
            accumulatedTokens = acc.accumulated_tokens;
            accumulationId = acc.id;
        }

        // 4. Verificar se deve deduzir créditos
        const creditsToDeduct = Math.floor(accumulatedCost / COST_PER_CREDIT_BRL);

        if (creditsToDeduct > 0 && accumulationId) {
            console.log(`[Creditos] Deducting ${creditsToDeduct} credits from ${userEmail}`);
            console.log(`[Creditos] Accumulated cost: R$ ${accumulatedCost.toFixed(4)}`);

            // 5. Deduzir créditos
            await client.query(
                `UPDATE users_credits
                 SET credits_balance = credits_balance - $1,
                     total_credits_used = total_credits_used + $1,
                     last_activity_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_email = $2`,
                [creditsToDeduct, userEmail]
            );

            // 6. Atualizar saldo local
            creditsBalance -= creditsToDeduct;

            // 7. Registrar dedução
            await client.query(
                `INSERT INTO credit_deductions (
                    user_email, platform_id, cost_accumulated_brl, tokens_accumulated,
                    credits_deducted, credits_remaining
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [userEmail, platformId, accumulatedCost, accumulatedTokens, creditsToDeduct, creditsBalance]
            );

            // 8. Marcar acumulação como deduzida
            await client.query(
                `UPDATE cost_accumulation
                 SET status = 'deducted',
                     deducted_at = CURRENT_TIMESTAMP,
                     credits_deducted = $1
                 WHERE id = $2`,
                [creditsToDeduct, accumulationId]
            );

            // 9. Resetar acumulação
            accumulatedCost = 0;
            accumulatedTokens = 0;

            await client.query('COMMIT');

            console.log('[Creditos] ✅ Credits deducted:', {
                user: userEmail,
                creditsDeducted: creditsToDeduct,
                creditsRemaining: creditsBalance
            });

            return {
                success: true,
                message: `${creditsToDeduct} crédito(s) deduzido(s)`,
                userEmail,
                creditsBalance,
                accumulatedCost,
                creditsDeducted: creditsToDeduct,
                costPerCredit: COST_PER_CREDIT_BRL,
                costUntilNextDeduction: COST_PER_CREDIT_BRL
            };
        }

        await client.query('COMMIT');

        // Calcular quanto falta para próxima dedução
        const costUntilNextDeduction = COST_PER_CREDIT_BRL - (accumulatedCost % COST_PER_CREDIT_BRL);

        return {
            success: true,
            message: 'Ainda não atingiu o custo mínimo para dedução',
            userEmail,
            creditsBalance,
            accumulatedCost,
            costPerCredit: COST_PER_CREDIT_BRL,
            costUntilNextDeduction
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Creditos] Error checking credits:', error);

        // Buscar config para retornar no erro
        const config = await getConfig().catch(() => ({ costPerCredit: 0.04 }));

        return {
            success: false,
            userEmail,
            creditsBalance: 0,
            accumulatedCost: 0,
            costPerCredit: config.costPerCredit,
            costUntilNextDeduction: config.costPerCredit,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    } finally {
        client.release();
    }
}

/**
 * Obter saldo de créditos de um usuário
 */
export async function getUserCredits(userEmail: string): Promise<number> {
    try {
        const result = await creditosPool.query(
            'SELECT credits_balance FROM users_credits WHERE user_email = $1',
            [userEmail]
        );

        if (result.rows.length === 0) {
            return 0;
        }

        return result.rows[0].credits_balance;
    } catch (error) {
        console.error('[Creditos] Error getting user credits:', error);
        return 0;
    }
}

/**
 * Fechar pool de conexões
 */
export async function closeCreditosPool(): Promise<void> {
    await creditosPool.end();
}
