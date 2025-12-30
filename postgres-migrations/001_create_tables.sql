-- =====================================================
-- Migration: Criar tabelas para tracking de tokens e créditos
-- Database: PostgreSQL (chatCCT)
-- =====================================================

-- Tabela: token_usage
-- Armazena o uso de tokens de cada usuário
CREATE TABLE IF NOT EXISTS token_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    api_key_id VARCHAR(100),
    api_key_name VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_text TEXT,
    response_text TEXT,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,
    duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_created ON token_usage(user_id, created_at);

-- Tabela: credit_deductions
-- Registra as deduções de créditos quando o custo acumulado atinge o limite
CREATE TABLE IF NOT EXISTS credit_deductions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    cost_accumulated NUMERIC(10, 6) DEFAULT 0,
    credits_deducted INTEGER NOT NULL DEFAULT 0,
    credits_remaining INTEGER,
    deducted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credit_deductions_user_id ON credit_deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_deductions_deducted_at ON credit_deductions(deducted_at);

-- View: user_credit_deductions_summary
-- Resumo de deduções por usuário
CREATE OR REPLACE VIEW user_credit_deductions_summary AS
SELECT
    user_id,
    user_email,
    COUNT(*) as total_deductions,
    SUM(tokens_consumed) as total_tokens_consumed,
    SUM(cost_accumulated) as total_cost_accumulated,
    SUM(credits_deducted) as total_credits_deducted,
    MAX(deducted_at) as last_deduction_at
FROM credit_deductions
GROUP BY user_id, user_email;

-- View: user_usage_summary
-- Resumo de uso por usuário nos últimos 30 dias
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT
    user_id,
    user_email,
    COUNT(*) as total_requests,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    AVG(duration_ms) as avg_duration_ms,
    MAX(created_at) as last_request_at
FROM token_usage
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY user_id, user_email;

COMMENT ON TABLE token_usage IS 'Registros de uso de tokens da API Gemini por usuário';
COMMENT ON TABLE credit_deductions IS 'Histórico de deduções de créditos baseado no custo acumulado';
COMMENT ON VIEW user_credit_deductions_summary IS 'Resumo de deduções de créditos por usuário';
COMMENT ON VIEW user_usage_summary IS 'Resumo de uso de tokens por usuário (últimos 30 dias)';
