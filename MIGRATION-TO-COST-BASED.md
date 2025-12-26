# Migração: Sistema de Tokens → Sistema de Custo em Reais

## 📋 Mudanças Implementadas

### 1. Sistema de Preços Atualizado

**Arquivo**: `src/lib/usage-tracking.ts`

- ✅ Alterado de USD para BRL (R$)
- ✅ Preços oficiais GCP Brasil aplicados
- ✅ Gemini 2.5 Flash agora com custos reais:
  - Input: R$ 1,834620875 por 1M tokens
  - Output: R$ 15,288507299 por 1M tokens

### 2. Sistema de Dedução Atualizado

**Arquivo**: `src/app/api/check-credits/route.ts`

- ✅ Mudou de `TOKENS_PER_CREDIT` para `COST_PER_CREDIT`
- ✅ Agora deduz 1 crédito a cada **R$ 0,10** gastos
- ✅ Calcula baseado em `estimated_cost` em vez de `total_tokens`
- ✅ Adiciona campo `cost_accumulated` ao registrar deduções

### 3. Migração do Banco de Dados

**Novo arquivo**: `supabase/migrations/add_cost_accumulated_column.sql`

Adiciona coluna `cost_accumulated` à tabela `credit_deductions`.

**Como aplicar:**

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Execute o SQL:

```sql
ALTER TABLE public.credit_deductions
ADD COLUMN IF NOT EXISTS cost_accumulated NUMERIC(10, 6) DEFAULT 0;

COMMENT ON COLUMN public.credit_deductions.cost_accumulated IS 'Custo total acumulado em R$ que gerou esta dedução (1 crédito = R$ 0,10)';
```

3. Atualize a view:

```sql
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
```

### 4. Documentação Atualizada

**Arquivo**: `CREDITS-SYSTEM.md`

- ✅ Atualizado para refletir sistema baseado em custo
- ✅ Exemplos com valores em R$
- ✅ Preços GCP oficiais documentados

## 🔄 Antes vs Depois

### Antes (Sistema de Tokens)
```typescript
const TOKENS_PER_CREDIT = 20000;
const creditsToDeduct = Math.floor(totalTokens / TOKENS_PER_CREDIT);
// 120.000 tokens = 6 créditos
```

### Depois (Sistema de Custo)
```typescript
const COST_PER_CREDIT = 0.10; // R$
const creditsToDeduct = Math.floor(totalCost / COST_PER_CREDIT);
// R$ 0,12 = 1 crédito
```

## 📊 Impacto nos Custos

### Exemplo Real de Uso

**Mensagem típica:**
- Prompt: 141 tokens
- Resposta: 1038 tokens
- Total: 1179 tokens

**Custo calculado:**
- Input: (141 / 1.000.000) × R$ 1,83 = R$ 0,000259
- Output: (1038 / 1.000.000) × R$ 15,29 = R$ 0,015869
- **Total: R$ 0,016128**

**Para deduzir 1 crédito (R$ 0,10):**
- Seriam necessárias aproximadamente **6-7 mensagens** desse tamanho

### Comparação com Sistema Anterior

**Sistema Anterior (20k tokens = 1 crédito):**
- 1179 tokens por mensagem
- ~17 mensagens para 1 crédito

**Sistema Novo (R$ 0,10 = 1 crédito):**
- R$ 0,016 por mensagem
- ~6-7 mensagens para 1 crédito

⚠️ **IMPORTANTE**: O novo sistema deduz créditos **mais rapidamente** pois considera o custo real!

## 🧪 Como Testar

### 1. Verificar preços aplicados
```bash
node check-token-tracking.js
```

Deve mostrar `estimated_cost` com valores > 0.

### 2. Simular dedução de crédito
```bash
curl -X POST http://localhost:3000/api/check-credits \
  -H "Content-Type: application/json" \
  -d '{"userId":"seu-uuid","userEmail":"seu@email.com"}'
```

### 3. Verificar logs do servidor
Busque por:
```
[Check Credits] User: email@example.com, Total Cost: R$ 0.0456, Total Tokens: 2834, Credits to deduct: 0
```

## ✅ Checklist de Migração

- [x] Atualizar preços em `usage-tracking.ts`
- [x] Mudar lógica em `check-credits/route.ts`
- [ ] Aplicar migration SQL no Supabase
- [x] Atualizar documentação
- [ ] Reiniciar servidor de produção
- [ ] Monitorar primeiras deduções
- [ ] Validar com usuários reais

## 🔧 Rollback (se necessário)

Se precisar voltar ao sistema antigo:

1. Reverter `src/lib/usage-tracking.ts`:
```typescript
'gemini-2.5-flash': { prompt: 0, completion: 0 }
```

2. Reverter `src/app/api/check-credits/route.ts`:
```typescript
const TOKENS_PER_CREDIT = 20000;
const creditsToDeduct = Math.floor(totalTokens / TOKENS_PER_CREDIT);
```

3. Reiniciar servidor

## 📞 Suporte

Em caso de dúvidas ou problemas, verificar:

1. Logs do servidor (`npm run dev`)
2. Tabela `token_usage` no Supabase
3. Tabela `credit_deductions` no Supabase
4. Script de diagnóstico: `node check-token-tracking.js`
