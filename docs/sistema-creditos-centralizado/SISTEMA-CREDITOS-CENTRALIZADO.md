# 💳 Sistema Centralizado de Créditos - Creditos_Ensinoplus

## 📋 Visão Geral

Sistema unificado para gerenciar créditos de **múltiplas plataformas** usando um banco de dados PostgreSQL centralizado.

### Plataformas Suportadas

1. **FGTS Fácil** (`fgts_facil`)
2. **Chat CCT** (`chat_cct`) - Este projeto
3. **Ponto Mágico** (`ponto_magico`)
4. **Contracheque Transparente** (`contracheque_transparente`)

### Regra de Dedução

**R$ 0,04 acumulado = 1 crédito deduzido**

(Configurável na tabela `credit_config`)

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    PLATAFORMAS                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │FGTS Fácil│  │Chat CCT  │  │Ponto Mag.│  │Contrach│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
└───────┼─────────────┼─────────────┼────────────┼────────┘
        │             │             │            │
        │             │             │            │
        └─────────────┴─────────────┴────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────┐
        │   PostgreSQL: Creditos_Ensinoplus       │
        │                                         │
        │  📊 Tabelas:                            │
        │   • platforms                           │
        │   • ai_models (preços dos modelos)      │
        │   • users_credits (saldo)               │
        │   • usage_tracking (uso por plataforma) │
        │   • cost_accumulation (acumulação R$)   │
        │   • credit_deductions (histórico)       │
        │   • credit_config (configurações)       │
        └─────────────────────────────────────────┘
```

## 📊 Estrutura do Banco de Dados

### Tabela: `platforms`

Cadastro de plataformas que usam o sistema.

```sql
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    platform_code VARCHAR(50) UNIQUE NOT NULL,  -- 'chat_cct', 'fgts_facil', etc
    platform_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);
```

**Plataformas cadastradas:**
- `fgts_facil` - FGTS Fácil
- `chat_cct` - Chat CCT
- `ponto_magico` - Ponto Mágico
- `contracheque_transparente` - Contracheque Transparente

### Tabela: `ai_models`

Modelos de IA com seus custos por milhão de tokens.

```sql
CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    model_code VARCHAR(100) UNIQUE NOT NULL,    -- 'gemini-2.5-flash'
    model_name VARCHAR(200) NOT NULL,
    provider VARCHAR(50) NOT NULL,              -- 'google', 'openai', etc

    -- Custos em USD por 1M tokens
    cost_input_usd NUMERIC(10, 6),
    cost_output_usd NUMERIC(10, 6),
    cost_audio_usd NUMERIC(10, 6),

    -- Custos em BRL por 1M tokens
    cost_input_brl NUMERIC(10, 6),
    cost_output_brl NUMERIC(10, 6),
    cost_audio_brl NUMERIC(10, 6),

    context_window INTEGER,
    is_active BOOLEAN DEFAULT true
);
```

**Modelo atual (Gemini 2.5 Flash):**
- Input: $0.30/M → R$ 1.50/M
- Output: $2.50/M → R$ 12.50/M
- Audio: $1.00/M → R$ 5.00/M
- Context: 1.05M tokens

### Tabela: `users_credits`

Saldo de créditos dos usuários (compartilhado entre plataformas).

```sql
CREATE TABLE users_credits (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255),

    credits_balance INTEGER NOT NULL DEFAULT 0,
    total_credits_purchased INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP
);
```

### Tabela: `usage_tracking`

Tracking de uso de IA por plataforma.

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

    request_duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: `cost_accumulation`

Acumulação de custos até atingir R$ 0,04 para deduzir 1 crédito.

```sql
CREATE TABLE cost_accumulation (
    id SERIAL PRIMARY KEY,

    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id),

    accumulated_cost_brl NUMERIC(10, 6) DEFAULT 0,
    accumulated_tokens INTEGER DEFAULT 0,

    status VARCHAR(50) DEFAULT 'accumulating', -- 'accumulating' ou 'deducted'

    deducted_at TIMESTAMP,
    credits_deducted INTEGER DEFAULT 0,

    -- Constraint: 1 acumulação ativa por usuário/plataforma
    UNIQUE(user_email, platform_id, status)
);
```

### Tabela: `credit_deductions`

Histórico de deduções de créditos.

```sql
CREATE TABLE credit_deductions (
    id SERIAL PRIMARY KEY,

    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id),

    cost_accumulated_brl NUMERIC(10, 6),
    tokens_accumulated INTEGER,

    credits_deducted INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,

    deducted_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: `credit_config`

Configurações do sistema (editável sem código).

```sql
CREATE TABLE credit_config (
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT
);
```

