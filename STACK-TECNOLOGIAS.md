# 🛠️ Stack de Tecnologias - File Search System

## 📋 Resumo Executivo

Sistema de chat com IA que permite fazer buscas semânticas em documentos usando Google Gemini File Search API, com tracking de custos e sistema de créditos.

## 🎯 Tecnologias Principais

### Frontend

- **Next.js 16.0.3** - Framework React com SSR/SSG
- **React 19.2.0** - Biblioteca UI
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 4** - Framework CSS utility-first
- **Lucide React 0.554.0** - Ícones

### Backend / API

- **Next.js API Routes** - Endpoints serverless
- **Node.js 20** - Runtime
- **TypeScript** - Linguagem de programação

### Inteligência Artificial

- **Google Gemini 2.5 Flash** - Modelo principal
- **@google/genai 1.30.0** - SDK oficial Google Gemini
- **@google/generative-ai 0.24.1** - SDK legado (File API 48h)

### Bancos de Dados

- **PostgreSQL** - Tracking de tokens e créditos
  - Pool de conexões: `pg 8.16.3`
  - TypeScript types: `@types/pg 8.11.10`

- **Supabase** - Autenticação de usuários
  - `@supabase/supabase-js 2.84.0`
  - `@supabase/ssr 0.7.0`

### Armazenamento de Arquivos

- **Google Cloud Storage** (via Gemini File Search API)
  - Armazenamento permanente de documentos
  - Indexação automática para busca semântica
  - Sem expiração (diferente da antiga File API de 48h)

## 🔑 Recursos Principais

### 1. Google Gemini File Search API

**O que é**: Sistema de armazenamento e busca semântica do Google

**Como funciona**:
```typescript
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Criar File Search Store (corpus)
const store = await genAI.fileSearchStores.create({
    config: { displayName: "meu-store" }
});

// Upload de arquivo
await genAI.fileSearchStores.uploadToFileSearchStore({
    file: "/caminho/arquivo.pdf",
    fileSearchStoreName: store.name,
    config: { displayName: "documento.pdf" }
});

// Buscar no conteúdo via chat
const response = await genAI.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: 'user', parts: [{ text: "pergunta" }] }],
    tools: [{
        fileSearchStore: { name: store.name }
    }]
});
```

**Características**:
- ✅ Armazenamento permanente (não expira)
- ✅ Indexação automática para busca
- ✅ Suporta PDF, DOCX, TXT, etc
- ✅ Busca semântica (não apenas keywords)
- ✅ Múltiplos stores por API key
- ✅ Citações automáticas das fontes
- ⚠️ Limite ~10MB por arquivo (não oficial)
- ❌ Não permite download do arquivo original

**Pricing** (GCP Brasil - R$):
- Input: R$ 1,834620875 / 1M tokens
- Output: R$ 15,288507299 / 1M tokens
- Armazenamento: Gratuito (até certo limite)

**Onde os arquivos ficam**:
- Servidores Google Cloud
- Acessíveis via API ou Google AI Studio
- Não têm URL pública para download

### 2. Sistema de Tracking de Custos

**PostgreSQL** armazena:
- Cada requisição ao Gemini
- Tokens consumidos (prompt + completion)
- Custo estimado em R$
- Metadados (modelo, duração, status)

**Tabela principal**:
```sql
CREATE TABLE token_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost NUMERIC(10, 6),  -- R$
    created_at TIMESTAMP
);
```

**Cálculo de custo**:
```typescript
function estimateCost(model: string, promptTokens: number, completionTokens: number) {
  const pricing = {
    'gemini-2.5-flash': { prompt: 1.834620875, completion: 15.288507299 }
  };

  const promptCost = (promptTokens / 1_000_000) * pricing[model].prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing[model].completion;

  return promptCost + completionCost; // em R$
}
```

### 3. Sistema de Créditos

**Lógica**:
- R$ 0,10 acumulado = 1 crédito deduzido
- Verifica após cada mensagem
- Chama API PHP externa para deduzir
- Registra dedução no PostgreSQL

**Fluxo**:
```
Usuário envia mensagem
    ↓
Gemini processa (consome tokens)
    ↓
Salva no PostgreSQL (custo em R$)
    ↓
Verifica custo acumulado
    ↓
Se >= R$ 0,10 → Deduz 1 crédito
    ↓
Registra em credit_deductions
```

**API PHP de Créditos**:
```
POST https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php
Body: { email: "user@example.com", credits: 1 }
Response: { success: true, credits_remaining: 99 }
```

### 4. Autenticação

**Supabase Auth**:
- Login/Logout de usuários
- Gerenciamento de sessões
- Magic links, OAuth, etc.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Login
await supabase.auth.signInWithPassword({ email, password });

