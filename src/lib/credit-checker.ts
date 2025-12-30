/**
 * Credit checker - integrado com sistema centralizado
 * Usa o banco Creditos_Ensinoplus
 */

import { checkAndDeductCredits as checkCentralized } from './creditos-centralizados';

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
 * Check and deduct credits using centralized system
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

        // Usar sistema centralizado
        const result = await checkCentralized(userEmail);

        return {
            success: result.success,
            message: result.message,
            cost_accumulated: result.accumulatedCost,
            credits_deducted: result.creditsDeducted,
            credits_remaining: result.creditsBalance,
            cost_remaining_to_deduct: result.costUntilNextDeduction,
            credits_to_deduct_next: 1,
            error: result.error
        };

    } catch (error) {
        console.error('[Credit Checker] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
