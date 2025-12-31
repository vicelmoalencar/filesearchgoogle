# Sistema de Progressão e Dedução de Créditos

## Visão Geral

O sistema implementa um modelo de **acumulação progressiva de custos** onde os usuários consomem créditos baseados no uso real de tokens da API do Google Gemini. A dedução só ocorre quando o custo acumulado atinge um limite estabelecido no banco de dados 

---

## 📊 Conceitos Fundamentais


### 2. **Acumulação Progressiva**
- Os custos são **acumulados** até atingir o valor
- Quando o valor é atingido → **1 crédito é deduzido**
- O acúmulo é **contínuo** e **persistente** no banco de dados

---

## 🗄️ Estrutura do Banco de Dados



### **Banco: Creditos_Ensinoplus** (DATABASE_URL_CREDITOS)
Sistema centralizado de créditos compartilhado entre plataformas.

#### **Tabelas Principais:**

**1. platforms** - Plataformas que usam o sistema
```sql
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    platform_code VARCHAR(50) UNIQUE NOT NULL,  -- ex: 'chat_cct'
    platform_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**2. ai_models** - Modelos de IA e seus custos
```sql
CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,              -- 'google', 'openai', etc
    cost_per_million_input_brl NUMERIC(10, 6),  -- R$ por 1M tokens de entrada
    cost_per_million_output_brl NUMERIC(10, 6), -- R$ por 1M tokens de saída
    cost_per_million_audio_brl NUMERIC(10, 6),  -- R$ por 1M tokens de áudio
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exemplo: Gemini 2.5 Flash
INSERT INTO ai_models (model_name, provider, cost_per_million_input_brl, cost_per_million_output_brl)
VALUES ('Google Gemini 2.5 Flash', 'google', 1.50, 12.50);
```

**3. users_credits** - Saldo de créditos por usuário
```sql
CREATE TABLE users_credits (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    credits_balance INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**4. usage_tracking** - Registro detalhado de uso
```sql
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    platform_id INTEGER REFERENCES platforms(id),
    user_email VARCHAR(255) NOT NULL,
    model_id INTEGER REFERENCES ai_models(id),
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    audio_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER NOT NULL,
    cost_input_brl NUMERIC(10, 6),
    cost_output_brl NUMERIC(10, 6),
    cost_audio_brl NUMERIC(10, 6),
    total_cost_brl NUMERIC(10, 6),
    total_cost_usd NUMERIC(10, 6),
    request_duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    metadata JSONB,                              -- Dados extras (apiKeyId, provider, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**5. cost_accumulation** - Acúmulo de custos antes da dedução
```sql
CREATE TABLE cost_accumulation (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    accumulated_cost_brl NUMERIC(10, 6) NOT NULL DEFAULT 0,
    accumulated_tokens INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'accumulating',   -- 'accumulating' ou 'deducted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**6. credit_deductions** - Histórico de deduções
```sql
CREATE TABLE credit_deductions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    credits_deducted INTEGER NOT NULL,
    cost_accumulated_brl NUMERIC(10, 6),
    tokens_accumulated INTEGER,
    previous_balance INTEGER,
    new_balance INTEGER,
    deducted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**7. credit_config** - Configurações globais
```sql
CREATE TABLE credit_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value NUMERIC(10, 6) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuração padrão
INSERT INTO credit_config (config_key, config_value, description)
VALUES ('cost_per_credit_brl', 0.04, 'Custo em BRL necessário para deduzir 1 crédito');
```

---

## 🔄 Fluxo de Funcionamento

### **1. Usuário Faz upload de um arquivo**

```
Usuário → Chat Interface → POST /api/chat
```

**Arquivo:** `src/app/api/chat/route.ts`

```typescript
// 1. Verificar créditos antes de processar
const creditCheck = await checkCredits(user.email);
if (!creditCheck.hasCredits) {
  return NextResponse.json(
    { error: 'Créditos insuficientes', credits: creditCheck.balance },
    { status: 403 }
  );
}

// 2. Processar com Gemini
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: message }] }]
});

