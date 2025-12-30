-- =====================================================
-- Migration: Sistema Centralizado de Créditos
-- Database: Creditos_Ensinoplus
-- Purpose: Gerenciar créditos de múltiplas plataformas
-- =====================================================

-- =====================================================
-- TABELA: platforms
-- Descrição: Plataformas que usam o sistema de créditos
-- =====================================================
CREATE TABLE IF NOT EXISTS platforms (
    id SERIAL PRIMARY KEY,
    platform_code VARCHAR(50) UNIQUE NOT NULL,
    platform_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_platforms_code ON platforms(platform_code);
CREATE INDEX IF NOT EXISTS idx_platforms_active ON platforms(is_active);

-- Inserir plataformas existentes
INSERT INTO platforms (platform_code, platform_name, description) VALUES
('fgts_facil', 'FGTS Fácil', 'Plataforma de consulta de FGTS'),
('chat_cct', 'Chat CCT', 'Chat com IA para cálculos trabalhistas'),
('ponto_magico', 'Ponto Mágico', 'Sistema de controle de ponto'),
('contracheque_transparente', 'Contracheque Transparente', 'Sistema de contracheques')
ON CONFLICT (platform_code) DO NOTHING;

-- =====================================================
-- TABELA: ai_models
-- Descrição: Modelos de IA com seus custos
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    model_code VARCHAR(100) UNIQUE NOT NULL,
    model_name VARCHAR(200) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'google', 'openai', 'anthropic', etc

    -- Custos em USD por milhão de tokens
    cost_input_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    cost_output_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    cost_audio_usd NUMERIC(10, 6) DEFAULT 0,
    cost_context_usd NUMERIC(10, 6) DEFAULT 0,

    -- Custos em BRL por milhão de tokens (taxa conversão ~5.0)
    cost_input_brl NUMERIC(10, 6) NOT NULL DEFAULT 0,
    cost_output_brl NUMERIC(10, 6) NOT NULL DEFAULT 0,
    cost_audio_brl NUMERIC(10, 6) DEFAULT 0,
    cost_context_brl NUMERIC(10, 6) DEFAULT 0,

    -- Context window size
    context_window INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT true,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_models_code ON ai_models(model_code);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);

-- Inserir modelo atual (Gemini 2.5 Flash)
-- Preços: $0.30/M input, $2.50/M output, $1/M audio, 1.05M context
-- Taxa conversão: ~5.0 BRL/USD
INSERT INTO ai_models (
    model_code, model_name, provider,
    cost_input_usd, cost_output_usd, cost_audio_usd,
    cost_input_brl, cost_output_brl, cost_audio_brl,
    context_window, notes
) VALUES (
    'gemini-2.5-flash',
    'Google Gemini 2.5 Flash',
    'google',
    0.30,  -- $0.30/M input
    2.50,  -- $2.50/M output
    1.00,  -- $1/M audio
    1.50,  -- R$ 1.50/M input (0.30 * 5)
    12.50, -- R$ 12.50/M output (2.50 * 5)
    5.00,  -- R$ 5.00/M audio (1.00 * 5)
    1050000, -- 1.05M context window
    'Modelo principal usado por todas as plataformas. Preços de 2025.'
) ON CONFLICT (model_code) DO UPDATE SET
    cost_input_usd = EXCLUDED.cost_input_usd,
    cost_output_usd = EXCLUDED.cost_output_usd,
    cost_audio_usd = EXCLUDED.cost_audio_usd,
    cost_input_brl = EXCLUDED.cost_input_brl,
    cost_output_brl = EXCLUDED.cost_output_brl,
    cost_audio_brl = EXCLUDED.cost_audio_brl,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- TABELA: users_credits
-- Descrição: Saldo de créditos dos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS users_credits (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255),

    -- Saldo de créditos
    credits_balance INTEGER NOT NULL DEFAULT 0,

    -- Total histórico
    total_credits_purchased INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_credits_email ON users_credits(user_email);
CREATE INDEX IF NOT EXISTS idx_users_credits_active ON users_credits(is_active);