// Obter usuário atual
const { data: { user } } = await supabase.auth.getUser();
```

## 📊 Arquitetura do Sistema

```
┌──────────────────────────────────────────────────┐
│              FRONTEND (Next.js)                  │
│  ┌────────┐  ┌────────┐  ┌──────────┐           │
│  │ Login  │  │  Chat  │  │  Upload  │           │
│  └───┬────┘  └───┬────┘  └────┬─────┘           │
└──────┼──────────┼────────────┼─────────────────┘
       │          │            │
       │          │            │
   ┌───▼──────────▼────────────▼──────────┐
   │      NEXT.JS API ROUTES              │
   │  /api/chat  /api/upload  /api/files  │
   └───┬──────────┬────────────┬──────────┘
       │          │            │
   ┌───▼──────┐   │        ┌───▼──────────────┐
   │ Supabase │   │        │  Google Gemini   │
   │   Auth   │   │        │  File Search API │
   └──────────┘   │        └───┬──────────────┘
                  │            │
              ┌───▼────────────▼──────┐
              │    PostgreSQL         │
              │  - token_usage        │
              │  - credit_deductions  │
              └───────────────────────┘
```

## 🔧 Configuração de Ambiente

### Variáveis Obrigatórias

```bash
# Google Gemini API
GEMINI_API_KEY=AIzaSy...

# Supabase (Autenticação)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# PostgreSQL (Tracking)
DATABASE_URL=postgresql://user:pass@host:port/db

# API Keys Adicionais (Múltiplos Stores)
API_KEY_1_NAME=Jurisprudência
API_KEY_1_KEY=AIzaSy...
API_KEY_1_THEME=Jurisprudência de cálculos
```

### Estrutura de Pastas

```
filesearch/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts           # Chat com Gemini
│   │   │   ├── upload/route.ts         # Upload de arquivos
│   │   │   ├── files/route.ts          # Listar/deletar arquivos
│   │   │   ├── check-credits/route.ts  # Verificar créditos
│   │   │   └── usage/route.ts          # Estatísticas de uso
│   │   ├── login/page.tsx              # Tela de login
│   │   ├── page.tsx                    # Chat principal
│   │   └── admin/                      # Painel admin
│   └── lib/
│       ├── gemini.ts                   # Config Gemini
│       ├── postgres.ts                 # Cliente PostgreSQL
│       ├── supabase.ts                 # Cliente Supabase
│       ├── usage-tracking.ts           # Tracking de tokens
│       ├── credit-checker.ts           # Sistema de créditos
│       └── api-keys-env.ts             # Múltiplas API keys
├── postgres-migrations/
│   └── 001_create_tables.sql           # Schema do banco
├── public/                              # Assets estáticos
├── .env.local                           # Variáveis de ambiente
├── next.config.ts                       # Config Next.js
├── tailwind.config.ts                   # Config Tailwind
├── tsconfig.json                        # Config TypeScript
└── package.json                         # Dependências
```

## 📦 Dependências Completas

```json
{
  "dependencies": {
    "@google/genai": "^1.30.0",              // SDK Gemini File Search
    "@google/generative-ai": "^0.24.1",      // SDK Gemini legado
    "@supabase/ssr": "^0.7.0",               // Supabase SSR
    "@supabase/supabase-js": "^2.84.0",      // Cliente Supabase
    "clsx": "^2.1.1",                        // Utility classes
    "dotenv": "^17.2.3",                     // Env variables
    "lucide-react": "^0.554.0",              // Ícones
    "next": "16.0.3",                        // Framework
    "pg": "^8.16.3",                         // PostgreSQL client
    "react": "19.2.0",                       // React
    "react-dom": "19.2.0",                   // React DOM
    "tailwind-merge": "^3.4.0"               // Merge classes
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",            // PostCSS
    "@types/node": "^20.19.25",              // Types Node
    "@types/pg": "^8.11.10",                 // Types PostgreSQL
    "@types/react": "^19",                   // Types React
    "@types/react-dom": "^19",               // Types React DOM
    "eslint": "^9",                          // Linter
    "eslint-config-next": "16.0.3",          // ESLint Next
    "tailwindcss": "^4",                     // Tailwind CSS
    "typescript": "^5"                       // TypeScript
  }
}
```

## 🚀 Como Usar em Outro Sistema

### 1. Instalar Dependências

```bash
npm install @google/genai pg @supabase/supabase-js
npm install --save-dev @types/pg typescript
```

### 2. Configurar Google Gemini File Search

```typescript
// lib/gemini.ts
import { GoogleGenAI } from "@google/genai";

