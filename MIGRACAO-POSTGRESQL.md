# 🔄 Migração para PostgreSQL

## 📋 Resumo da Mudança

O sistema foi migrado para usar **dois bancos de dados separados**:

1. **Supabase (Auth)** - Apenas para autenticação e login de usuários
2. **PostgreSQL** - Para tracking de tokens, custos e deduções de créditos

## 🏗️ Nova Arquitetura

```
┌─────────────────────────────────────────────────┐
│                 FRONTEND                        │
│          (Next.js + React)                      │
└────────────┬────────────────────┬───────────────┘
             │                    │
             ▼                    ▼
   ┌─────────────────┐   ┌──────────────────┐
   │  Supabase Auth  │   │   PostgreSQL     │
   │  (Login/Logout) │   │  (Token Tracking)│
   └─────────────────┘   └──────────────────┘
         │                        │
         │                        ├─ token_usage
         │                        ├─ credit_deductions
         │                        ├─ user_usage_summary (view)
         │                        └─ user_credit_deductions_summary (view)
         │
         └─ auth.users
```

## 🔑 Variáveis de Ambiente

### Configuração no `.env.local`

```bash
# Supabase para Autenticação (Login)
NEXT_PUBLIC_SUPABASE_URL=https://ewjakuqlekatvykeehxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Banco de dados PostgreSQL para tracking
DATABASE_URL=postgresql+psycopg2://postgres:senha@host:porta/chatCCT?sslmode=disable
```

## 📦 Dependências Adicionadas

```json
{
  "dependencies": {
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "@types/pg": "^8.11.10"
  }
}
```

## 🗄️ Schema do Banco de Dados PostgreSQL

### Tabela: `token_usage`

Armazena cada requisição feita ao Gemini:

```sql
CREATE TABLE token_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    api_key_id VARCHAR(100),
    api_key_name VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_text TEXT,
    response_text TEXT,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,  -- Custo em R$
    duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `credit_deductions`

Registra quando créditos são deduzidos:

```sql
CREATE TABLE credit_deductions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    cost_accumulated NUMERIC(10, 6) DEFAULT 0,  -- R$ acumulado
    credits_deducted INTEGER NOT NULL DEFAULT 0,
    credits_remaining INTEGER,
    deducted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### View: `user_usage_summary`

Resumo de uso nos últimos 30 dias:

```sql
SELECT
    user_id,
    user_email,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    MAX(created_at) as last_request_at
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, user_email;
```

## 📝 Arquivos Modificados

### 1. [src/lib/postgres.ts](src/lib/postgres.ts) - NOVO
Cliente PostgreSQL com pool de conexões:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
});

export async function query(text: string, params?: any[]) {
    return await pool.query(text, params);
}
```

### 2. [src/lib/usage-tracking.ts](src/lib/usage-tracking.ts) - MODIFICADO
Agora salva no PostgreSQL em vez de Supabase:

```typescript
import { query } from './postgres';

