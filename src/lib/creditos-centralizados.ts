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
    if (configCache && Date.now() - configCache.lastUpdated < CONFIG_CACHE_TTL) {
        return { costPerCredit: configCache.costPerCredit };
    }

    const result = await creditosPool.query(
        "SELECT config_value FROM credit_config WHERE config_key = 'cost_per_credit_brl'"
    );

    const costPerCredit = result.rows.length > 0
        ? parseFloat(result.rows[0].config_value)
        : 0.04;

    configCache = { costPerCredit, lastUpdated: Date.now() };

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
    console.log('\n📊 [TRACK USAGE] Iniciando...');
    console.log(`   Email: ${data.userEmail}`);
    console.log(`   Modelo: ${data.modelCode}`);
    console.log(`   Input tokens: ${data.inputTokens.toLocaleString('pt-BR')}`);
    console.log(`   Output tokens: ${data.outputTokens.toLocaleString('pt-BR')}`);
    console.log(`   Total tokens: ${(data.inputTokens + data.outputTokens).toLocaleString('pt-BR')}`);

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

        console.log(`💵 [TRACK] Custo total: R$ ${totalCostBrl.toFixed(6)}`);

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

        // 5. Atualizar/criar acumulação de custos (GLOBAL - independente de plataforma)
        await client.query(
            `INSERT INTO cost_accumulation (user_email, accumulated_cost_brl, accumulated_tokens, status)
             VALUES ($1, $2, $3, 'accumulating')
             ON CONFLICT (user_email, status)
             WHERE platform_id IS NULL
             DO UPDATE SET
                accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + $2,
                accumulated_tokens = cost_accumulation.accumulated_tokens + $3,
                updated_at = CURRENT_TIMESTAMP`,
            [data.userEmail, totalCostBrl, totalTokens]
        );

        // 6. Garantir que o usuário existe em users_credits
        await client.query(
            `INSERT INTO users_credits (user_email, credits_balance, is_active)
             VALUES ($1, 0, true)
             ON CONFLICT (user_email) DO NOTHING`,
            [data.userEmail]
        );

        await client.query('COMMIT');

        console.log(`✅ [TRACK USAGE] Concluído: ${totalTokens} tokens, R$ ${totalCostBrl.toFixed(6)}`);

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
    console.log('\n🔍 [INICIO] checkAndDeductCredits');
    console.log(`   Email: ${userEmail}`);

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

        // 2. Buscar saldo REAL de créditos da API PHP
        let creditsBalance = 0;

        try {
            const phpResponse = await fetch('https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });

            const phpData = await phpResponse.json();
            const credits = phpData.data?.credits ?? phpData.credits;

            if (phpData.success && credits !== undefined) {
                creditsBalance = credits;
                console.log(`✅ [SALDO REAL] MySQL: ${creditsBalance} créditos`);
            } else {
                const creditsResult = await client.query(
                    'SELECT credits_balance FROM users_credits WHERE user_email = $1',
                    [userEmail]
                );
                if (creditsResult.rows.length > 0) {
                    creditsBalance = creditsResult.rows[0].credits_balance;
                }
            }
        } catch (phpError) {
            console.error('❌ [API PHP] Erro ao buscar saldo:', phpError);
            const creditsResult = await client.query(
                'SELECT credits_balance FROM users_credits WHERE user_email = $1',
                [userEmail]
            );
            if (creditsResult.rows.length > 0) {
                creditsBalance = creditsResult.rows[0].credits_balance;
            }
        }

        // Garantir que o usuário existe em users_credits
        await client.query(
            'INSERT INTO users_credits (user_email, credits_balance) VALUES ($1, $2) ON CONFLICT (user_email) DO NOTHING',
            [userEmail, creditsBalance]
        );

        // 3. Buscar custo acumulado (GLOBAL)
        const accumulationResult = await client.query(
            `SELECT id, accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND status = 'accumulating' AND platform_id IS NULL`,
            [userEmail]
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

        console.log(`📊 [ANÁLISE] Acumulado: R$ ${accumulatedCost.toFixed(6)}, a deduzir: ${creditsToDeduct}`);

        if (creditsToDeduct > 0 && accumulationId) {
            if (creditsBalance < creditsToDeduct) {
                await client.query('COMMIT');

                return {
                    success: false,
                    message: 'Créditos insuficientes',
                    userEmail,
                    creditsBalance,
                    accumulatedCost,
                    costPerCredit: COST_PER_CREDIT_BRL,
                    costUntilNextDeduction: 0,
                    error: `Você precisa de ${creditsToDeduct} crédito(s), mas tem apenas ${creditsBalance}`
                };
            }

            // 5. Deduzir do PostgreSQL (tracking)
            await client.query(
                `UPDATE users_credits
                 SET credits_balance = credits_balance - $1,
                     total_credits_used = total_credits_used + $1,
                     last_activity_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_email = $2`,
                [creditsToDeduct, userEmail]
            );

            creditsBalance -= creditsToDeduct;

            // 6. Registrar dedução
            await client.query(
                `INSERT INTO credit_deductions (
                    user_email, platform_id, cost_accumulated_brl, tokens_accumulated,
                    credits_deducted, credits_remaining
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [userEmail, platformId, accumulatedCost, accumulatedTokens, creditsToDeduct, creditsBalance]
            );

            // 7. Deletar acumulação processada
            await client.query('DELETE FROM cost_accumulation WHERE id = $1', [accumulationId]);

            accumulatedCost = 0;
            accumulatedTokens = 0;

            await client.query('COMMIT');

            // 8. Sincronizar com API PHP
            try {
                const phpResponse = await fetch('https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, credits: creditsToDeduct })
                });

                const phpData = await phpResponse.json();
                if (phpData.success && phpData.credits_remaining !== undefined) {
                    creditsBalance = phpData.credits_remaining;
                }
            } catch (phpError) {
                console.error('❌ [API PHP] Erro ao sincronizar dedução:', phpError);
            }

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
        return result.rows.length > 0 ? result.rows[0].credits_balance : 0;
    } catch (error) {
        console.error('[Creditos] Error getting user credits:', error);
        return 0;
    }
}
