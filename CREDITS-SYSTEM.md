# Sistema de Dedução de Créditos Baseado em Custo (R$)

## 📋 Visão Geral

Este sistema deduz automaticamente créditos dos usuários baseado no **custo real em reais (R$)** do consumo da IA, utilizando preços oficiais do GCP.

## ⚙️ Configuração

### Custo por Crédito

No arquivo `src/app/api/check-credits/route.ts`, linha 10:

```typescript
const COST_PER_CREDIT = 0.10; // R$ 0,10 = 1 crédito
```

**Ajuste este valor conforme necessário:**
- `0.05` = Deduz 1 crédito a cada R$ 0,05
- `0.10` = Deduz 1 crédito a cada R$ 0,10 (padrão)
- `0.20` = Deduz 1 crédito a cada R$ 0,20

## 🔄 Como Funciona

### 1. Registro de Uso
Toda vez que um usuário faz uma pergunta no chat:
- ✅ Os tokens são contados (prompt + resposta)
- ✅ O custo é calculado em R$ usando preços GCP oficiais
- ✅ Salvos na tabela `token_usage` do Supabase
- ✅ Incluem: user_id, email, modelo, tokens, **estimated_cost (em R$)**, data

**Preços Gemini 2.5 Flash (Brasil):**
- Input: R$ 1,834620875 por 1M tokens
- Output: R$ 15,288507299 por 1M tokens

### 2. Verificação Automática
Após cada pergunta bem-sucedida:
- 🔍 O sistema calcula o **custo total acumulado em R$** (últimos 30 dias)
- 🧮 Divide pelo `COST_PER_CREDIT` (R$ 0,10) para saber quantos créditos deduzir
- 📞 Se ≥ 1 crédito, chama a API PHP para deduzir

### 3. Dedução de Créditos
A API PHP (`ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php`):
- ✅ Recebe email + quantidade de créditos
- ✅ Verifica se usuário tem plano ativo (via API Bubble)
- ✅ Deduz 1 crédito (com plano) ou quantidade solicitada (sem plano)
- ✅ Registra no MySQL (credit_logs)
- ✅ Registra no Supabase (credit_usage_history)

### 4. Registro de Dedução
- 📝 Salva na tabela `credit_deductions` do Supabase
- ⛔ Evita deduções duplicadas
- 📊 Permite visualizar histórico de deduções

## 🗄️ Tabelas do Supabase

### `token_usage`
Registra cada interação com a IA:
```sql
SELECT user_email, SUM(total_tokens), COUNT(*)
FROM token_usage
WHERE user_id = 'uuid-aqui'
GROUP BY user_email;
```

### `credit_deductions`
Registra cada dedução de crédito:
```sql
SELECT * FROM credit_deductions
WHERE user_email = 'email@exemplo.com'
ORDER BY deducted_at DESC;
```

## 📊 Exemplo de Funcionamento

### Cenário 1: Usuário atinge R$ 0,10 em custos

1. Usuário faz perguntas que custam R$ 0,12 no total
2. Sistema calcula: `0.12 / 0.10 = 1` crédito (arredonda para baixo)
3. Chama API PHP para deduzir 1 crédito
4. Salva registro em `credit_deductions` com `cost_accumulated: 0.12`
5. Próxima verificação será sobre os R$ 0,02 restantes

### Cenário 2: Usuário com plano ativo

1. API PHP detecta plano ativo via API Bubble
2. Deduz apenas 1 crédito (independente da quantidade solicitada)
3. Retorna sucesso com mensagem especial

## 🛠️ Migrações SQL

### Criar tabela credit_deductions

Execute no Supabase SQL Editor:
```bash
supabase/migrations/create_credit_deductions.sql
```

Ou via Dashboard:
https://app.supabase.com/project/ghdfouqzasvxlptbjkin/sql/new

## 🔍 Monitoramento

### Ver uso total de tokens por usuário
```sql
SELECT
    user_email,
    COUNT(*) as requests,
    SUM(total_tokens) as total_tokens,
    SUM(total_tokens) / 100000.0 as credits_equivalent
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY total_tokens DESC;
```

### Ver deduções de crédito
```sql
SELECT
    user_email,
    tokens_consumed,
    credits_deducted,
    credits_remaining,
    deducted_at
FROM credit_deductions
ORDER BY deducted_at DESC
LIMIT 20;
```

### Ver próximos usuários a deduzir
```sql
SELECT
    user_email,
    SUM(total_tokens) as total_tokens,
    FLOOR(SUM(total_tokens) / 100000.0) as credits_to_deduct
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email
HAVING SUM(total_tokens) >= 100000
ORDER BY total_tokens DESC;
```

## ⚠️ Notas Importantes

1. **Custos em REAIS (R$)**: Todos os valores são calculados usando preços GCP oficiais em BRL
2. **Deduções não bloqueiam o chat**: Tudo funciona em background
3. **Deduz apenas quando necessário**: Não deduz frações de crédito
4. **Respeita planos ativos**: Usuários com plano pagam menos
5. **Histórico completo**: Tudo registrado no Supabase + MySQL
6. **Preços atualizados**: Use os valores do arquivo CSV oficial do GCP

## 🔧 Personalização

### Alterar custo por crédito
Edite `src/app/api/check-credits/route.ts`:
```typescript
const COST_PER_CREDIT = 0.10; // Mude para o valor desejado em R$
```

### Alterar preços dos modelos
Edite `src/lib/usage-tracking.ts`:
```typescript
'gemini-2.5-flash': { prompt: 1.834620875, completion: 15.288507299 }, // Valores em R$ por 1M tokens
```

### Alterar período de análise
Por padrão analisa últimos 30 dias. Para mudar:
```typescript
.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
//                                        ↑ Mude este número
```

### Testar manualmente
```bash
curl -X POST http://localhost:3000/api/check-credits \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid-aqui","userEmail":"teste@exemplo.com"}'
```

## 📞 API Endpoints

### POST /api/check-credits
Verifica e deduz créditos baseado em tokens

**Request:**
```json
{
  "userId": "uuid-do-usuario",
  "userEmail": "email@exemplo.com"
}
```

**Response (quando deduz):**
```json
{
  "success": true,
  "message": "1 crédito(s) deduzido(s)",
  "tokens_consumed": 120000,
  "credits_deducted": 1,
  "credits_remaining": 48
}
```

**Response (quando não deduz):**
```json
{
  "success": true,
  "message": "Ainda não atingiu o limite de tokens para dedução",
  "tokens_consumed": 45000,
  "tokens_remaining": 55000,
  "credits_to_deduct_next": 1
}
```