export async function trackTokenUsage(data: TokenUsageData) {
    await query(`
        INSERT INTO token_usage (
            user_id, user_email, provider, model,
            prompt_tokens, completion_tokens, total_tokens,
            estimated_cost, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
        data.userId, data.userEmail, data.provider, data.model,
        data.promptTokens, data.completionTokens, data.totalTokens,
        estimatedCost, data.durationMs
    ]);
}
```

### 3. [src/lib/credit-checker.ts](src/lib/credit-checker.ts) - MODIFICADO
Busca dados do PostgreSQL:

```typescript
import { query } from './postgres';

export async function checkAndDeductCredits(userId: string, userEmail: string) {
    const result = await query(`
        SELECT estimated_cost, total_tokens
        FROM token_usage
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
    `, [userId]);

    const totalCost = result.rows.reduce(...);
    // ... lógica de dedução
}
```

### 4. [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
Usa Supabase **apenas** para autenticação:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Obter usuário autenticado
const { data: { user } } = await supabase.auth.getUser(authHeader);

// Tracking de tokens vai para PostgreSQL via trackTokenUsage()
```

## 🚀 Como Aplicar a Migration

### Passo 1: Configurar DATABASE_URL

Adicione no `.env.local`:

```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=disable
```

### Passo 2: Instalar dependências

```bash
npm install pg @types/pg
```

### Passo 3: Executar migration

```bash
node apply-postgres-migration.js
```

Você verá:

```
✅ Conectado ao PostgreSQL
✅ Migration aplicada com sucesso!
📊 Tabelas criadas:
  ✓ token_usage
  ✓ credit_deductions
📊 Views criadas:
  ✓ user_usage_summary
  ✓ user_credit_deductions_summary
🎉 Pronto! Banco de dados configurado com sucesso!
```

## 🧪 Como Testar

### 1. Testar build

```bash
npm run build
```

### 2. Testar localmente

```bash
npm run dev
```

### 3. Fazer login e enviar mensagem

1. Acesse http://localhost:3000
2. Faça login (usando Supabase Auth)
3. Envie uma mensagem no chat
4. Verifique logs do console:

```
[PostgreSQL] Query executed { text: 'INSERT INTO token_usage...', rows: 1 }
[Usage Tracking] ✅ Saved to PostgreSQL: { user: 'email@example.com', tokens: 1234, cost: '0.001234', model: 'gemini-2.5-flash' }
```

### 4. Verificar no banco de dados

```sql
-- Ver registros de uso
SELECT * FROM token_usage ORDER BY created_at DESC LIMIT 10;

-- Ver deduções de créditos
SELECT * FROM credit_deductions ORDER BY deducted_at DESC LIMIT 10;

-- Ver resumo por usuário
SELECT * FROM user_usage_summary;
```

## 📊 Queries Úteis

### Ver uso total de um usuário

```sql
SELECT
    user_email,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost_brl
FROM token_usage
WHERE user_id = 'user-id-aqui'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email;
```

### Ver modelos mais usados

```sql
SELECT
    model,
    COUNT(*) as requests,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost_brl
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY total_cost_brl DESC;
```

### Ver usuários com mais uso

```sql
SELECT
    user_email,
    COUNT(*) as requests,
    SUM(estimated_cost) as cost_brl,
    MAX(created_at) as last_request
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY cost_brl DESC
LIMIT 20;
```

## 🔒 Segurança

### Conexão SSL

Se o PostgreSQL usar SSL, ajuste a DATABASE_URL:

```bash
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

### Pool de Conexões

O sistema usa pool de conexões (max 20):
- Evita abrir/fechar conexão a cada query
- Melhor performance
- Gerenciamento automático

### Prepared Statements

Todas as queries usam parametrização ($1, $2, etc.):
- Previne SQL Injection
- Melhor performance (query é compilada uma vez)

## 🎯 Benefícios da Migração

✅ **Separação de responsabilidades**
- Supabase: Auth (especializado em autenticação)
- PostgreSQL: Dados de tracking (melhor controle)

✅ **Melhor performance**
- PostgreSQL direto é mais rápido que Supabase API
- Menos latência
- Pool de conexões otimizado

✅ **Mais flexibilidade**
- Queries SQL completas
- Views customizadas
- Triggers e stored procedures (se necessário)

✅ **Custos**
- PostgreSQL pode ser hospedado onde quiser
- Sem limites de API do Supabase

✅ **Backup e migração**
- Dados separados da auth
- Mais fácil fazer backup do tracking
- Pode migrar tracking sem afetar login

## ⚠️ Importante para Produção

1. **Adicionar DATABASE_URL** nas variáveis de ambiente do Easypanel

2. **Executar migration** no servidor de produção:
   ```bash
   node apply-postgres-migration.js
   ```

3. **Verificar conexão** - Nos logs deve aparecer:
   ```
   [PostgreSQL] Connected to database
   ```

4. **Monitorar** - Verificar se os inserts estão funcionando:
   ```
   [Usage Tracking] ✅ Saved to PostgreSQL
   ```

## 🆘 Troubleshooting

### Erro: "DATABASE_URL not configured"

**Solução**: Adicione DATABASE_URL no `.env.local` ou variáveis de ambiente

### Erro: "Connection refused"

**Solução**: Verifique se o PostgreSQL está acessível
- Host e porta corretos?
- Firewall liberado?
- PostgreSQL rodando?

### Erro: "relation 'token_usage' does not exist"

**Solução**: Execute a migration:
```bash
node apply-postgres-migration.js
```

### Erro: "password authentication failed"

**Solução**: Verifique credenciais no DATABASE_URL

## 📚 Referências

- **pg (node-postgres)**: https://node-postgres.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Connection Pooling**: https://node-postgres.com/features/pooling
- **Supabase Auth**: https://supabase.com/docs/guides/auth
