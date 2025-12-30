# Sistema de Créditos Centralizados

Sistema unificado de gerenciamento de créditos para múltiplas plataformas, com tracking de uso de tokens e dedução automática de créditos.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [APIs](#apis)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema centralizado de créditos permite:

- ✅ **Tracking unificado** de uso de tokens/custos em múltiplas plataformas
- ✅ **Acumulação automática** de custos por usuário
- ✅ **Dedução automática** de créditos quando atinge o valor mínimo (padrão: R$ 0.05 = 1 crédito)
- ✅ **Sincronização dual**: PostgreSQL (tracking) + MySQL (saldo real via API PHP)
- ✅ **Multi-plataforma**: Suporta várias aplicações usando o mesmo pool de créditos
- ✅ **Histórico completo** de deduções e uso

---

## 🏗️ Arquitetura

### Bancos de Dados

#### PostgreSQL (Tracking e Acumulação)
- **Database**: `Creditos_Ensinoplus` (separado do banco principal)
- **Tabelas**:
  - `platforms`: Registro de plataformas
  - `users_credits`: Saldo local (cache/backup)
  - `cost_accumulation`: Acumulação em tempo real
  - `credit_deductions`: Histórico de deduções
  - `usage_tracking`: Histórico detalhado de uso

#### MySQL (Saldo Real)
- **API PHP**: Sistema externo que gerencia o saldo real
- **Endpoints**:
  - `get_credits_by_email.php`: Consultar saldo
  - `deduct_credits_by_email.php`: Deduzir créditos

### Fluxo de Dados

```
┌─────────────────┐
│   Usuário faz   │
│   uma pergunta  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  trackTokenUsage()              │
│  - Salva no PostgreSQL          │
│  - Estima custo em R$           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  trackCreditosUsage()           │
│  - Registra em usage_tracking   │
│  - Acumula em cost_accumulation │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  checkAndDeductCredits()        │
│  - Verifica se atingiu R$ 0.05  │
│  - Deduz de PostgreSQL          │
│  - Sincroniza com API PHP       │
│  - Deleta acumulação            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API PHP deduct_credits_by_      │
│  email.php                      │
│  - Atualiza saldo real no MySQL │
└─────────────────────────────────┘
```

---

## 📦 Instalação

### 1. Configurar Variáveis de Ambiente

No arquivo `.env.local`:

```bash
# PostgreSQL - Banco Principal (token_usage)
DATABASE_URL="postgresql://user:pass@host:port/database?sslmode=require"

# PostgreSQL - Banco de Créditos (separado)
DATABASE_URL_CREDITOS="postgresql+psycopg2://user:pass@host:port/Creditos_Ensinoplus?sslmode=require"

# API PHP para saldo real
PHP_CREDITS_API_URL="https://suaapi.com/api"
```

### 2. Criar Tabelas no PostgreSQL

Execute o script SQL para criar as tabelas necessárias:

```sql
-- Criar database separado
CREATE DATABASE "Creditos_Ensinoplus";

-- Conectar ao database
\c Creditos_Ensinoplus

-- 1. Tabela de plataformas
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    platform_code VARCHAR(50) UNIQUE NOT NULL,
    platform_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de créditos dos usuários
CREATE TABLE users_credits (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    credits_balance INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP
);

-- 3. Tabela de acumulação de custos
CREATE TABLE cost_accumulation (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id),
    accumulated_cost_brl DECIMAL(10, 6) DEFAULT 0,
    accumulated_tokens INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'accumulating',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deducted_at TIMESTAMP,
    credits_deducted INTEGER,
    UNIQUE (user_email, platform_id, status)
);

-- 4. Tabela de deduções de créditos
CREATE TABLE credit_deductions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id),
    cost_accumulated_brl DECIMAL(10, 6) NOT NULL,
    tokens_accumulated INTEGER NOT NULL,
    credits_deducted INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    deducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de tracking de uso
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    platform_id INTEGER REFERENCES platforms(id),
    model_code VARCHAR(100) NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    audio_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens + audio_tokens) STORED,
    cost_brl DECIMAL(10, 6) NOT NULL,
    request_duration_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de configuração
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração padrão
INSERT INTO config (key, value, description) VALUES
('cost_per_credit_brl', '0.05', 'Custo em R$ necessário para deduzir 1 crédito');

-- Registrar sua plataforma (exemplo)
INSERT INTO platforms (platform_code, platform_name) VALUES
('filesearch', 'File Search Google');
```

### 3. Instalar Dependências

```bash
npm install pg
```

---

## ⚙️ Configuração

### 1. Configurar Pool de Conexão

No arquivo `src/lib/creditos-centralizados.ts`, o pool já está configurado:

```typescript
export const creditosPool = new Pool({
    connectionString: process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://'),
    ssl: process.env.DATABASE_URL_CREDITOS?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

### 2. Registrar Nova Plataforma

Execute no PostgreSQL:

```sql
INSERT INTO platforms (platform_code, platform_name) VALUES
('sua_plataforma', 'Nome da Sua Plataforma');
```

### 3. Configurar Custo por Crédito

Valor padrão é R$ 0.05 = 1 crédito. Para alterar:

```sql
UPDATE config SET value = '0.10' WHERE key = 'cost_per_credit_brl';
```

---

## 🚀 Uso

### Integração Básica

#### 1. Importar Funções

```typescript
import { trackUsage, checkAndDeductCredits } from '@/lib/creditos-centralizados';
```

#### 2. Registrar Uso de Tokens

```typescript
// Após uma requisição de IA
await trackUsage({
    userEmail: 'usuario@email.com',
    modelCode: 'gemini-2.5-flash',
    inputTokens: 1500,
    outputTokens: 800,
    audioTokens: 0,
    requestDurationMs: 2500,
    status: 'success',
    metadata: {
        apiKeyId: 'default',
        provider: 'google'
    }
});
```

#### 3. Verificar e Deduzir Créditos

```typescript
// Após registrar uso
const result = await checkAndDeductCredits('usuario@email.com');

if (result.creditsDeducted) {
    console.log(`✅ Deduzido ${result.creditsDeducted} crédito(s)`);
    console.log(`Saldo restante: ${result.creditsBalance}`);
}
```

### Exemplo Completo (Next.js API Route)

```typescript
import { trackTokenUsage } from '@/lib/usage-tracking';

export async function POST(request: NextRequest) {
    const { userEmail } = await request.json();

    // ... processar requisição de IA ...

    // Registrar uso (já chama checkAndDeductCredits internamente)
    await trackTokenUsage({
        userId: userId,
        userEmail: userEmail,
        apiKeyId: 'default',
        provider: 'google',
        model: 'gemini-2.5-flash',
        promptTokens: 1500,
        completionTokens: 800,
        totalTokens: 2300,
        durationMs: 2500,
        status: 'success'
    });

    return NextResponse.json({ response: aiResponse });
}
```

---

## 📡 APIs

### Endpoints Disponíveis

#### GET/POST `/api/credits-progress`
Consulta o progresso de acumulação do usuário.

**Resposta**:
```json
{
    "success": true,
    "accumulatedCost": 0.035,
    "accumulatedTokens": 3400,
    "costPerCredit": 0.05,
    "costRemaining": 0.015,
    "percentage": 70,
    "creditsBalance": 978
}
```

#### POST `/api/credits-cleanup`
Limpa acumulações presas (troubleshooting).

**Body**:
```json
{
    "email": "usuario@email.com",
    "action": "delete-active"
}
```

#### POST `/api/credits-debug`
Testa a dedução manualmente (debug).

**Body**:
```json
{
    "email": "usuario@email.com"
}
```

---

## 🔧 Troubleshooting

### Problema: Créditos não deduzem em 100%

**Sintoma**: Acumulação atinge 100% mas créditos não são deduzidos.

**Solução**: Verificar logs do servidor para identificar o erro específico.

### Problema: Erro de constraint duplicada

**Sintoma**:
```
duplicate key value violates unique constraint "cost_accumulation_user_email_platform_id_status_key"
```

**Solução**: Limpar acumulação presa usando o botão "🧹 Limpar Acumulação Presa" ou via API:

```bash
curl -X POST https://seusite.com/api/credits-cleanup \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@email.com","action":"delete-active"}'
```

### Problema: Saldo diferente entre PostgreSQL e MySQL

**Sintoma**: Saldo mostrado na UI não corresponde ao saldo real.

**Causa**: PostgreSQL é apenas cache. O MySQL (via API PHP) é a fonte da verdade.

**Solução**: O sistema sempre consulta a API PHP para o saldo real. Se houver divergência, a API PHP prevalece.

### Scripts de Diagnóstico

#### Verificar Acumulações

```bash
node check-accumulations.js
```

#### Deletar Acumulação Presa

```bash
node delete-accumulation.js
```

#### Testar API PHP

```bash
node test-php-api.js
```

---

## 📊 Tabelas de Preços

### Modelos Suportados

| Modelo | Input (R$/1M tokens) | Output (R$/1M tokens) |
|--------|---------------------|----------------------|
| gemini-2.5-flash | 1.83 | 15.29 |
| gemini-2.0-flash-exp | 0.00 | 0.00 |
| gemini-pro-1.5 | 12.50 | 50.00 |
| claude-3.5-sonnet | 15.00 | 75.00 |
| gpt-4-turbo | 50.00 | 150.00 |

### Cálculo de Custo

```typescript
const promptCost = (promptTokens / 1_000_000) * modelPricing.prompt;
const completionCost = (completionTokens / 1_000_000) * modelPricing.completion;
const totalCost = promptCost + completionCost;
```

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca expor credenciais**: Use variáveis de ambiente
2. **SSL obrigatório**: Sempre use `sslmode=require` em produção
3. **Validar email**: Sempre validar email do usuário antes de processar
4. **Rate limiting**: Implementar limite de requisições por usuário
5. **Logs seguros**: Não logar informações sensíveis (senhas, tokens de API)

### Proteção contra Fraude

```typescript
// Verificar saldo ANTES de processar
const creditsResponse = await fetch('API_URL/get_credits_by_email.php', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail })
});

