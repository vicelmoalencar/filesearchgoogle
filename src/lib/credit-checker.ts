/**
 * Credit checker logic - extracted to be reusable
 * Can be called directly without HTTP fetch
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
        const { data: usageData, error: usageError } = await supabase
            .from('token_usage')
            .select('estimated_cost, total_tokens')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 dias
            .order('created_at', { ascending: false });

        if (usageError) {
            console.error('[Credit Checker] Error fetching usage:', usageError);
            return {
                success: false,
                error: usageError.message
            };
        }

        // 2. Calcular total de custo acumulado em R$
        const totalCost = usageData?.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;
        const totalTokens = usageData?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) || 0;

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

                // 5. Registrar a dedução de crédito no Supabase para não deduzir novamente
                await supabase
                    .from('credit_deductions')
                    .insert({
                        user_id: userId,
                        user_email: userEmail,
                        tokens_consumed: totalTokens,
                        cost_accumulated: totalCost,
                        credits_deducted: creditsToDeduct,
                        credits_remaining: result.credits_remaining,
                        deducted_at: new Date().toISOString()
                    });

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