-- =====================================================
-- TABELA: usage_tracking
-- Descrição: Tracking de uso de IA por plataforma
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id SERIAL PRIMARY KEY,

    -- Identificação
    platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    model_id INTEGER REFERENCES ai_models(id) ON DELETE SET NULL,

    -- Tokens consumidos
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    audio_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Custos calculados em BRL
    cost_input_brl NUMERIC(10, 6) DEFAULT 0,
    cost_output_brl NUMERIC(10, 6) DEFAULT 0,
    cost_audio_brl NUMERIC(10, 6) DEFAULT 0,
    total_cost_brl NUMERIC(10, 6) NOT NULL DEFAULT 0,

    -- Custos em USD (para referência)
    total_cost_usd NUMERIC(10, 6) DEFAULT 0,

    -- Metadados
    request_duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success', -- success, error, rate_limit
    error_message TEXT,

    -- Contexto adicional (JSON)
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_platform ON usage_tracking(platform_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_model ON usage_tracking(model_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created ON usage_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_platform_user ON usage_tracking(platform_id, user_email);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_platform_created ON usage_tracking(platform_id, created_at);

-- =====================================================
-- TABELA: cost_accumulation
-- Descrição: Acumulação de custos para dedução de créditos
-- Regra: Cada R$ 0,04 acumulado = 1 crédito deduzido
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_accumulation (
    id SERIAL PRIMARY KEY,

    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,

    -- Custo acumulado em BRL
    accumulated_cost_brl NUMERIC(10, 6) NOT NULL DEFAULT 0,

    -- Total de tokens acumulados (informativo)
    accumulated_tokens INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'accumulating', -- accumulating, deducted

    -- Quando foi deduzido (se já foi)
    deducted_at TIMESTAMP WITH TIME ZONE,
    credits_deducted INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Cada usuário só pode ter 1 acumulação ativa por plataforma
    UNIQUE(user_email, platform_id, status)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cost_accumulation_user ON cost_accumulation(user_email);
CREATE INDEX IF NOT EXISTS idx_cost_accumulation_platform ON cost_accumulation(platform_id);
CREATE INDEX IF NOT EXISTS idx_cost_accumulation_status ON cost_accumulation(status);
CREATE INDEX IF NOT EXISTS idx_cost_accumulation_user_status ON cost_accumulation(user_email, status);

-- =====================================================
-- TABELA: credit_deductions
-- Descrição: Histórico de deduções de créditos
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_deductions (
    id SERIAL PRIMARY KEY,

    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,

    -- Custo que causou a dedução
    cost_accumulated_brl NUMERIC(10, 6) NOT NULL,
    tokens_accumulated INTEGER DEFAULT 0,

    -- Créditos deduzidos
    credits_deducted INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,

    -- Metadados
    deduction_reason VARCHAR(255) DEFAULT 'cost_threshold_reached',
    notes TEXT,

    deducted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credit_deductions_user ON credit_deductions(user_email);
CREATE INDEX IF NOT EXISTS idx_credit_deductions_platform ON credit_deductions(platform_id);
CREATE INDEX IF NOT EXISTS idx_credit_deductions_deducted_at ON credit_deductions(deducted_at);

-- =====================================================
-- TABELA: credit_config
-- Descrição: Configurações do sistema de créditos
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração inicial
INSERT INTO credit_config (config_key, config_value, description) VALUES
('cost_per_credit_brl', '0.04', 'Custo em R$ para deduzir 1 crédito'),
('usd_to_brl_rate', '5.0', 'Taxa de conversão USD para BRL'),
('min_credits_warning', '10', 'Aviso quando créditos estão abaixo deste valor')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View: Resumo de uso por usuário e plataforma
CREATE OR REPLACE VIEW user_platform_usage_summary AS
SELECT
    u.user_email,
    p.platform_name,
    COUNT(*) as total_requests,
    SUM(u.total_tokens) as total_tokens,
    SUM(u.total_cost_brl) as total_cost_brl,
    SUM(u.total_cost_usd) as total_cost_usd,
    MAX(u.created_at) as last_request_at
FROM usage_tracking u
JOIN platforms p ON u.platform_id = p.id
GROUP BY u.user_email, p.platform_name;

-- View: Usuários com saldo de créditos
CREATE OR REPLACE VIEW users_with_credits AS
SELECT
    uc.user_email,
    uc.user_name,
    uc.credits_balance,
    uc.total_credits_purchased,
    uc.total_credits_used,
    uc.last_activity_at,
    COALESCE(acc.accumulated_cost_brl, 0) as pending_cost_brl,
    COALESCE(acc.accumulated_tokens, 0) as pending_tokens
FROM users_credits uc
LEFT JOIN cost_accumulation acc ON uc.user_email = acc.user_email AND acc.status = 'accumulating'
WHERE uc.is_active = true;

-- View: Custos por modelo
CREATE OR REPLACE VIEW model_usage_stats AS
SELECT
    m.model_name,
    m.provider,
    COUNT(u.id) as total_requests,
    SUM(u.total_tokens) as total_tokens,
    SUM(u.total_cost_brl) as total_cost_brl,
    AVG(u.total_cost_brl) as avg_cost_per_request_brl
FROM usage_tracking u
JOIN ai_models m ON u.model_id = m.id
GROUP BY m.model_name, m.provider
ORDER BY total_cost_brl DESC;

-- View: Resumo de deduções por plataforma
CREATE OR REPLACE VIEW platform_deductions_summary AS
SELECT
    p.platform_name,
    COUNT(cd.id) as total_deductions,
    SUM(cd.credits_deducted) as total_credits_deducted,
    SUM(cd.cost_accumulated_brl) as total_cost_accumulated_brl,
    MAX(cd.deducted_at) as last_deduction_at
FROM credit_deductions cd
JOIN platforms p ON cd.platform_id = p.id
GROUP BY p.platform_name
ORDER BY total_credits_deducted DESC;

-- =====================================================
-- FUNCTION: Calcular custo baseado em tokens
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_cost(
    p_model_id INTEGER,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_audio_tokens INTEGER DEFAULT 0
) RETURNS TABLE(
    cost_input_brl NUMERIC,
    cost_output_brl NUMERIC,
    cost_audio_brl NUMERIC,
    total_cost_brl NUMERIC,
    total_cost_usd NUMERIC
) AS $$
DECLARE
    v_model RECORD;
    v_usd_rate NUMERIC;
BEGIN
    -- Buscar modelo
    SELECT * INTO v_model FROM ai_models WHERE id = p_model_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Model ID % not found', p_model_id;
    END IF;

    -- Buscar taxa USD/BRL
    SELECT config_value::NUMERIC INTO v_usd_rate
    FROM credit_config WHERE config_key = 'usd_to_brl_rate';

    -- Calcular custos em BRL
    cost_input_brl := (p_input_tokens::NUMERIC / 1000000.0) * v_model.cost_input_brl;
    cost_output_brl := (p_output_tokens::NUMERIC / 1000000.0) * v_model.cost_output_brl;
    cost_audio_brl := (p_audio_tokens::NUMERIC / 1000000.0) * COALESCE(v_model.cost_audio_brl, 0);

    total_cost_brl := cost_input_brl + cost_output_brl + cost_audio_brl;
    total_cost_usd := total_cost_brl / v_usd_rate;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================
COMMENT ON TABLE platforms IS 'Plataformas que usam o sistema de créditos centralizado';
COMMENT ON TABLE ai_models IS 'Modelos de IA com custos por milhão de tokens';
COMMENT ON TABLE users_credits IS 'Saldo de créditos dos usuários (compartilhado entre plataformas)';
COMMENT ON TABLE usage_tracking IS 'Tracking de uso de IA por usuário e plataforma';
COMMENT ON TABLE cost_accumulation IS 'Acumulação de custos para dedução de créditos (R$ 0,04 = 1 crédito)';
COMMENT ON TABLE credit_deductions IS 'Histórico de deduções de créditos';
COMMENT ON TABLE credit_config IS 'Configurações do sistema (custo por crédito, taxa conversão, etc)';

COMMENT ON VIEW user_platform_usage_summary IS 'Resumo de uso por usuário e plataforma';
COMMENT ON VIEW users_with_credits IS 'Usuários com seus saldos e custos pendentes';
COMMENT ON VIEW model_usage_stats IS 'Estatísticas de uso por modelo de IA';
COMMENT ON VIEW platform_deductions_summary IS 'Resumo de deduções por plataforma';

-- =====================================================
-- GRANTS (ajustar conforme necessário)
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;
