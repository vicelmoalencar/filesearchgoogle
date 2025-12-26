# ⚙️ Configuração do Sistema de Créditos

## 📊 Configuração Atual

### Taxa de Conversão
- **20.000 tokens = 1 crédito**
- Configurado em: [src/app/api/check-credits/route.ts:10](src/app/api/check-credits/route.ts#L10)

### Bloqueio de Uso
- **Usuários com saldo ≤ 0 não podem fazer perguntas**
- Verificação implementada em: [src/app/api/chat/route.ts:41-65](src/app/api/chat/route.ts#L41-L65)

---

## 💰 Custos com Gemini 2.5 Flash (API Paga)

| Tokens | Custo Real (USD) | Custo Real (BRL) | Créditos Deduzidos |
|--------|------------------|------------------|--------------------|
| 20.000 | ~$0.0042 | ~R$ 0,023 | 1 |
| 100.000 | ~$0.021 | ~R$ 0,12 | 5 |
| 500.000 | ~$0.105 | ~R$ 0,58 | 25 |
| 1.000.000 | ~$0.210 | ~R$ 1,16 | 50 |

**Preços do Gemini 2.5 Flash (Vertex AI):**
- Input: $0.075 por 1M tokens
- Output: $0.30 por 1M tokens
- Estimativa: 40% input / 60% output

---

## 🔄 Como Funciona

### 1. Verificação Antes da Pergunta
Quando o usuário envia uma pergunta:

```typescript
// Verifica saldo de créditos
const response = await fetch('.../get_credits_by_email.php', {
  method: 'POST',
  body: JSON.stringify({ email: userEmail })
});

const data = await response.json();

// Se saldo <= 0, bloqueia
if (data.credits <= 0) {
  return NextResponse.json({
    error: "Você não possui créditos suficientes...",
    credits: data.credits
  }, { status: 403 });
}
```

### 2. Registro de Tokens Consumidos
Após a resposta da IA:

```typescript
trackTokenUsage({
  userId,
  userEmail,
  promptTokens,      // tokens da pergunta
  completionTokens,  // tokens da resposta
  totalTokens,       // soma total
  estimatedCost      // custo em USD
});
```

Dados salvos na tabela `token_usage` do Supabase.

### 3. Verificação de Dedução (Background)
Sistema chama automaticamente `/api/check-credits`:

```typescript
// Soma todos os tokens dos últimos 30 dias
const totalTokens = await supabase
  .from('token_usage')
  .select('total_tokens')
  .eq('user_id', userId)
  .sum();

// Calcula créditos a deduzir
const creditsToDeduct = Math.floor(totalTokens / 20000);

// Se atingiu 20.000+ tokens, deduz 1 crédito
if (creditsToDeduct > 0) {
  // Chama API PHP para deduzir no MySQL
  await fetch('.../deduct_credits_by_email.php', {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      credits: creditsToDeduct
    })
  });

  // Registra no Supabase (tabela credit_deductions)
  await supabase.from('credit_deductions').insert({...});
}
```

---

## 🚨 Mensagens de Erro

### Quando Saldo = 0 ou Negativo

**No chat:**
```
❌ Você não possui créditos suficientes para fazer perguntas.
Por favor, recarregue seus créditos.

Seu saldo atual: 0 créditos.

Para continuar usando o sistema, você precisa recarregar seus créditos.
```

---

## 📝 Exemplo Prático

### Cenário: Usuário com 50 créditos

| Ação | Tokens | Total Acumulado | Créditos Deduzidos | Saldo |
|------|--------|-----------------|--------------------| ------|
| Início | 0 | 0 | 0 | 50 |
| Pergunta 1 | 3.000 | 3.000 | 0 | 50 |
| Pergunta 2 | 5.500 | 8.500 | 0 | 50 |
| Pergunta 3 | 7.200 | 15.700 | 0 | 50 |
| Pergunta 4 | 6.800 | **22.500** | **1** ✅ | **49** |
| Pergunta 5 | 4.200 | 26.700 | 1 | 49 |
| ... | ... | ... | ... | ... |
| Pergunta 20 | 3.500 | **42.000** | **2** ✅ | **48** |

**Quando atingir saldo 0:**
- ❌ Próxima pergunta será bloqueada
- 💬 Sistema exibe mensagem de créditos insuficientes

---

## 🔧 Alterando a Configuração

### Mudar Taxa de Conversão

Edite [src/app/api/check-credits/route.ts:10](src/app/api/check-credits/route.ts#L10):

```typescript
// Opções comuns:
const TOKENS_PER_CREDIT = 10000;  // 10k tokens = 1 crédito (mais rigoroso)
const TOKENS_PER_CREDIT = 20000;  // 20k tokens = 1 crédito (atual)
const TOKENS_PER_CREDIT = 50000;  // 50k tokens = 1 crédito (mais permissivo)
```

### Desabilitar Bloqueio por Saldo

Comente o código em [src/app/api/chat/route.ts:41-65](src/app/api/chat/route.ts#L41-L65):

```typescript
// Comentar estas linhas para desabilitar verificação
/*
if (userEmail) {
  try {
    const creditsResponse = await fetch(...);
    // ...
  } catch (err) { ... }
}
*/
```

---

## 📊 Monitoramento

### Verificar Tokens Consumidos por Usuário

**SQL no Supabase:**
```sql
SELECT
  user_email,
  SUM(total_tokens) as total,
  SUM(total_tokens) / 20000.0 as credits_equivalent
FROM token_usage
WHERE user_email = 'exemplo@email.com'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email;
```

### Ver Histórico de Deduções

```sql
SELECT * FROM credit_deductions
WHERE user_email = 'exemplo@email.com'
ORDER BY deducted_at DESC;
```

### Ver Próxima Dedução

```sql
SELECT
  user_email,
  SUM(total_tokens) as current_tokens,
  20000 - (SUM(total_tokens) % 20000) as tokens_remaining
FROM token_usage
WHERE user_email = 'exemplo@email.com'
GROUP BY user_email;
```

---

## ✅ Checklist de Implementação

- [x] Taxa de conversão: 20.000 tokens = 1 crédito
- [x] Bloqueio de perguntas quando saldo ≤ 0
- [x] Mensagem de erro personalizada no chat
- [x] Verificação de saldo antes de processar pergunta
- [x] Dedução automática em background
- [x] Registro no Supabase (token_usage + credit_deductions)
- [x] Sincronização com MySQL via API PHP

---

## 🧪 Testando o Sistema

1. **Faça perguntas no chat** para acumular tokens
2. **Verifique no Supabase** se está registrando em `token_usage`
3. **Aguarde atingir 20.000 tokens** para ver dedução automática
4. **Confira em `credit_deductions`** se salvou o registro
5. **Verifique no MySQL** se o saldo foi reduzido
6. **Teste com saldo zero** para ver bloqueio funcionando

---

**Última atualização:** 2025-12-26