export const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const FILE_SEARCH_STORE_NAME = "meu-store";
```

### 3. Upload de Arquivo

```typescript
// api/upload/route.ts
import { genAI, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";

export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Obter ou criar store
    const stores = [];
    for await (const s of await genAI.fileSearchStores.list()) {
        stores.push(s);
    }

    let store = stores.find(s => s.displayName === FILE_SEARCH_STORE_NAME);

    if (!store) {
        const response = await genAI.fileSearchStores.create({
            config: { displayName: FILE_SEARCH_STORE_NAME }
        });
        store = response;
    }

    // Upload
    const uploadResponse = await genAI.fileSearchStores.uploadToFileSearchStore({
        file: tempFilePath,
        fileSearchStoreName: store.name,
        config: { displayName: file.name }
    });

    return Response.json({ success: true, file: uploadResponse });
}
```

### 4. Chat com Busca

```typescript
// api/chat/route.ts
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
    const { message, storeName } = await request.json();

    const response = await genAI.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
            role: 'user',
            parts: [{ text: message }]
        }],
        tools: [{
            fileSearchStore: {
                name: storeName  // Busca nos arquivos
            }
        }]
    });

    const text = response.text();
    const citations = response.groundingMetadata?.webSearchQueries || [];

    return Response.json({ response: text, citations });
}
```

### 5. Tracking de Custos (Opcional)

```typescript
// lib/postgres.ts
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export async function query(text: string, params?: any[]) {
    return await pool.query(text, params);
}

// Após cada requisição
await query(`
    INSERT INTO token_usage (
        user_id, model, prompt_tokens, completion_tokens, estimated_cost
    ) VALUES ($1, $2, $3, $4, $5)
`, [userId, model, promptTokens, completionTokens, cost]);
```

## 📚 Documentação Adicional

- [ARMAZENAMENTO-ARQUIVOS.md](ARMAZENAMENTO-ARQUIVOS.md) - Onde e como arquivos são armazenados
- [MIGRACAO-POSTGRESQL.md](MIGRACAO-POSTGRESQL.md) - Migração para PostgreSQL
- [PRODUCTION-FIX.md](PRODUCTION-FIX.md) - Fixes de produção e troubleshooting
- [CREDITS-SYSTEM.md](CREDITS-SYSTEM.md) - Sistema de créditos (se existir)

## 🔗 Links Úteis

### Google Gemini
- **Docs**: https://ai.google.dev/docs
- **File Search API**: https://ai.google.dev/api/file-search
- **Google AI Studio**: https://aistudio.google.com
- **Pricing**: https://ai.google.dev/pricing

### Supabase
- **Docs**: https://supabase.com/docs
- **Auth**: https://supabase.com/docs/guides/auth
- **Dashboard**: https://supabase.com/dashboard

### PostgreSQL
- **Docs**: https://www.postgresql.org/docs
- **node-postgres (pg)**: https://node-postgres.com

### Next.js
- **Docs**: https://nextjs.org/docs
- **API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

## 💡 Dicas de Implementação

### Limites de Tamanho de Arquivo

```typescript
// Arquivo > 10MB geralmente dá erro 503
if (file.size > 10 * 1024 * 1024) {
    return Response.json({
        error: "Arquivo muito grande. Máximo recomendado: 10MB"
    }, { status: 400 });
}
```

### Timeout e Retry

```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            if (i === retries - 1 || error.status !== 503) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
    throw new Error('Max retries reached');
}
```

### Estimativa de Tokens

```typescript
// Aproximação: 1 token ≈ 4 caracteres em português
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}
```

## 🎯 Casos de Uso

1. **Chat jurídico** - Busca em jurisprudências e doutrinas
2. **Suporte técnico** - Busca em manuais e documentação
3. **Pesquisa acadêmica** - Busca em papers e livros
4. **FAQ inteligente** - Respostas baseadas em documentos internos
5. **Análise de contratos** - Busca em contratos e cláusulas

## ⚠️ Limitações Conhecidas

- Arquivos > 10MB podem dar timeout/503
- Não é possível baixar arquivos após upload
- API do Gemini pode ser lenta com muitos documentos
- Custos podem aumentar com alto volume
- File Search Store tem limite de documentos (não especificado)

## 🔐 Segurança

- ✅ Todas as queries SQL usam parametrização ($1, $2)
- ✅ Autenticação via Supabase Auth
- ✅ API keys armazenadas em env variables
- ✅ CORS configurado
- ⚠️ Arquivos ficam nos servidores do Google (considerar LGPD)
- ⚠️ Não enviar dados sensíveis/confidenciais
