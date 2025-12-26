-- Tabela para registrar deduções de crédito baseadas em tokens
CREATE TABLE IF NOT EXISTS public.credit_deductions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,

    -- Tokens consumidos que geraram a dedução
    tokens_consumed INTEGER NOT NULL,

    -- Créditos deduzidos
    credits_deducted INTEGER NOT NULL,
    credits_remaining INTEGER,

    -- Timestamp
    deducted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Índice para queries rápidas
    CONSTRAINT credit_deductions_user_id_idx
        CHECK (user_id IS NOT NULL)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_credit_deductions_user_id
    ON public.credit_deductions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_deductions_deducted_at
    ON public.credit_deductions(deducted_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.credit_deductions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios registros
CREATE POLICY "Users can view own deductions" ON public.credit_deductions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Sistema pode inserir registros
CREATE POLICY "Allow authenticated inserts" ON public.credit_deductions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- View para ver deduções com informações agregadas
CREATE OR REPLACE VIEW public.user_credit_deductions_summary AS
SELECT
    user_id,
    user_email,
    COUNT(*) as total_deductions,
    SUM(tokens_consumed) as total_tokens_consumed,
    SUM(credits_deducted) as total_credits_deducted,
    MAX(deducted_at) as last_deduction_at,
    DATE_TRUNC('day', deducted_at) as date
FROM public.credit_deductions
GROUP BY user_id, user_email, DATE_TRUNC('day', deducted_at);

-- Comentários
COMMENT ON TABLE public.credit_deductions IS 'Registro de deduções de crédito baseadas em consumo de tokens';
COMMENT ON COLUMN public.credit_deductions.tokens_consumed IS 'Total de tokens que geraram esta dedução';
COMMENT ON COLUMN public.credit_deductions.credits_deducted IS 'Quantidade de créditos deduzidos';
