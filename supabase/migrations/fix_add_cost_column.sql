-- Script corrigido para adicionar coluna cost_accumulated
-- Primeiro remove a view, depois adiciona a coluna, e recria a view

-- 1. Remover a view temporariamente
DROP VIEW IF EXISTS public.user_credit_deductions_summary;

-- 2. Adicionar coluna cost_accumulated
ALTER TABLE public.credit_deductions
ADD COLUMN IF NOT EXISTS cost_accumulated NUMERIC(10, 6) DEFAULT 0;

-- 3. Adicionar comentário
COMMENT ON COLUMN public.credit_deductions.cost_accumulated IS 'Custo total acumulado em R$ que gerou esta dedução (1 crédito = R$ 0,10)';

-- 4. Recriar a view com a nova coluna
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

-- 5. Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'credit_deductions'
  AND column_name = 'cost_accumulated';
