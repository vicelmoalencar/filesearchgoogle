-- Tabela para rastrear uso de tokens por usuário
CREATE TABLE IF NOT EXISTS public.token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,

    -- Informações da requisição
    api_key_id TEXT NOT NULL,
    api_key_name TEXT,
    provider TEXT NOT NULL DEFAULT 'google', -- 'google' ou 'openrouter'
    model TEXT NOT NULL,

    -- Mensagem
    prompt_text TEXT,
    response_text TEXT,

    -- Tokens
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Custo estimado (em USD)
    estimated_cost DECIMAL(10, 6) DEFAULT 0,

    -- Metadata
    duration_ms INTEGER, -- Duração da requisição em ms
    status TEXT DEFAULT 'success', -- 'success', 'error', 'rate_limit'
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Índices para queries rápidas
    CONSTRAINT token_usage_user_id_idx
        CHECK (user_id IS NOT NULL)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id
    ON public.token_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_token_usage_created_at
    ON public.token_usage(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_api_key_id
    ON public.token_usage(api_key_id);

CREATE INDEX IF NOT EXISTS idx_token_usage_provider
    ON public.token_usage(provider);

-- RLS (Row Level Security)
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios registros
CREATE POLICY "Users can view own usage"
    ON public.token_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Política: Serviço pode inserir registros
CREATE POLICY "Service can insert usage"
    ON public.token_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- View para estatísticas agregadas por usuário
CREATE OR REPLACE VIEW public.user_usage_stats AS
SELECT
    user_id,
    user_email,
    COUNT(*) as total_requests,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    AVG(duration_ms) as avg_duration_ms,
    DATE_TRUNC('day', created_at) as date
FROM public.token_usage
GROUP BY user_id, user_email, DATE_TRUNC('day', created_at);

-- View para estatísticas por API key
CREATE OR REPLACE VIEW public.api_key_usage_stats AS
SELECT
    api_key_id,
    api_key_name,
    provider,
    model,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    DATE_TRUNC('day', created_at) as date
FROM public.token_usage
GROUP BY api_key_id, api_key_name, provider, model, DATE_TRUNC('day', created_at);

-- Comentários
COMMENT ON TABLE public.token_usage IS 'Rastreamento de uso de tokens por usuário e requisição';
COMMENT ON COLUMN public.token_usage.user_id IS 'ID do usuário do Supabase Auth';
COMMENT ON COLUMN public.token_usage.prompt_tokens IS 'Tokens usados no prompt (input)';
COMMENT ON COLUMN public.token_usage.completion_tokens IS 'Tokens usados na resposta (output)';
COMMENT ON COLUMN public.token_usage.total_tokens IS 'Total de tokens usados';
COMMENT ON COLUMN public.token_usage.estimated_cost IS 'Custo estimado em USD';
