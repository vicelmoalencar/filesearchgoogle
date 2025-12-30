import { query } from './postgres';
import { trackUsage as trackCreditosUsage } from './creditos-centralizados';

interface TokenUsageData {
  userId: string;
  userEmail?: string;
  apiKeyId: string;
  apiKeyName?: string;
  provider: 'google' | 'openrouter';
  model: string;
  promptText?: string;
  responseText?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  durationMs?: number;
  status?: 'success' | 'error' | 'rate_limit';
  errorMessage?: string;
}

/**
 * Estimar custo baseado no modelo e tokens
 */
function estimateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
  // Preços em BRL (R$) por 1M tokens - valores oficiais GCP
  const pricing: Record<string, { prompt: number; completion: number }> = {
    // Google Gemini - Preços GCP em R$ (Preço de tabela oficial)
    'gemini-2.5-flash': { prompt: 1.834620875, completion: 15.288507299 }, // GCP Brasil
    'gemini-2.0-flash-exp': { prompt: 0, completion: 0 },
    'gemini-pro-1.5': { prompt: 12.5, completion: 50 }, // Estimado em R$ (USD 2.5/10 * 5)

    // OpenRouter - Anthropic (valores em R$, convertidos de USD com taxa ~5.0)
    'anthropic/claude-3.5-sonnet': { prompt: 15, completion: 75 },
    'anthropic/claude-3-opus': { prompt: 75, completion: 375 },
    'anthropic/claude-3-haiku': { prompt: 1.25, completion: 6.25 },

    // OpenRouter - OpenAI (valores em R$, convertidos de USD com taxa ~5.0)
    'openai/gpt-4-turbo': { prompt: 50, completion: 150 },
    'openai/gpt-3.5-turbo': { prompt: 2.5, completion: 7.5 },

    // OpenRouter - Google via OpenRouter (valores em R$)
    'google/gemini-pro-1.5': { prompt: 12.5, completion: 50 },

    // OpenRouter - Meta (valores em R$, convertidos de USD com taxa ~5.0)
    'meta-llama/llama-3-70b-instruct': { prompt: 2.95, completion: 3.95 },
  };

  const modelPricing = pricing[model] || pricing['gemini-2.5-flash'];

  const promptCost = (promptTokens / 1_000_000) * modelPricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * modelPricing.completion;

  return promptCost + completionCost;
}

/**
 * Estimar tokens de texto (aproximação)
 * Em média: 1 token ≈ 4 caracteres em português
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Registrar uso de tokens no PostgreSQL
 */
export async function trackTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    const estimatedCost = data.estimatedCost ?? estimateCost(
      data.provider,
      data.model,
      data.promptTokens,
      data.completionTokens
    );

    await query(
      `INSERT INTO token_usage (
        user_id, user_email, api_key_id, api_key_name,
        provider, model, prompt_text, response_text,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost, duration_ms, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        data.userId,
        data.userEmail,
        data.apiKeyId,
        data.apiKeyName,
        data.provider,
        data.model,
        data.promptText?.substring(0, 5000), // Limitar tamanho
        data.responseText?.substring(0, 5000),
        data.promptTokens,
        data.completionTokens,
        data.totalTokens,
        estimatedCost,
        data.durationMs,
        data.status || 'success',
        data.errorMessage
      ]
    );

    console.log('[Usage Tracking] ✅ Saved to PostgreSQL:', {
      user: data.userEmail,
      tokens: data.totalTokens,
      cost: estimatedCost.toFixed(6),
      model: data.model
    });

    // Também enviar para o sistema centralizado de créditos
    if (data.userEmail) {
      trackCreditosUsage({
        userEmail: data.userEmail,
        modelCode: data.model,
        inputTokens: data.promptTokens,
        outputTokens: data.completionTokens,
        audioTokens: 0,
        requestDurationMs: data.durationMs,
        status: data.status || 'success',
        errorMessage: data.errorMessage,
        metadata: {
          apiKeyId: data.apiKeyId,
          apiKeyName: data.apiKeyName,
          provider: data.provider
        }
      }).catch(err => {
        console.error('[Usage Tracking] Error saving to Creditos:', err);
      });
    }
  } catch (error) {
    console.error('[Usage Tracking] Error saving to PostgreSQL:', error);
  }
}

/**
 * Obter estatísticas de uso de um usuário
 */
export async function getUserUsageStats(userId: string, days: number = 30) {
  try {
    const result = await query(
      `SELECT * FROM token_usage
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC`,
      [userId]
    );

    const data = result.rows;

    // Calcular totais
    const stats = {
      totalRequests: data.length,
      totalTokens: data.reduce((sum: number, row: any) => sum + (row.total_tokens || 0), 0),
      totalCost: data.reduce((sum: number, row: any) => sum + (parseFloat(row.estimated_cost) || 0), 0),
      byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
      byDay: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    };

    // Agrupar por modelo
    data.forEach((row: any) => {
      const model = row.model;
      if (!stats.byModel[model]) {
        stats.byModel[model] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byModel[model].requests++;
      stats.byModel[model].tokens += row.total_tokens || 0;
      stats.byModel[model].cost += parseFloat(row.estimated_cost) || 0;

      // Agrupar por dia
      const day = row.created_at.toISOString().split('T')[0];
      if (!stats.byDay[day]) {
        stats.byDay[day] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byDay[day].requests++;
      stats.byDay[day].tokens += row.total_tokens || 0;
      stats.byDay[day].cost += parseFloat(row.estimated_cost) || 0;
    });

    return stats;
  } catch (error) {
    console.error('[Usage Stats] Error:', error);
    return null;
  }
}

export { estimateTokens };