// 3. Obter contagem de tokens
const usageMetadata = result.response.usageMetadata;
const inputTokens = usageMetadata.promptTokenCount || 0;
const outputTokens = usageMetadata.candidatesTokenCount || 0;
const totalTokens = usageMetadata.totalTokenCount || 0;
```

### **2. Rastreamento de Uso (Tracking)**

**Arquivo:** `src/lib/creditos-centralizados.ts`

```typescript
export async function trackUsage(data: {
  userEmail: string;
  modelId: number;
  inputTokens: number;
  outputTokens: number;
  audioTokens?: number;
  metadata?: any;
}): Promise<void> {

  // 1. Buscar custo do modelo
  const modelResult = await creditosPool.query(
    'SELECT cost_per_million_input_brl, cost_per_million_output_brl FROM ai_models WHERE id = $1',
    [data.modelId]
  );

  const model = modelResult.rows[0];

  // 2. Calcular custos em BRL
  const costInput = (data.inputTokens / 1_000_000) * model.cost_per_million_input_brl;
  const costOutput = (data.outputTokens / 1_000_000) * model.cost_per_million_output_brl;
  const totalCost = costInput + costOutput;

  // 3. Registrar uso na tabela usage_tracking
  await creditosPool.query(
    `INSERT INTO usage_tracking (
      platform_id, user_email, model_id,
      input_tokens, output_tokens, total_tokens,
      cost_input_brl, cost_output_brl, total_cost_brl,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      platformId,
      data.userEmail,
      data.modelId,
      data.inputTokens,
      data.outputTokens,
      data.inputTokens + data.outputTokens,
      costInput,
      costOutput,
      totalCost,
      data.metadata
    ]
  );

  // 4. Acumular custo
  await accumulateCost(data.userEmail, totalCost, data.inputTokens + data.outputTokens);
}
```

### **3. Acumulação de Custos**

```typescript
async function accumulateCost(
  userEmail: string,
  cost: number,
  tokens: number
): Promise<void> {

  // Buscar ou criar registro de acumulação
  const existingResult = await creditosPool.query(
    `SELECT * FROM cost_accumulation
     WHERE user_email = $1 AND status = 'accumulating'`,
    [userEmail]
  );

  if (existingResult.rows.length > 0) {
    // Atualizar acumulação existente
    const current = existingResult.rows[0];
    const newCost = parseFloat(current.accumulated_cost_brl) + cost;
    const newTokens = current.accumulated_tokens + tokens;

    await creditosPool.query(
      `UPDATE cost_accumulation
       SET accumulated_cost_brl = $1,
           accumulated_tokens = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [newCost, newTokens, current.id]
    );
  } else {
    // Criar nova acumulação
    await creditosPool.query(
      `INSERT INTO cost_accumulation (user_email, accumulated_cost_brl, accumulated_tokens)
       VALUES ($1, $2, $3)`,
      [userEmail, cost, tokens]
    );
  }
}
```

### **4. Verificação e Dedução Automática**

**Executado após cada tracking:**

```typescript
export async function checkAndDeductCredits(userEmail: string): Promise<{
  success: boolean;
  creditsDeducted: number;
  creditsBalance: number;
  message: string;
}> {

  // 1. Buscar configuração (quanto custa 1 crédito)
  const config = await getConfig();
  const costPerCredit = config.costPerCredit; // R$ 0.04

  // 2. Buscar acumulação atual
  const accumResult = await creditosPool.query(
    `SELECT * FROM cost_accumulation
     WHERE user_email = $1 AND status = 'accumulating'
     ORDER BY created_at DESC LIMIT 1`,
    [userEmail]
  );

  if (accumResult.rows.length === 0) {
    return {
      success: true,
      creditsDeducted: 0,
      creditsBalance: await getCurrentBalance(userEmail),
      message: 'Nenhum custo acumulado'
    };
  }

  const accumulation = accumResult.rows[0];
  const accumulatedCost = parseFloat(accumulation.accumulated_cost_brl);

  // 3. Verificar se atingiu o limite
  if (accumulatedCost < costPerCredit) {
    return {
      success: true,
      creditsDeducted: 0,
      creditsBalance: await getCurrentBalance(userEmail),
      message: `Acumulando... R$ ${accumulatedCost.toFixed(6)} de R$ ${costPerCredit}`
    };
  }

  // 4. DEDUZIR CRÉDITOS
  const creditsToDeduct = Math.floor(accumulatedCost / costPerCredit);

  // 4.1. Buscar saldo atual
  const balanceResult = await creditosPool.query(
    'SELECT credits_balance FROM users_credits WHERE user_email = $1',
    [userEmail]
  );

  if (balanceResult.rows.length === 0) {
    throw new Error('Usuário não encontrado');
  }

  const currentBalance = balanceResult.rows[0].credits_balance;
  const newBalance = currentBalance - creditsToDeduct;

  if (newBalance < 0) {
    throw new Error('Saldo insuficiente para dedução');
  }

  // 4.2. Atualizar saldo
  await creditosPool.query(
    'UPDATE users_credits SET credits_balance = $1, last_updated = NOW() WHERE user_email = $2',
    [newBalance, userEmail]
  );

  // 4.3. Registrar dedução no histórico
  await creditosPool.query(
    `INSERT INTO credit_deductions (
      user_email, credits_deducted, cost_accumulated_brl,
      tokens_accumulated, previous_balance, new_balance
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userEmail,
      creditsToDeduct,
      accumulatedCost,
      accumulation.accumulated_tokens,
      currentBalance,
      newBalance
    ]
  );

  // 4.4. DELETAR acumulação (não marcar como 'deducted')
  await creditosPool.query(
    'DELETE FROM cost_accumulation WHERE id = $1',
    [accumulation.id]
  );

  // 4.5. Sincronizar com API PHP (fallback)
  await syncWithPhpApi(userEmail, newBalance);

  return {
    success: true,
    creditsDeducted: creditsToDeduct,
    creditsBalance: newBalance,
    message: `${creditsToDeduct} crédito(s) deduzido(s). Novo saldo: ${newBalance}`
  };
}
```

---

## 📈 Cálculo de Progresso

### **API de Progresso**

**Endpoint:** `GET /api/credits-progress`

```typescript
export async function GET(request: NextRequest) {
  const { userEmail } = await request.json();

  // Buscar configuração
  const config = await getConfig();
  const costPerCredit = config.costPerCredit; // R$ 0.04

  // Buscar acumulação atual
  const accumResult = await creditosPool.query(
    `SELECT * FROM cost_accumulation
     WHERE user_email = $1 AND status = 'accumulating'`,
    [userEmail]
  );

  if (accumResult.rows.length === 0) {
    return NextResponse.json({
      success: true,
      accumulatedCost: 0,
      accumulatedTokens: 0,
      costPerCredit,
      costRemaining: costPerCredit,
      percentage: 0,
      isReady: false
    });
  }

  const accumulation = accumResult.rows[0];
  const accumulatedCost = parseFloat(accumulation.accumulated_cost_brl);
  const percentage = Math.min(Math.round((accumulatedCost / costPerCredit) * 100), 100);

  return NextResponse.json({
    success: true,
    accumulatedCost,
    accumulatedTokens: accumulation.accumulated_tokens,
    costPerCredit,
    costRemaining: Math.max(0, costPerCredit - accumulatedCost),
    percentage,
    isReady: accumulatedCost >= costPerCredit
  });
}
```

### **Visualização no Frontend**

**Componente:** `src/components/CreditsDisplay.tsx`

```tsx
// Busca progresso a cada 30 segundos
const progressResponse = await fetch('/api/credits-progress', {
  method: 'POST',
  body: JSON.stringify({ email: user.email })
});

const progressData = await progressResponse.json();

// Exibe barra de progresso
{progress && progress.percentage > 0 && (
  <div className="w-full h-1 rounded-full overflow-hidden mt-2">
    <div
      className={`h-full transition-all ${
        progress.isReady
          ? 'bg-gradient-to-r from-green-500 to-green-400'  // >= 100%
          : 'bg-gradient-to-r from-blue-500 to-blue-400'    // < 100%
      }`}
      style={{ width: `${progress.percentage}%` }}
    />
  </div>
)}
```

---

## 💰 Exemplo Prático

### **Cenário: Usuário com 10 créditos**

#### **Interação 1:**
- Tokens: 500 input + 1000 output = 1500 total
- Custo: (500/1M × R$1.50) + (1000/1M × R$12.50) = R$ 0.0075 + R$ 0.0125 = **R$ 0.020**
- **Acumulado:** R$ 0.020 (50% do limite)
- **Créditos:** 10 (sem dedução)

#### **Interação 2:**
- Tokens: 300 input + 800 output = 1100 total
- Custo: (300/1M × R$1.50) + (800/1M × R$12.50) = R$ 0.00045 + R$ 0.010 = **R$ 0.01045**
- **Acumulado:** R$ 0.020 + R$ 0.01045 = **R$ 0.03045** (76% do limite)
- **Créditos:** 10 (sem dedução)

#### **Interação 3:**
- Tokens: 200 input + 600 output = 800 total
- Custo: (200/1M × R$1.50) + (600/1M × R$12.50) = R$ 0.0003 + R$ 0.0075 = **R$ 0.0078**
- **Acumulado:** R$ 0.03045 + R$ 0.0078 = **R$ 0.03825** (95% do limite)
- **Créditos:** 10 (sem dedução)

#### **Interação 4:**
- Tokens: 100 input + 400 output = 500 total
- Custo: (100/1M × R$1.50) + (400/1M × R$12.50) = R$ 0.00015 + R$ 0.005 = **R$ 0.00515**
- **Acumulado:** R$ 0.03825 + R$ 0.00515 = **R$ 0.0434**
- **Atingiu R$ 0.04!** ✅
- **Dedução:** 1 crédito (R$ 0.0434 ÷ R$ 0.04 = 1 crédito)
- **Créditos:** 10 - 1 = **9 créditos**
- **Acumulação:** DELETADA (volta a zero para próximo ciclo)

---

## 🔍 Queries Úteis

### **1. Verificar Acumulação Atual**
```sql
SELECT
  user_email,
  accumulated_cost_brl,
  accumulated_tokens,
  status,
  (accumulated_cost_brl / 0.04 * 100) as percentage,
  created_at,
  updated_at
FROM cost_accumulation
WHERE status = 'accumulating'
ORDER BY updated_at DESC;
```

### **2. Histórico de Deduções**
```sql
SELECT
  user_email,
  credits_deducted,
  cost_accumulated_brl,
  tokens_accumulated,
  previous_balance,
  new_balance,
  deducted_at
FROM credit_deductions
ORDER BY deducted_at DESC
LIMIT 20;
```

### **3. Uso por Usuário (Últimos 30 dias)**
```sql
SELECT
  ut.user_email,
  COUNT(*) as total_requests,
  SUM(ut.total_tokens) as total_tokens,
  SUM(ut.total_cost_brl) as total_cost_brl,
  uc.credits_balance as current_balance
FROM usage_tracking ut
LEFT JOIN users_credits uc ON ut.user_email = uc.user_email
WHERE ut.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ut.user_email, uc.credits_balance
ORDER BY total_cost_brl DESC;
```

### **4. Saldo de Créditos por Usuário**
```sql
SELECT
  user_email,
  credits_balance,
  last_updated
FROM users_credits
ORDER BY credits_balance ASC;
```

---

## ⚙️ Configuração e Manutenção

### **Alterar Custo por Crédito**
```sql
UPDATE credit_config
SET config_value = 0.05,  -- Novo valor: R$ 0.05
    updated_at = NOW()
WHERE config_key = 'cost_per_credit_brl';
```

### **Adicionar Créditos Manualmente**
```sql
UPDATE users_credits
SET credits_balance = credits_balance + 100,
    last_updated = NOW()
WHERE user_email = 'usuario@exemplo.com';
```

### **Limpar Acumulação Presa**
```sql
-- Ver acumulações antigas (>7 dias sem atualização)
SELECT * FROM cost_accumulation
WHERE status = 'accumulating'
  AND updated_at < NOW() - INTERVAL '7 days';

-- Deletar acumulações presas
DELETE FROM cost_accumulation
WHERE status = 'accumulating'
  AND updated_at < NOW() - INTERVAL '7 days';
```

---

## 🚨 Troubleshooting

### **Problema: Créditos não estão sendo deduzidos**

**Verificação 1:** Checar se há acumulação ativa
```sql
SELECT * FROM cost_accumulation
WHERE user_email = 'usuario@exemplo.com'
  AND status = 'accumulating';
```

**Verificação 2:** Ver logs de tracking
```sql
SELECT * FROM usage_tracking
WHERE user_email = 'usuario@exemplo.com'
ORDER BY created_at DESC
LIMIT 5;
```

**Verificação 3:** Verificar configuração
```sql
SELECT * FROM credit_config
WHERE config_key = 'cost_per_credit_brl';
```

### **Problema: Barra de progresso não aparece**

1. Verificar se a API `/api/credits-progress` está respondendo
2. Checar logs do navegador (F12 → Console)
3. Verificar se `progress.percentage > 0`

---

## 📝 Resumo

| Aspecto | Detalhe |
|---------|---------|
| **Custo por Crédito** | pega no banco |
| **Modelo de IA** | Google Gemini 2.5 Flash |
| **Custo Input** | R$ 1,50 por 1M tokens |
| **Custo Output** | R$ 12,50 por 1M tokens |
| **Acumulação** | Contínua até R$ 0,04 |
| **Dedução** | Automática ao atingir limite |
| **Persistência** | PostgreSQL (Creditos_Ensinoplus) |
| **Atualização UI** | A cada 30 segundos |
| **Sincronização** | PostgreSQL + API PHP (fallback) |

---

## 🔗 Arquivos Relacionados

- `src/lib/creditos-centralizados.ts` - Lógica de tracking e dedução
- `src/app/api/credits-progress/route.ts` - API de progresso
- `src/components/CreditsDisplay.tsx` - Componente visual
- `src/app/api/chat/route.ts` - Endpoint principal de chat
- `postgres-migrations/002_create_creditos_system.sql` - Schema do banco

---

**Versão:** 1.0
**Última Atualização:** 31/12/2025
**Autor:** Sistema Chat CCT