**Configurações atuais:**
- `cost_per_credit_brl` = `0.04` - R$ para deduzir 1 crédito
- `usd_to_brl_rate` = `5.0` - Taxa de conversão
- `min_credits_warning` = `10` - Aviso de saldo baixo

## 🔄 Fluxo de Funcionamento

### 1. Usuário usa a plataforma

```typescript
// Exemplo: Chat CCT
const response = await gemini.generateContent(prompt);
```

### 2. Sistema registra o uso

```typescript
import { trackUsage } from '@/lib/creditos-centralizados';

await trackUsage({
    userEmail: 'user@example.com',
    modelCode: 'gemini-2.5-flash',
    inputTokens: 1000,
    outputTokens: 500,
    audioTokens: 0,
    requestDurationMs: 2500,
    status: 'success'
});
```

**O que acontece:**
1. Busca `platform_id` de `chat_cct`
2. Busca `model_id` e preços de `gemini-2.5-flash`
3. Calcula custos:
   - Input: (1000 / 1M) × R$ 1.50 = R$ 0.0015
   - Output: (500 / 1M) × R$ 12.50 = R$ 0.00625
   - **Total: R$ 0.00775**
4. Insere em `usage_tracking`
5. Atualiza `cost_accumulation`:
   - `accumulated_cost_brl` += R$ 0.00775

### 3. Sistema verifica se deve deduzir créditos

```typescript
import { checkAndDeductCredits } from '@/lib/creditos-centralizados';

const result = await checkAndDeductCredits('user@example.com');

if (result.creditsDeducted) {
    console.log(`Deducted ${result.creditsDeducted} credits`);
    console.log(`Remaining: ${result.creditsBalance}`);
}
```

**Lógica:**
1. Busca `accumulated_cost_brl` do usuário
2. Calcula: `creditsToDeduct = Math.floor(accumulated_cost_brl / 0.04)`
3. Se `creditsToDeduct > 0`:
   - Deduz créditos em `users_credits`
   - Insere em `credit_deductions`
   - Marca acumulação como `'deducted'`
   - Cria nova acumulação zerada

**Exemplo:**
- Custo acumulado: R$ 0.087
- Créditos a deduzir: `Math.floor(0.087 / 0.04)` = **2 créditos**
- Custo restante: R$ 0.007 (continua acumulando)

## 📝 Como Integrar uma Nova Plataforma

### Passo 1: Registrar a plataforma

```sql
INSERT INTO platforms (platform_code, platform_name, description)
VALUES ('nova_plataforma', 'Nova Plataforma', 'Descrição da plataforma');
```

### Passo 2: Instalar dependência

```bash
npm install pg @types/pg
```

### Passo 3: Configurar ambiente

```bash
# .env
DATABASE_URL_CREDITOS=postgresql://user:pass@host:port/Creditos_Ensinoplus
```

### Passo 4: Usar a biblioteca

```typescript
import { trackUsage, checkAndDeductCredits } from '@/lib/creditos-centralizados';

// Após cada uso de IA
await trackUsage({
    userEmail: user.email,
    modelCode: 'gemini-2.5-flash',
    inputTokens: promptTokens,
    outputTokens: completionTokens,
    audioTokens: 0,
    requestDurationMs: duration,
    status: 'success'
});

// Verificar e deduzir créditos (chamado periodicamente ou após cada uso)
const result = await checkAndDeductCredits(user.email);
```

## 🔧 Implementação no Chat CCT

### Arquivo: [src/lib/creditos-centralizados.ts](src/lib/creditos-centralizados.ts)

Biblioteca principal com funções:
- `trackUsage()` - Registra uso de IA
- `checkAndDeductCredits()` - Verifica e deduz créditos
- `getUserCredits()` - Obtém saldo do usuário

### Arquivo: [src/lib/usage-tracking.ts](src/lib/usage-tracking.ts)

Modificado para enviar dados para dois lugares:
1. PostgreSQL local (`chatCCT`) - Histórico detalhado
2. PostgreSQL centralizado (`Creditos_Ensinoplus`) - Sistema de créditos

```typescript
export async function trackTokenUsage(data: TokenUsageData) {
    // 1. Salvar localmente (detalhado)
    await query(`INSERT INTO token_usage ...`);

    // 2. Salvar no sistema centralizado (para créditos)
    if (data.userEmail) {
        await trackCreditosUsage({
            userEmail: data.userEmail,
            modelCode: data.model,
            inputTokens: data.promptTokens,
            outputTokens: data.completionTokens,
            // ...
        });
    }
}
```

### Arquivo: [src/lib/credit-checker.ts](src/lib/credit-checker.ts)

Simplificado para usar o sistema centralizado:

```typescript
export async function checkAndDeductCredits(userId: string, userEmail: string) {
    // Delega para o sistema centralizado
    return await checkCentralized(userEmail);
}
```