if (creditsData.credits <= 0) {
    return NextResponse.json({
        error: "Créditos insuficientes"
    }, { status: 403 });
}
```

---

## 📈 Monitoramento

### Queries Úteis

#### Total de Créditos Deduzidos por Usuário

```sql
SELECT
    user_email,
    SUM(credits_deducted) as total_credits,
    COUNT(*) as num_deductions
FROM credit_deductions
WHERE deducted_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY total_credits DESC;
```

#### Uso por Modelo

```sql
SELECT
    model_code,
    COUNT(*) as requests,
    SUM(total_tokens) as total_tokens,
    SUM(cost_brl) as total_cost
FROM usage_tracking
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY model_code
ORDER BY total_cost DESC;
```

#### Acumulações Ativas

```sql
SELECT
    user_email,
    accumulated_cost_brl,
    accumulated_tokens,
    created_at
FROM cost_accumulation
WHERE status = 'accumulating'
ORDER BY accumulated_cost_brl DESC;
```

---

## 🌐 Integração com Outras Plataformas

### Passo a Passo

1. **Registrar Plataforma**:
```sql
INSERT INTO platforms (platform_code, platform_name) VALUES
('minha_app', 'Minha Aplicação');
```

2. **Copiar Arquivos**:
   - `src/lib/creditos-centralizados.ts`
   - `src/lib/usage-tracking.ts`
   - `src/lib/postgres.ts`

3. **Atualizar `PLATFORM_CODE`**:
```typescript
const PLATFORM_CODE = 'minha_app'; // Alterar para o código da sua plataforma
```

4. **Usar as Funções**:
```typescript
import { trackUsage, checkAndDeductCredits } from './creditos-centralizados';

