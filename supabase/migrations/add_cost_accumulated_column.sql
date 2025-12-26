-- Adicionar coluna cost_accumulated à tabela credit_deductions
-- Esta coluna armazena o custo total acumulado em R$ que gerou a dedução

ALTER TABLE public.credit_deductions
ADD COLUMN IF NOT EXISTS cost_accumulated NUMERIC(10, 6) DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.credit_deductions.cost_accumulated IS 'Custo total acumulado em R$ que gerou esta dedução (1 crédito = R$ 0,10)';

-- Atualizar a view para incluir o novo campo
CREATE OR REPLACE VIEW public.user_credit_deductions_summary AS
SELECT
    user_id,
    user_email,
    COUNT(*) as total_deductions,
    SUM(tokens_consumed) as total_tokens_consumed,
    SUM(cost_accumulated) as total_cost_accumulated,
    SUM(credits_deducted) as total_credits_deducted,
    MAX(deducted_at) as last_deduction_at,
    DATE_TRUNC('day', deducted_at) as date
FROM public.credit_deductions
GROUP BY user_id, user_email, DATE_TRUNC('day', deducted_at);
