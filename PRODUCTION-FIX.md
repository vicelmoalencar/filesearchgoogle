# 🔧 Fix de Produção - RLS e Token Tracking

## 🚨 Problemas Identificados

### 1. Erro RLS (Row Level Security)
```
Error: new row violates row-level security policy for table "token_usage"
Code: 42501
```

**Causa**: A política RLS da tabela `token_usage` está bloqueando inserções.

**Possíveis razões**:
- `SUPABASE_SERVICE_ROLE_KEY` não está configurada no ambiente de produção
- Sistema está usando `NEXT_PUBLIC_SUPABASE_ANON_KEY` que tem restrições RLS
- Política RLS existente não permite inserções autenticadas

### 2. Erro ECONNREFUSED
```
[Chat] Failed to check credits: TypeError: fetch failed
cause: ECONNREFUSED
```

**Causa**: O código está tentando chamar `localhost:3000` em produção.

## ✅ Soluções

### Solução 1: Aplicar Migration SQL no Supabase

Execute este SQL no **Supabase SQL Editor** da sua conta de produção:

```sql
-- Fix RLS policies for token_usage table
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.token_usage;
DROP POLICY IF EXISTS "Allow service role all access" ON public.token_usage;
DROP POLICY IF EXISTS "Users can view own usage" ON public.token_usage;

-- Enable RLS on the table
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to insert their own records
CREATE POLICY "Allow authenticated inserts" ON public.token_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Policy 2: Allow authenticated users to view their own records
CREATE POLICY "Users can view own usage" ON public.token_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Policy 3: Allow service role full access (for admin operations)
CREATE POLICY "Allow service role all access" ON public.token_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

### Solução 2: Configurar Variáveis de Ambiente de Produção

Certifique-se de que as seguintes variáveis estão configuradas na plataforma de deploy (Vercel, Netlify, etc.):

#### ✅ Obrigatórias:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Anon key público
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Service role key (PRIVADA!)
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com  # URL do site em produção
```

#### 📍 Como obter as keys do Supabase:
1. Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
2. Copie:
   - **anon public**: Para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: Para `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA exponha publicamente!)

### Solução 3: Verificar configuração do Site URL

Se estiver usando Vercel/Netlify, adicione:

**Vercel:**
```bash
NEXT_PUBLIC_SITE_URL=$VERCEL_URL
```

**Netlify:**
```bash
NEXT_PUBLIC_SITE_URL=$URL
```

Ou configure manualmente com seu domínio:
```bash
NEXT_PUBLIC_SITE_URL=https://chat-cct.vercel.app
```

## 🧪 Teste após aplicar as correções

### 1. Verificar RLS aplicado
No Supabase SQL Editor:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'token_usage';
```

Deve mostrar 3 políticas:
- `Allow authenticated inserts`
- `Users can view own usage`
- `Allow service role all access`

### 2. Fazer deploy das alterações
```bash
git add .
git commit -m "Fix RLS policies and environment configuration for production"
git push
```

### 3. Testar em produção
1. Acesse o site em produção
2. Faça login
3. Envie uma mensagem no chat
4. Verifique no Supabase → Table Editor → `token_usage` se salvou

### 4. Verificar logs
Na plataforma de deploy, verificar logs de build e runtime:
- Deve mostrar: `[Usage Tracking] ✅ Saved: { user: '...', tokens: ..., cost: '...', model: '...' }`
- NÃO deve mostrar: `Error saving to database` ou `ECONNREFUSED`

## 📋 Checklist de Deploy

- [ ] Aplicar migration SQL `fix_rls_token_usage.sql` no Supabase
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente
- [ ] Configurar `NEXT_PUBLIC_SITE_URL` com o domínio correto
- [ ] Fazer push do código atualizado
- [ ] Aguardar deploy completar
- [ ] Testar login e enviar mensagem
- [ ] Verificar se salvou na tabela `token_usage`
- [ ] Verificar se deduziu créditos corretamente

## ⚠️ Importante

1. **NUNCA** exponha `SUPABASE_SERVICE_ROLE_KEY` publicamente
2. Ela deve estar APENAS nas variáveis de ambiente do servidor
3. NÃO commite ela no código ou `.env.local`
4. Mantenha ela segura - essa key tem acesso total ao banco!

## 🆘 Se ainda não funcionar

1. Verificar logs de runtime na plataforma de deploy
2. Testar localmente com `.env.local` correto
3. Confirmar que o usuário está autenticado (session válida)
4. Verificar no Supabase Authentication se o usuário existe
5. Checar se `auth.uid()` retorna valor válido