// Após processar requisição
await trackUsage({ userEmail, modelCode, inputTokens, outputTokens });
const result = await checkAndDeductCredits(userEmail);
```

5. **Configurar UI** (opcional):
   - Copiar `src/components/CreditsDisplay.tsx`
   - Adicionar ao layout da aplicação

---

## �� Changelog

### v2.0.0 (2025-01-30)
- ✅ **FIX**: Corrigido erro de constraint duplicada ao deduzir
- ✅ **CHANGE**: Deletar acumulação em vez de UPDATE para 'deducted'
- ✅ **FEATURE**: Logs detalhados para debugging
- ✅ **FEATURE**: API de cleanup de acumulações presas

### v1.0.0 (2025-01-28)
- ✅ Migração completa para PostgreSQL separado
- ✅ Sincronização dual com MySQL via API PHP
- ✅ Sistema de acumulação automática
- ✅ Dedução automática de créditos

---

## 📞 Suporte

Para questões ou problemas:

1. Verificar [Troubleshooting](#troubleshooting)
2. Consultar logs do servidor
3. Usar scripts de diagnóstico
4. Verificar configuração das variáveis de ambiente

---

## 📄 Licença

Este sistema foi desenvolvido para uso interno da Ensino Plus.

---

**Desenvolvido com ❤️ para gerenciar créditos de forma eficiente e escalável**
