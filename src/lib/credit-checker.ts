/**
 * Credit checker logic - extracted to be reusable
 * Can be called directly without HTTP fetch
 * Uses PostgreSQL for tracking data
 */

import { query } from './postgres';

// Configuração: quanto em R$ equivale a 1 crédito
const COST_PER_CREDIT = 0.10; // R$ 0,10 = 1 crédito

export interface CreditCheckResult {
    success: boolean;
    message?: string;
    cost_accumulated?: number;
    tokens_consumed?: number;
    credits_deducted?: number;
    credits_remaining?: number;
    cost_remaining_to_deduct?: number;
    credits_to_deduct_next?: number;
    error?: string;
}

/**
 * Check and deduct credits based on accumulated cost
 */
export async function checkAndDeductCredits(
    userId: string,
    userEmail: string
): Promise<CreditCheckResult> {
    try {
        if (!userId || !userEmail) {
            return {
                success: false,
                error: "userId and userEmail are required"
            };
        }

        // 1. Buscar total de custo acumulado desde a última dedução de crédito
        const usageResult = await query(
            `SELECT estimated_cost, total_tokens
             FROM token_usage
             WHERE user_id = $1
             AND created_at >= NOW() - INTERVAL '30 days'
             ORDER BY created_at DESC`,
            [userId]
        );

        const usageData = usageResult.rows;

        // 2. Calcular total de custo acumulado em R$
        const totalCost = usageData.reduce((sum: number, row: any) =>
            sum + (parseFloat(row.estimated_cost) || 0), 0
        );
        const totalTokens = usageData.reduce((sum: number, row: any) =>
            sum + (row.total_tokens || 0), 0
        );

        // 3. Calcular quantos créditos devem ser deduzidos (1 crédito = R$ 0,10)
        const creditsToDeduct = Math.floor(totalCost / COST_PER_CREDIT);

        console.log(`[Credit Checker] User: ${userEmail}, Total Cost: R$ ${totalCost.toFixed(4)}, Total Tokens: ${totalTokens}, Credits to deduct: ${creditsToDeduct}`);

        // 4. Se tiver créditos para deduzir, chama a API PHP
        if (creditsToDeduct > 0) {
            const phpApiUrl = 'https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php';

            const response = await fetch(phpApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    credits: creditsToDeduct
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log(`[Credit Checker] ✅ Deducted ${creditsToDeduct} credits from ${userEmail}`);
                console.log(`[Credit Checker] Remaining credits: ${result.credits_remaining}`);

                // 5. Registrar a dedução de crédito no PostgreSQL para não deduzir novamente
                await query(
                    `INSERT INTO credit_deductions (
                        user_id, user_email, tokens_consumed, cost_accumulated,
                        credits_deducted, credits_remaining
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        userId,
                        userEmail,
                        totalTokens,
                        totalCost,
                        creditsToDeduct,
                        result.credits_remaining
                    ]
                );

                return {
                    success: true,
                    message: `${creditsToDeduct} crédito(s) deduzido(s)`,
                    cost_accumulated: totalCost,
                    tokens_consumed: totalTokens,
                    credits_deducted: creditsToDeduct,
                    credits_remaining: result.credits_remaining
                };
            } else {
                console.error('[Credit Checker] Failed to deduct credits:', result);
                return {
                    success: false,
                    error: result.message || 'Falha ao deduzir créditos'
                };
            }
        }

        // Nenhum crédito para deduzir ainda
        const costRemaining = COST_PER_CREDIT - (totalCost % COST_PER_CREDIT);

        return {
            success: true,
            message: 'Ainda não atingiu o custo mínimo para dedução',
            cost_accumulated: totalCost,
            cost_remaining_to_deduct: costRemaining,
            tokens_consumed: totalTokens,
            credits_to_deduct_next: 1
        };

    } catch (error) {
        console.error('[Credit Checker] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
