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
        console.log('🔄 [TRACK] Buscando platform...');
        const platformResult = await client.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            [PLATFORM_CODE]
        );

        if (platformResult.rows.length === 0) {
            throw new Error(`Platform ${PLATFORM_CODE} not found`);
        }

        const platformId = platformResult.rows[0].id;
        console.log(`✅ [TRACK] Platform ID: ${platformId}`);

        // 2. Buscar model_id e calcular custos
        console.log('🔄 [TRACK] Buscando modelo...');
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
        console.log(`✅ [TRACK] Modelo encontrado: ID ${model.id}`);

        // 3. Calcular custos
        const costInputBrl = (data.inputTokens / 1_000_000) * parseFloat(model.cost_input_brl);
        const costOutputBrl = (data.outputTokens / 1_000_000) * parseFloat(model.cost_output_brl);
        const costAudioBrl = ((data.audioTokens || 0) / 1_000_000) * parseFloat(model.cost_audio_brl || 0);
        const totalCostBrl = costInputBrl + costOutputBrl + costAudioBrl;

        const totalTokens = data.inputTokens + data.outputTokens + (data.audioTokens || 0);

        console.log(`💵 [TRACK] Custos calculados:`);
        console.log(`   Input: R$ ${costInputBrl.toFixed(6)}`);
        console.log(`   Output: R$ ${costOutputBrl.toFixed(6)}`);
        console.log(`   Total: R$ ${totalCostBrl.toFixed(6)}`);

        // 4. Inserir tracking de uso
        console.log('🔄 [TRACK] Inserindo em usage_tracking...');
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
        console.log('✅ [TRACK] Uso registrado');

        // 5. Atualizar/criar acumulação de custos (GLOBAL por usuário, independente de plataforma)
        console.log('🔄 [TRACK] Atualizando acumulação global...');

        // Usar UPSERT manual pois ON CONFLICT com partial index requer sintaxe especial
        const existingAccumulation = await client.query(
            `SELECT id, accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND platform_id IS NULL AND status = 'accumulating'`,
            [data.userEmail]
        );

        if (existingAccumulation.rows.length > 0) {
            // Atualizar existente
            await client.query(
                `UPDATE cost_accumulation
                 SET accumulated_cost_brl = accumulated_cost_brl + $1,
                     accumulated_tokens = accumulated_tokens + $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_email = $3 AND platform_id IS NULL AND status = 'accumulating'`,
                [totalCostBrl, totalTokens, data.userEmail]
            );
        } else {
            // Inserir novo
            await client.query(
                `INSERT INTO cost_accumulation (user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status)
                 VALUES ($1, NULL, $2, $3, 'accumulating')`,
                [data.userEmail, totalCostBrl, totalTokens]
            );
        }

        console.log(`✅ [TRACK] Acumulação global atualizada (+R$ ${totalCostBrl.toFixed(6)})`);

        // 6. Garantir que o usuário existe em users_credits
        await client.query(
            `INSERT INTO users_credits (user_email, credits_balance, is_active)
             VALUES ($1, 0, true)
             ON CONFLICT (user_email) DO NOTHING`,
            [data.userEmail]
        );

        await client.query('COMMIT');

        console.log('\n✅ [TRACK USAGE] Concluído com sucesso');
        console.log(`   Usuário: ${data.userEmail}`);
        console.log(`   Plataforma: ${PLATFORM_CODE}`);
        console.log(`   Modelo: ${data.modelCode}`);
        console.log(`   Tokens: ${totalTokens.toLocaleString('pt-BR')}`);
        console.log(`   Custo: R$ ${totalCostBrl.toFixed(6)}`);

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
        console.log(`✅ [CONFIG] Custo por crédito: R$ ${COST_PER_CREDIT_BRL}`);

        // 1. Buscar platform_id
        const platformResult = await client.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            [PLATFORM_CODE]
        );

        if (platformResult.rows.length === 0) {
            throw new Error(`Platform ${PLATFORM_CODE} not found`);
        }

        const platformId = platformResult.rows[0].id;
        console.log(`✅ [PLATFORM] ID: ${platformId} (${PLATFORM_CODE})`);

        // 2. Buscar saldo REAL de créditos da API PHP
        let creditsBalance = 0;

        try {
            console.log('🔄 [API PHP] Buscando saldo real...');
            const phpUrl = 'https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php';
            console.log(`   URL: ${phpUrl}`);
            console.log(`   Email: ${userEmail}`);

            const phpResponse = await fetch(phpUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });

            console.log(`   Status: ${phpResponse.status}`);
            const phpData = await phpResponse.json();
            console.log(`   Resposta:`, phpData);

            // Aceitar ambos os formatos: {data: {credits}} ou {credits} diretamente
            const credits = phpData.data?.credits ?? phpData.credits;

            if (phpData.success && credits !== undefined) {
                creditsBalance = credits;
                console.log(`✅ [SALDO REAL] MySQL: ${creditsBalance} créditos`);
            } else {
                console.warn(`⚠️ [API PHP] Resposta inválida, usando fallback`);
                console.warn(`   Data:`, phpData);
                console.warn(`   Credits extraído:`, credits);
                // Fallback: buscar do PostgreSQL (pode estar desatualizado)
                const creditsResult = await client.query(
                    'SELECT credits_balance FROM users_credits WHERE user_email = $1',
                    [userEmail]
                );

                if (creditsResult.rows.length > 0) {
                    creditsBalance = creditsResult.rows[0].credits_balance;
                    console.log(`⚠️ [FALLBACK] PostgreSQL: ${creditsBalance} créditos`);
                }
            }
        } catch (phpError) {
            console.error('❌ [API PHP] Erro ao buscar saldo:', phpError);
            console.error(`   Mensagem:`, phpError instanceof Error ? phpError.message : phpError);
            // Fallback: buscar do PostgreSQL (pode estar desatualizado)
            const creditsResult = await client.query(
                'SELECT credits_balance FROM users_credits WHERE user_email = $1',
                [userEmail]
            );

            if (creditsResult.rows.length > 0) {
                creditsBalance = creditsResult.rows[0].credits_balance;
                console.log(`⚠️ [FALLBACK] PostgreSQL: ${creditsBalance} créditos`);
            }
        }

        // Garantir que o usuário existe em users_credits (apenas para tracking)
        await client.query(
            'INSERT INTO users_credits (user_email, credits_balance) VALUES ($1, $2) ON CONFLICT (user_email) DO NOTHING',
            [userEmail, creditsBalance]
        );

        // 3. Buscar custo acumulado (GLOBAL por usuário, independente de plataforma)
        console.log('🔄 [ACUMULAÇÃO] Buscando custos acumulados globalmente...');
        const accumulationResult = await client.query(
            `SELECT id, accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND platform_id IS NULL AND status = 'accumulating'`,
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
            console.log(`✅ [ACUMULAÇÃO] Encontrada:`);
            console.log(`   Custo: R$ ${accumulatedCost.toFixed(6)}`);
            console.log(`   Tokens: ${accumulatedTokens.toLocaleString('pt-BR')}`);
            console.log(`   ID: ${accumulationId}`);
        } else {
            console.log(`ℹ️ [ACUMULAÇÃO] Nenhuma acumulação ativa encontrada`);
        }

        // 4. Verificar se deve deduzir créditos
        const creditsToDeduct = Math.floor(accumulatedCost / COST_PER_CREDIT_BRL);
        const percentage = (accumulatedCost / COST_PER_CREDIT_BRL) * 100;

        console.log(`\n📊 [ANÁLISE] Verificação de dedução:`);
        console.log(`   Custo acumulado: R$ ${accumulatedCost.toFixed(6)}`);
        console.log(`   Custo por crédito: R$ ${COST_PER_CREDIT_BRL}`);
        console.log(`   Progresso: ${percentage.toFixed(1)}%`);
        console.log(`   Créditos a deduzir: ${creditsToDeduct}`);
        console.log(`   Tem accumulation ID: ${accumulationId ? 'SIM' : 'NÃO'}`);
        console.log(`   Condição (creditsToDeduct > 0): ${creditsToDeduct > 0}`);
        console.log(`   Condição (accumulationId): ${!!accumulationId}`);
        console.log(`   Vai deduzir? ${creditsToDeduct > 0 && accumulationId ? 'SIM ✅' : 'NÃO ❌'}`);

        if (creditsToDeduct > 0 && accumulationId) {
            console.log(`\n💰 [DEDUÇÃO] Iniciando processo de dedução...`);

            // Verificar se o usuário tem saldo suficiente
            if (creditsBalance < creditsToDeduct) {
                await client.query('COMMIT');

                console.log(`❌ [SALDO INSUFICIENTE] Não é possível deduzir`);
                console.log(`   Necessário: ${creditsToDeduct} créditos`);
                console.log(`   Disponível: ${creditsBalance} créditos`);
                console.log(`   Faltam: ${creditsToDeduct - creditsBalance} créditos`);

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

            console.log(`✅ [SALDO OK] Saldo suficiente: ${creditsBalance} >= ${creditsToDeduct}`);
            console.log(`   Iniciando dedução de ${creditsToDeduct} crédito(s)...`);

            // 5. Deduzir créditos do PostgreSQL (apenas tracking)
            console.log(`🔄 [POSTGRES] Atualizando users_credits...`);
            await client.query(
                `UPDATE users_credits
                 SET credits_balance = credits_balance - $1,
                     total_credits_used = total_credits_used + $1,
                     last_activity_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_email = $2`,
                [creditsToDeduct, userEmail]
            );
            console.log(`✅ [POSTGRES] users_credits atualizado`);

            // 6. Atualizar saldo local
            creditsBalance -= creditsToDeduct;

            // 7. Calcular excesso (sobra que deve continuar acumulada)
            const costUsedForDeduction = creditsToDeduct * COST_PER_CREDIT_BRL;
            const remainingCost = accumulatedCost - costUsedForDeduction;

            console.log(`💰 [CÁLCULO] Processando excesso:`);
            console.log(`   Custo total acumulado: R$ ${accumulatedCost.toFixed(6)}`);
            console.log(`   Custo usado (${creditsToDeduct} crédito(s)): R$ ${costUsedForDeduction.toFixed(6)}`);
            console.log(`   Excesso que continua acumulado: R$ ${remainingCost.toFixed(6)}`);

            // 8. Registrar dedução
            console.log(`🔄 [POSTGRES] Inserindo registro em credit_deductions...`);
            await client.query(
                `INSERT INTO credit_deductions (
                    user_email, platform_id, cost_accumulated_brl, tokens_accumulated,
                    credits_deducted, credits_remaining
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [userEmail, platformId, costUsedForDeduction, accumulatedTokens, creditsToDeduct, creditsBalance]
            );
            console.log(`✅ [POSTGRES] Dedução registrada`);

            // 9. Atualizar acumulação com o EXCESSO (não deletar!)
            if (remainingCost > 0.000001) { // Usar threshold para evitar problemas de float
                console.log(`🔄 [POSTGRES] Atualizando acumulação com excesso...`);
                await client.query(
                    `UPDATE cost_accumulation
                     SET accumulated_cost_brl = $1,
                         accumulated_tokens = 0,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2`,
                    [remainingCost, accumulationId]
                );
                console.log(`✅ [POSTGRES] Acumulação atualizada com excesso de R$ ${remainingCost.toFixed(6)}`);
                accumulatedCost = remainingCost;
                accumulatedTokens = 0;
            } else {
                console.log(`🔄 [POSTGRES] Deletando acumulação (sem excesso)...`);
                await client.query(
                    `DELETE FROM cost_accumulation WHERE id = $1`,
                    [accumulationId]
                );
                console.log(`✅ [POSTGRES] Acumulação deletada`);
                accumulatedCost = 0;
                accumulatedTokens = 0;
            }

            await client.query('COMMIT');
            console.log(`✅ [POSTGRES] COMMIT realizado com sucesso`);

            console.log(`\n✅ [DEDUÇÃO POSTGRES] Concluída:`);
            console.log(`   Créditos deduzidos: ${creditsToDeduct}`);
            console.log(`   Saldo restante (local): ${creditsBalance}`);

            // 10. Sincronizar com API PHP (deduzir créditos reais)
            try {
                console.log(`\n🔄 [API PHP] Sincronizando ${creditsToDeduct} crédito(s)...`);

                const phpUrl = 'https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php';
                const phpPayload = {
                    email: userEmail,
                    credits: creditsToDeduct
                };

                console.log(`   URL: ${phpUrl}`);
                console.log(`   Payload:`, phpPayload);

                const phpResponse = await fetch(phpUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(phpPayload)
                });

                console.log(`   Status: ${phpResponse.status}`);
                const phpData = await phpResponse.json();
                console.log(`   Resposta:`, phpData);

                if (phpData.success) {
                    console.log(`✅ [API PHP] Sincronizado com sucesso!`);
                    console.log(`   Deduzido: ${phpData.credits_deducted} crédito(s)`);
                    console.log(`   Saldo restante (MySQL): ${phpData.credits_remaining}`);

                    // Atualizar creditsBalance com o saldo real da API PHP
                    if (phpData.credits_remaining !== undefined) {
                        creditsBalance = phpData.credits_remaining;
                    }
                } else {
                    console.error(`❌ [API PHP] Erro na resposta:`, phpData.message);
                    console.error(`   Data completo:`, phpData);
                    // Continua mesmo se falhar a sincronização
                }
            } catch (phpError) {
                console.error('❌ [API PHP] Erro ao chamar:', phpError);
                console.error(`   Mensagem:`, phpError instanceof Error ? phpError.message : phpError);
                // Continua mesmo se falhar a sincronização
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

        // Calcular quanto falta para próxima dedução
        const costUntilNextDeduction = COST_PER_CREDIT_BRL - (accumulatedCost % COST_PER_CREDIT_BRL);

        console.log(`\nℹ️ [SEM DEDUÇÃO] Ainda não atingiu o limite`);
        console.log(`   Custo acumulado: R$ ${accumulatedCost.toFixed(6)}`);
        console.log(`   Falta: R$ ${costUntilNextDeduction.toFixed(6)}`);
        console.log(`   Progresso: ${((accumulatedCost / COST_PER_CREDIT_BRL) * 100).toFixed(1)}%`);

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
