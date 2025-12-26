-- Script SQL para atualizar custos estimados dos registros antigos
-- Recalcula o estimated_cost usando os preços oficiais do GCP em BRL

-- IMPORTANTE: Execute este script no Supabase SQL Editor

-- Preços em BRL (R$) por 1M tokens
-- Gemini 2.5 Flash: Input R$ 1,834620875 | Output R$ 15,288507299

-- Atualizar registros do modelo gemini-2.5-flash com custo zerado
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 1.834620875 +
    (completion_tokens::numeric / 1000000.0) * 15.288507299
)
WHERE model = 'gemini-2.5-flash'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar registros do modelo gemini-pro-1.5 com custo zerado
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 12.5 +
    (completion_tokens::numeric / 1000000.0) * 50.0
)
WHERE model = 'gemini-pro-1.5'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar registros do modelo gemini-2.0-flash-exp (gratuito)
UPDATE public.token_usage
SET estimated_cost = 0
WHERE model = 'gemini-2.0-flash-exp'
  AND (estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - Claude 3.5 Sonnet
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 15.0 +
    (completion_tokens::numeric / 1000000.0) * 75.0
)
WHERE model = 'anthropic/claude-3.5-sonnet'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - Claude 3 Opus
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 75.0 +
    (completion_tokens::numeric / 1000000.0) * 375.0
)
WHERE model = 'anthropic/claude-3-opus'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - Claude 3 Haiku
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 1.25 +
    (completion_tokens::numeric / 1000000.0) * 6.25
)
WHERE model = 'anthropic/claude-3-haiku'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - GPT-4 Turbo
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 50.0 +
    (completion_tokens::numeric / 1000000.0) * 150.0
)
WHERE model = 'openai/gpt-4-turbo'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - GPT-3.5 Turbo
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 2.5 +
    (completion_tokens::numeric / 1000000.0) * 7.5
)
WHERE model = 'openai/gpt-3.5-turbo'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - Gemini Pro 1.5
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 12.5 +
    (completion_tokens::numeric / 1000000.0) * 50.0
)
WHERE model = 'google/gemini-pro-1.5'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Atualizar modelos OpenRouter - Llama 3 70B
UPDATE public.token_usage
SET estimated_cost = (
    (prompt_tokens::numeric / 1000000.0) * 2.95 +
    (completion_tokens::numeric / 1000000.0) * 3.95
)
WHERE model = 'meta-llama/llama-3-70b-instruct'
  AND (estimated_cost = 0 OR estimated_cost IS NULL);

-- Ver estatísticas após a atualização
SELECT
    model,
    COUNT(*) as total_records,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    AVG(estimated_cost) as avg_cost,
    MIN(estimated_cost) as min_cost,
    MAX(estimated_cost) as max_cost
FROM public.token_usage
GROUP BY model
ORDER BY total_cost DESC;

-- Ver quantos registros ainda têm custo zerado
SELECT
    model,
    COUNT(*) as records_with_zero_cost
FROM public.token_usage
WHERE estimated_cost = 0 OR estimated_cost IS NULL
GROUP BY model;
