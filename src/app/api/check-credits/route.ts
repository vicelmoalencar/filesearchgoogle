import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configuração: quanto em R$ equivale a 1 crédito
const COST_PER_CREDIT = 0.10; // R$ 0,10 = 1 crédito

export async function POST(request: NextRequest) {
    try {
        const { userId, userEmail } = await request.json();

        if (!userId || !userEmail) {
            return NextResponse.json(
                { error: "userId and userEmail are required" },
                { status: 400 }
            );
        }

        // 1. Buscar total de custo acumulado desde a última dedução de crédito
        const { data: usageData, error: usageError } = await supabase
            .from('token_usage')
            .select('estimated_cost, total_tokens')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 dias
            .order('created_at', { ascending: false });

        if (usageError) {
            console.error('[Check Credits] Error fetching usage:', usageError);
            return NextResponse.json({ error: usageError.message }, { status: 500 });
        }

        // 2. Calcular total de custo acumulado em R$
        const totalCost = usageData?.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;
        const totalTokens = usageData?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) || 0;

        // 3. Calcular quantos créditos devem ser deduzidos (1 crédito = R$ 0,10)
        const creditsToDeduct = Math.floor(totalCost / COST_PER_CREDIT);

        console.log(`[Check Credits] User: ${userEmail}, Total Cost: R$ ${totalCost.toFixed(4)}, Total Tokens: ${totalTokens}, Credits to deduct: ${creditsToDeduct}`);

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
                console.log(`[Check Credits] ✅ Deducted ${creditsToDeduct} credits from ${userEmail}`);
                console.log(`[Check Credits] Remaining credits: ${result.credits_remaining}`);

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

                return NextResponse.json({
                    success: true,
                    message: `${creditsToDeduct} crédito(s) deduzido(s)`,
                    cost_accumulated: totalCost,
                    tokens_consumed: totalTokens,
                    credits_deducted: creditsToDeduct,
                    credits_remaining: result.credits_remaining
                });
            } else {
                console.error('[Check Credits] Failed to deduct credits:', result);
                return NextResponse.json({
                    success: false,
                    error: result.message || 'Falha ao deduzir créditos'
                }, { status: 500 });
            }
        }

        // Nenhum crédito para deduzir ainda
        const costRemaining = COST_PER_CREDIT - (totalCost % COST_PER_CREDIT);

        return NextResponse.json({
            success: true,
            message: 'Ainda não atingiu o custo mínimo para dedução',
            cost_accumulated: totalCost,
            cost_remaining_to_deduct: costRemaining,
            tokens_consumed: totalTokens,
            credits_to_deduct_next: 1
        });

    } catch (error) {
        console.error('[Check Credits] Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
