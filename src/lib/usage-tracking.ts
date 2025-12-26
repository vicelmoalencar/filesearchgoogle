import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  // Preços em USD por 1M tokens
  const pricing: Record<string, { prompt: number; completion: number }> = {
    // Google Gemini
    'gemini-2.5-flash': { prompt: 0, completion: 0 }, // Gratuito até 1500 req/dia
    'gemini-2.0-flash-exp': { prompt: 0, completion: 0 },
    'gemini-pro-1.5': { prompt: 2.5, completion: 10 },

    // OpenRouter - Anthropic
    'anthropic/claude-3.5-sonnet': { prompt: 3, completion: 15 },
    'anthropic/claude-3-opus': { prompt: 15, completion: 75 },
    'anthropic/claude-3-haiku': { prompt: 0.25, completion: 1.25 },

    // OpenRouter - OpenAI
    'openai/gpt-4-turbo': { prompt: 10, completion: 30 },
    'openai/gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },

    // OpenRouter - Google via OpenRouter
    'google/gemini-pro-1.5': { prompt: 2.5, completion: 10 },

    // OpenRouter - Meta
    'meta-llama/llama-3-70b-instruct': { prompt: 0.59, completion: 0.79 },
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
 * Registrar uso de tokens no Supabase
 */
export async function trackTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    const estimatedCost = data.estimatedCost ?? estimateCost(
      data.provider,
      data.model,
      data.promptTokens,
      data.completionTokens
    );

    const { error } = await supabase
      .from('token_usage')
      .insert({
        user_id: data.userId,
        user_email: data.userEmail,
        api_key_id: data.apiKeyId,
        api_key_name: data.apiKeyName,
        provider: data.provider,
        model: data.model,
        prompt_text: data.promptText?.substring(0, 5000), // Limitar tamanho
        response_text: data.responseText?.substring(0, 5000),
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        total_tokens: data.totalTokens,
        estimated_cost: estimatedCost,
        duration_ms: data.durationMs,
        status: data.status || 'success',
        error_message: data.errorMessage,
      });

    if (error) {
      console.error('[Usage Tracking] Error saving to database:', error);
    } else {
      console.log('[Usage Tracking] ✅ Saved:', {
        user: data.userEmail,
        tokens: data.totalTokens,
        cost: estimatedCost.toFixed(6),
        model: data.model
      });
    }
  } catch (error) {
    console.error('[Usage Tracking] Exception:', error);
  }
}

/**
 * Obter estatísticas de uso de um usuário
 */
export async function getUserUsageStats(userId: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('token_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Usage Stats] Error:', error);
      return null;
    }

    // Calcular totais
    const stats = {
      totalRequests: data.length,
      totalTokens: data.reduce((sum, row) => sum + (row.total_tokens || 0), 0),
      totalCost: data.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0),
      byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
      byDay: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    };

    // Agrupar por modelo
    data.forEach(row => {
      const model = row.model;
      if (!stats.byModel[model]) {
        stats.byModel[model] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byModel[model].requests++;
      stats.byModel[model].tokens += row.total_tokens || 0;
      stats.byModel[model].cost += parseFloat(row.estimated_cost) || 0;

      // Agrupar por dia
      const day = row.created_at.split('T')[0];
      if (!stats.byDay[day]) {
        stats.byDay[day] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byDay[day].requests++;
      stats.byDay[day].tokens += row.total_tokens || 0;
      stats.byDay[day].cost += parseFloat(row.estimated_cost) || 0;
    });

    return stats;
  } catch (error) {
    console.error('[Usage Stats] Exception:', error);
    return null;
  }
}

export { estimateTokens };
