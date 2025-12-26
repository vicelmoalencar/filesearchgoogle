# Supabase Database Setup

Este diretório contém as migrações SQL para configurar o banco de dados do projeto.

## Como aplicar as migrações

### 1. Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `migrations/create_usage_tracking.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter`

### 2. Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Link com seu projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplicar migrações
supabase db push
```

## Estrutura da Tabela `token_usage`

A tabela registra cada interação do usuário com a IA:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único do registro |
| `user_id` | UUID | ID do usuário (FK para auth.users) |
| `user_email` | TEXT | Email do usuário |
| `api_key_id` | TEXT | ID da chave API usada |
| `api_key_name` | TEXT | Nome da chave API |
| `provider` | TEXT | Provedor ('google' ou 'openrouter') |
| `model` | TEXT | Modelo usado (ex: 'gemini-2.5-flash') |
| `prompt_text` | TEXT | Texto do prompt enviado |
| `response_text` | TEXT | Texto da resposta recebida |
| `prompt_tokens` | INTEGER | Tokens usados no prompt |
| `completion_tokens` | INTEGER | Tokens usados na resposta |
| `total_tokens` | INTEGER | Total de tokens |
| `estimated_cost` | DECIMAL | Custo estimado em USD |
| `duration_ms` | INTEGER | Duração da requisição em ms |
| `status` | TEXT | Status ('success', 'error', 'rate_limit') |
| `error_message` | TEXT | Mensagem de erro (se houver) |
| `created_at` | TIMESTAMP | Data/hora do registro |

## Views Disponíveis

### `user_usage_stats`
Estatísticas agregadas por usuário e dia:
```sql
SELECT * FROM user_usage_stats WHERE user_id = 'uuid-aqui';
```

### `api_key_usage_stats`
Estatísticas agregadas por chave de API:
```sql
SELECT * FROM api_key_usage_stats WHERE api_key_id = 'default';
```

## Segurança (RLS)

As políticas de Row Level Security (RLS) garantem que:
- ✅ Usuários só podem ver seus próprios registros
- ✅ Apenas usuários autenticados podem inserir registros
- ✅ Apenas seus próprios registros

## Variáveis de Ambiente Necessárias

Adicione ao `.env.local`:

```bash
# Supabase (já existentes)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Service Role Key (opcional, para server-side)
# IMPORTANTE: Nunca exponha essa chave no client-side!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Consultas Úteis

### Ver uso total por usuário (últimos 30 dias)
```sql
SELECT
    user_email,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY total_cost DESC;
```

### Ver uso por modelo
```sql
SELECT
    model,
    COUNT(*) as requests,
    SUM(total_tokens) as tokens,
    AVG(duration_ms) as avg_duration,
    SUM(estimated_cost) as cost
FROM token_usage
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY cost DESC;
```

### Ver erros recentes
```sql
SELECT
    created_at,
    user_email,
    api_key_name,
    error_message
FROM token_usage
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 20;
```

## Backup

Recomenda-se fazer backup periódico da tabela:

```bash
# Via Supabase CLI
supabase db dump > backup.sql

# Ou via Dashboard
# Projects > Database > Backups
```

## Monitoramento

A página de admin `/usage` permite visualizar:
- Uso total de tokens
- Custo estimado
- Requisições por dia
- Distribuição por modelo
- Erros e rate limits