## 📊 Queries Úteis

### Ver saldo de todos os usuários

```sql
SELECT * FROM users_with_credits ORDER BY credits_balance DESC;
```

### Ver uso por plataforma

```sql
SELECT
    p.platform_name,
    COUNT(*) as requests,
    SUM(u.total_cost_brl) as total_cost_brl
FROM usage_tracking u
JOIN platforms p ON u.platform_id = p.id
WHERE u.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.platform_name
ORDER BY total_cost_brl DESC;
```

### Ver custos acumulados pendentes

```sql
SELECT
    user_email,
    SUM(accumulated_cost_brl) as pending_cost,
    SUM(accumulated_tokens) as pending_tokens,
    FLOOR(SUM(accumulated_cost_brl) / 0.04) as credits_to_deduct
FROM cost_accumulation
WHERE status = 'accumulating'
GROUP BY user_email
HAVING SUM(accumulated_cost_brl) >= 0.04
ORDER BY pending_cost DESC;
```

### Ver histórico de deduções

```sql
SELECT
    cd.user_email,
    p.platform_name,
    cd.cost_accumulated_brl,
    cd.credits_deducted,
    cd.credits_remaining,
    cd.deducted_at
FROM credit_deductions cd
JOIN platforms p ON cd.platform_id = p.id
ORDER BY cd.deducted_at DESC
LIMIT 50;
```

### Ver modelos mais usados

```sql
SELECT * FROM model_usage_stats;
```

## 🔧 Manutenção

### Atualizar preço de um modelo

```sql
UPDATE ai_models
SET cost_input_brl = 2.0,
    cost_output_brl = 15.0,
    updated_at = NOW()
WHERE model_code = 'gemini-2.5-flash';
```

### Alterar regra de dedução (R$ 0,04 → R$ 0,05)

```sql
UPDATE credit_config
SET config_value = '0.05',
    updated_at = NOW()
WHERE config_key = 'cost_per_credit_brl';
```

**⚠️ Importante:** Após alterar, reinicie as aplicações para ler o novo valor.

### Adicionar créditos a um usuário

```sql
UPDATE users_credits
SET credits_balance = credits_balance + 100,
    total_credits_purchased = total_credits_purchased + 100,
    updated_at = NOW()
WHERE user_email = 'user@example.com';
```

### Adicionar novo modelo

```sql
INSERT INTO ai_models (
    model_code, model_name, provider,
    cost_input_usd, cost_output_usd,
    cost_input_brl, cost_output_brl,
    context_window
) VALUES (
    'gpt-4-turbo',
    'OpenAI GPT-4 Turbo',
    'openai',
    0.01,   -- $0.01/M
    0.03,   -- $0.03/M
    0.05,   -- R$ 0.05/M (0.01 * 5)
    0.15,   -- R$ 0.15/M (0.03 * 5)
    128000
);
```

## 📱 API PHP (Opcional)

O sistema pode continuar usando a API PHP existente para:
- Compra de créditos
- Gerenciamento de assinaturas
- Pagamentos

**Integração:**
```typescript
// Após dedução no sistema centralizado
const response = await fetch('https://ensinoplus.com.br/autocalc/api/sync_credits.php', {
    method: 'POST',
    body: JSON.stringify({
        email: userEmail,
        credits_used: creditsDeducted
    })
});
```

## 🎯 Benefícios

✅ **Centralizado**: Um único banco para todas as plataformas
✅ **Flexível**: Configurações podem ser alteradas sem código
✅ **Escalável**: Fácil adicionar novas plataformas
✅ **Transparente**: Histórico completo de uso e deduções
✅ **Preciso**: Cálculos baseados em custos reais dos modelos
✅ **Multi-modelo**: Suporta qualquer modelo de IA
✅ **Auditável**: Rastreamento completo por usuário e plataforma

## 🚀 Próximos Passos

1. ✅ Criar estrutura do banco (FEITO)
2. ✅ Integrar Chat CCT (FEITO)
3. ⏳ Integrar FGTS Fácil
4. ⏳ Integrar Ponto Mágico
5. ⏳ Integrar Contracheque Transparente
6. ⏳ Criar painel de administração
7. ⏳ Implementar alertas de saldo baixo
8. ⏳ Criar relatórios gerenciais

## 📚 Arquivos Criados

- [postgres-migrations/002_create_creditos_system.sql](postgres-migrations/002_create_creditos_system.sql) - Schema do banco
- [src/lib/creditos-centralizados.ts](src/lib/creditos-centralizados.ts) - Biblioteca principal
- [apply-creditos-migration.js](apply-creditos-migration.js) - Script de migration
- Este documento - Documentação completa
