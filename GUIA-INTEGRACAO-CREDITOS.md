# 🚀 Guia de Integração - Sistema Centralizado de Créditos

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo 1: Preparar o Projeto](#passo-1-preparar-o-projeto)
4. [Passo 2: Configurar Banco de Dados](#passo-2-configurar-banco-de-dados)
5. [Passo 3: Copiar Biblioteca](#passo-3-copiar-biblioteca)
6. [Passo 4: Integrar no Código](#passo-4-integrar-no-código)
7. [Passo 5: Testar](#passo-5-testar)
8. [Exemplos Completos](#exemplos-completos)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral

Este guia mostra como integrar **qualquer plataforma** ao sistema centralizado de créditos.

### O que você vai ter:

- ✅ Tracking automático de uso de IA
- ✅ Cálculo preciso de custos em R$
- ✅ Dedução automática de créditos (R$ 0,04 = 1 crédito)
- ✅ Histórico completo compartilhado entre plataformas
- ✅ Saldo de créditos unificado por usuário

### Plataformas já integradas:

- ✅ **Chat CCT** (este projeto) - Funcionando
- ⏳ FGTS Fácil
- ⏳ Ponto Mágico
- ⏳ Contracheque Transparente

---

## Pré-requisitos

### 1. Tecnologias necessárias:

- Node.js 18+ ou Python 3.8+
- PostgreSQL client library
  - **Node.js**: `pg`
  - **Python**: `psycopg2`
  - **PHP**: `pdo_pgsql`

### 2. Acesso ao banco:

- Host: `easypanel.gerenciaplus.com`
- Port: `6432`
- Database: `Creditos_Ensinoplus`
- User: `postgres`
- Password: (solicitar ao administrador)

### 3. Código da sua plataforma:

Defina um código único (ex: `fgts_facil`, `ponto_magico`)

---

## Passo 1: Preparar o Projeto

### Para Node.js / TypeScript:

```bash
# Instalar dependência PostgreSQL
npm install pg

# Se usar TypeScript
npm install --save-dev @types/pg
```

### Para Python:

```bash
pip install psycopg2-binary
```

### Para PHP:

```bash
# Geralmente já vem instalado
# Verificar se está habilitado no php.ini
extension=pdo_pgsql
```

---

## Passo 2: Configurar Banco de Dados

### 2.1 Registrar sua plataforma

Conecte-se ao banco `Creditos_Ensinoplus` e execute:

```sql
INSERT INTO platforms (platform_code, platform_name, description)
VALUES (
    'sua_plataforma',           -- Código único (sem espaços, lowercase)
    'Nome da Sua Plataforma',   -- Nome amigável
    'Descrição da plataforma'   -- Descrição breve
);
```

**Exemplo para "Ponto Mágico":**

```sql
INSERT INTO platforms (platform_code, platform_name, description)
VALUES (
    'ponto_magico',
    'Ponto Mágico',
    'Sistema de controle de ponto com IA'
);
```

### 2.2 Verificar se a plataforma foi criada

```sql
SELECT * FROM platforms WHERE platform_code = 'sua_plataforma';
```

Anote o `id` retornado - você vai precisar dele.

### 2.3 Verificar modelos disponíveis

```sql
SELECT model_code, model_name, cost_input_brl, cost_output_brl
FROM ai_models
WHERE is_active = true;
```

Modelos disponíveis atualmente:
- `gemini-2.5-flash` - R$ 1.50/M input, R$ 12.50/M output

---

## Passo 3: Copiar Biblioteca

### 3.1 Para Node.js / TypeScript

Copie o arquivo completo da biblioteca:

**Fonte:** [src/lib/creditos-centralizados.ts](../src/lib/creditos-centralizados.ts)

**Destino:** `src/lib/creditos-centralizados.ts` (ou similar)

**Modificações necessárias:**

No arquivo copiado, altere a constante `PLATFORM_CODE`:

```typescript
// Linha ~29
const PLATFORM_CODE = 'sua_plataforma'; // ⚠️ ALTERAR AQUI
```

**Exemplo:**
```typescript
const PLATFORM_CODE = 'ponto_magico';
```

### 3.2 Para Python

Crie `creditos_centralizados.py`:

```python
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any
import json

# ⚠️ ALTERAR: Código da sua plataforma
PLATFORM_CODE = 'sua_plataforma'

# Configuração
COST_PER_CREDIT_BRL = 0.04

def get_connection():
    """Obter conexão com banco Creditos_Ensinoplus"""
    return psycopg2.connect(
        host=os.getenv('CREDITOS_DB_HOST', 'easypanel.gerenciaplus.com'),
        port=int(os.getenv('CREDITOS_DB_PORT', '6432')),
        database=os.getenv('CREDITOS_DB_NAME', 'Creditos_Ensinoplus'),
        user=os.getenv('CREDITOS_DB_USER', 'postgres'),
        password=os.getenv('CREDITOS_DB_PASSWORD')
    )

def track_usage(
    user_email: str,
    model_code: str,
    input_tokens: int,
    output_tokens: int,
    audio_tokens: int = 0,
    request_duration_ms: Optional[int] = None,
    status: str = 'success',
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """Registrar uso de IA"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Buscar platform_id
        cursor.execute(
            "SELECT id FROM platforms WHERE platform_code = %s",
            (PLATFORM_CODE,)
        )
        platform_row = cursor.fetchone()
        if not platform_row:
            raise Exception(f"Platform {PLATFORM_CODE} not found")
        platform_id = platform_row['id']

        # 2. Buscar model_id e calcular custos
        cursor.execute(
            """SELECT id, cost_input_brl, cost_output_brl, cost_audio_brl
               FROM ai_models WHERE model_code = %s""",
            (model_code,)
        )
        model_row = cursor.fetchone()
        if not model_row:
            raise Exception(f"Model {model_code} not found")

        # 3. Calcular custos
        cost_input_brl = (input_tokens / 1_000_000) * float(model_row['cost_input_brl'])
        cost_output_brl = (output_tokens / 1_000_000) * float(model_row['cost_output_brl'])
        cost_audio_brl = (audio_tokens / 1_000_000) * float(model_row['cost_audio_brl'] or 0)
        total_cost_brl = cost_input_brl + cost_output_brl + cost_audio_brl

        total_tokens = input_tokens + output_tokens + audio_tokens

        # 4. Inserir tracking
        cursor.execute(
            """INSERT INTO usage_tracking (
                platform_id, user_email, model_id,
                input_tokens, output_tokens, audio_tokens, total_tokens,
                cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                request_duration_ms, status, error_message, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                platform_id, user_email, model_row['id'],
                input_tokens, output_tokens, audio_tokens, total_tokens,
                cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                request_duration_ms, status, error_message,
                json.dumps(metadata) if metadata else None
            )
        )

        # 5. Atualizar acumulação
        cursor.execute(
            """INSERT INTO cost_accumulation (user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status)
               VALUES (%s, %s, %s, %s, 'accumulating')
               ON CONFLICT (user_email, platform_id, status)
               DO UPDATE SET
                  accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + %s,
                  accumulated_tokens = cost_accumulation.accumulated_tokens + %s,
                  updated_at = NOW()""",
            (user_email, platform_id, total_cost_brl, total_tokens, total_cost_brl, total_tokens)
        )

        # 6. Garantir usuário existe
        cursor.execute(
            """INSERT INTO users_credits (user_email, credits_balance, is_active)
               VALUES (%s, 0, true)
               ON CONFLICT (user_email) DO NOTHING""",
            (user_email,)
        )

        conn.commit()
        print(f"[Creditos] ✅ Usage tracked: {user_email}, tokens: {total_tokens}, cost: R$ {total_cost_brl:.6f}")

    except Exception as e:
        conn.rollback()
        print(f"[Creditos] Error tracking usage: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def check_and_deduct_credits(user_email: str) -> Dict[str, Any]:
    """Verificar e deduzir créditos"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Buscar platform_id
        cursor.execute("SELECT id FROM platforms WHERE platform_code = %s", (PLATFORM_CODE,))
        platform_row = cursor.fetchone()
        if not platform_row:
            raise Exception(f"Platform {PLATFORM_CODE} not found")
        platform_id = platform_row['id']

        # Buscar saldo
        cursor.execute("SELECT credits_balance FROM users_credits WHERE user_email = %s", (user_email,))
        credits_row = cursor.fetchone()
        credits_balance = credits_row['credits_balance'] if credits_row else 0

        # Buscar acumulação
        cursor.execute(
            """SELECT id, accumulated_cost_brl, accumulated_tokens
               FROM cost_accumulation
               WHERE user_email = %s AND platform_id = %s AND status = 'accumulating'""",
            (user_email, platform_id)
        )
        acc_row = cursor.fetchone()

        accumulated_cost = float(acc_row['accumulated_cost_brl']) if acc_row else 0
        accumulated_tokens = acc_row['accumulated_tokens'] if acc_row else 0
        accumulation_id = acc_row['id'] if acc_row else None

        # Verificar se deve deduzir
        credits_to_deduct = int(accumulated_cost / COST_PER_CREDIT_BRL)

        if credits_to_deduct > 0 and accumulation_id:
            # Deduzir créditos
            cursor.execute(
                """UPDATE users_credits
                   SET credits_balance = credits_balance - %s,
                       total_credits_used = total_credits_used + %s,
                       last_activity_at = NOW(),
                       updated_at = NOW()
                   WHERE user_email = %s""",
                (credits_to_deduct, credits_to_deduct, user_email)
            )

            credits_balance -= credits_to_deduct

            # Registrar dedução
            cursor.execute(
                """INSERT INTO credit_deductions (
                    user_email, platform_id, cost_accumulated_brl, tokens_accumulated,
                    credits_deducted, credits_remaining
                ) VALUES (%s, %s, %s, %s, %s, %s)""",
                (user_email, platform_id, accumulated_cost, accumulated_tokens, credits_to_deduct, credits_balance)
            )

            # Marcar como deduzida
            cursor.execute(
                """UPDATE cost_accumulation
                   SET status = 'deducted', deducted_at = NOW(), credits_deducted = %s
                   WHERE id = %s""",
                (credits_to_deduct, accumulation_id)
            )

            conn.commit()

            return {
                'success': True,
                'message': f'{credits_to_deduct} crédito(s) deduzido(s)',
                'credits_balance': credits_balance,
                'credits_deducted': credits_to_deduct,
                'accumulated_cost': 0
            }

        cost_until_next = COST_PER_CREDIT_BRL - (accumulated_cost % COST_PER_CREDIT_BRL)

        return {
            'success': True,
            'message': 'Ainda não atingiu o custo mínimo',
            'credits_balance': credits_balance,
            'accumulated_cost': accumulated_cost,
            'cost_until_next_deduction': cost_until_next
        }

    except Exception as e:
        conn.rollback()
        print(f"[Creditos] Error checking credits: {e}")
        return {'success': False, 'error': str(e)}
    finally:
        cursor.close()
        conn.close()
```

### 3.3 Para PHP

Crie `CreditosCentralizados.php`:

```php
<?php

class CreditosCentralizados {
    private $pdo;
    private $platformCode;
    private const COST_PER_CREDIT_BRL = 0.04;

    public function __construct($platformCode) {
        // ⚠️ ALTERAR: Código da sua plataforma
        $this->platformCode = $platformCode;

        $host = getenv('CREDITOS_DB_HOST') ?: 'easypanel.gerenciaplus.com';
        $port = getenv('CREDITOS_DB_PORT') ?: '6432';
        $dbname = getenv('CREDITOS_DB_NAME') ?: 'Creditos_Ensinoplus';
        $user = getenv('CREDITOS_DB_USER') ?: 'postgres';
        $password = getenv('CREDITOS_DB_PASSWORD');

        $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
        $this->pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
    }

    public function trackUsage(array $data) {
        $this->pdo->beginTransaction();

        try {
            // 1. Buscar platform_id
            $stmt = $this->pdo->prepare("SELECT id FROM platforms WHERE platform_code = ?");
            $stmt->execute([$this->platformCode]);
            $platform = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$platform) {
                throw new Exception("Platform {$this->platformCode} not found");
            }

            $platformId = $platform['id'];

            // 2. Buscar model e calcular custos
            $stmt = $this->pdo->prepare(
                "SELECT id, cost_input_brl, cost_output_brl, cost_audio_brl
                 FROM ai_models WHERE model_code = ?"
            );
            $stmt->execute([$data['model_code']]);
            $model = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$model) {
                throw new Exception("Model {$data['model_code']} not found");
            }

            $costInputBrl = ($data['input_tokens'] / 1000000) * $model['cost_input_brl'];
            $costOutputBrl = ($data['output_tokens'] / 1000000) * $model['cost_output_brl'];
            $costAudioBrl = (($data['audio_tokens'] ?? 0) / 1000000) * ($model['cost_audio_brl'] ?? 0);
            $totalCostBrl = $costInputBrl + $costOutputBrl + $costAudioBrl;

            $totalTokens = $data['input_tokens'] + $data['output_tokens'] + ($data['audio_tokens'] ?? 0);

            // 3. Inserir tracking
            $stmt = $this->pdo->prepare(
                "INSERT INTO usage_tracking (
                    platform_id, user_email, model_id,
                    input_tokens, output_tokens, audio_tokens, total_tokens,
                    cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                    request_duration_ms, status, error_message, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $platformId, $data['user_email'], $model['id'],
                $data['input_tokens'], $data['output_tokens'], $data['audio_tokens'] ?? 0, $totalTokens,
                $costInputBrl, $costOutputBrl, $costAudioBrl, $totalCostBrl,
                $data['request_duration_ms'] ?? null, $data['status'] ?? 'success',
                $data['error_message'] ?? null,
                isset($data['metadata']) ? json_encode($data['metadata']) : null
            ]);

            // 4. Atualizar acumulação
            $stmt = $this->pdo->prepare(
                "INSERT INTO cost_accumulation (user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status)
                 VALUES (?, ?, ?, ?, 'accumulating')
                 ON CONFLICT (user_email, platform_id, status)
                 DO UPDATE SET
                    accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + ?,
                    accumulated_tokens = cost_accumulation.accumulated_tokens + ?,
                    updated_at = NOW()"
            );
            $stmt->execute([
                $data['user_email'], $platformId, $totalCostBrl, $totalTokens,
                $totalCostBrl, $totalTokens
            ]);

            // 5. Garantir usuário existe
            $stmt = $this->pdo->prepare(
                "INSERT INTO users_credits (user_email, credits_balance, is_active)
                 VALUES (?, 0, true)
                 ON CONFLICT (user_email) DO NOTHING"
            );
            $stmt->execute([$data['user_email']]);

            $this->pdo->commit();

            error_log("[Creditos] ✅ Usage tracked: {$data['user_email']}, tokens: $totalTokens, cost: R$ " . number_format($totalCostBrl, 6));

        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("[Creditos] Error tracking usage: " . $e->getMessage());
            throw $e;
        }
    }

    public function checkAndDeductCredits($userEmail) {
        // Similar ao Python, implementar a lógica de dedução
        // (código completo disponível se necessário)
    }
}
```

---

## Passo 4: Integrar no Código

### 4.1 Configurar variáveis de ambiente

**`.env` ou `.env.local`:**

```bash
# Banco de créditos centralizado
DATABASE_URL_CREDITOS=postgresql://postgres:senha@easypanel.gerenciaplus.com:6432/Creditos_Ensinoplus

# OU para Python/PHP
CREDITOS_DB_HOST=easypanel.gerenciaplus.com
CREDITOS_DB_PORT=6432
CREDITOS_DB_NAME=Creditos_Ensinoplus
CREDITOS_DB_USER=postgres
CREDITOS_DB_PASSWORD=senha_aqui
```

### 4.2 Importar e usar

**Node.js / TypeScript:**

```typescript
import { trackUsage, checkAndDeductCredits } from './lib/creditos-centralizados';

// Após cada uso de IA
async function handleAIRequest(userEmail: string, prompt: string) {
    const startTime = Date.now();

    // 1. Chamar IA (Gemini, GPT, etc)
    const response = await gemini.generateContent(prompt);

    const duration = Date.now() - startTime;

    // 2. Extrair tokens (cada API retorna diferente)
    const inputTokens = response.usageMetadata?.promptTokenCount || estimateTokens(prompt);
    const outputTokens = response.usageMetadata?.candidatesTokenCount || estimateTokens(response.text());

    // 3. Registrar uso no sistema de créditos
    await trackUsage({
        userEmail: userEmail,
        modelCode: 'gemini-2.5-flash',
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        audioTokens: 0,
        requestDurationMs: duration,
        status: 'success'
    });

    // 4. Verificar e deduzir créditos (pode ser assíncrono)
    checkAndDeductCredits(userEmail).catch(err =>
        console.error('Error checking credits:', err)
    );

    return response.text();
}
```

**Python:**

```python
from creditos_centralizados import track_usage, check_and_deduct_credits

async def handle_ai_request(user_email: str, prompt: str):
    start_time = time.time()

    # 1. Chamar IA
    response = gemini.generate_content(prompt)

    duration_ms = int((time.time() - start_time) * 1000)

    # 2. Extrair tokens
    input_tokens = response.usage_metadata.prompt_token_count or estimate_tokens(prompt)
    output_tokens = response.usage_metadata.candidates_token_count or estimate_tokens(response.text)

    # 3. Registrar uso
    track_usage(
        user_email=user_email,
        model_code='gemini-2.5-flash',
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        audio_tokens=0,
        request_duration_ms=duration_ms,
        status='success'
    )

    # 4. Verificar créditos
    result = check_and_deduct_credits(user_email)
    if result.get('credits_deducted'):
        print(f"Deducted {result['credits_deducted']} credits")

    return response.text
```

**PHP:**

```php
<?php
require_once 'CreditosCentralizados.php';

$creditos = new CreditosCentralizados('sua_plataforma');

function handleAIRequest($userEmail, $prompt) {
    global $creditos;

    $startTime = microtime(true);

    // 1. Chamar IA
    $response = $gemini->generateContent($prompt);

    $duration = (int)((microtime(true) - $startTime) * 1000);

    // 2. Extrair tokens
    $inputTokens = $response->usageMetadata->promptTokenCount ?? estimateTokens($prompt);
    $outputTokens = $response->usageMetadata->candidatesTokenCount ?? estimateTokens($response->text());

    // 3. Registrar uso
    $creditos->trackUsage([
        'user_email' => $userEmail,
        'model_code' => 'gemini-2.5-flash',
        'input_tokens' => $inputTokens,
        'output_tokens' => $outputTokens,
        'audio_tokens' => 0,
        'request_duration_ms' => $duration,
        'status' => 'success'
    ]);

    // 4. Verificar créditos
    $result = $creditos->checkAndDeductCredits($userEmail);

    return $response->text();
}
```

---

## Passo 5: Testar

### 5.1 Teste básico de conexão

**Node.js:**

```typescript
import { getUserCredits } from './lib/creditos-centralizados';

const credits = await getUserCredits('test@example.com');
console.log(`Credits: ${credits}`);
```

**Python:**

```python
from creditos_centralizados import check_and_deduct_credits

result = check_and_deduct_credits('test@example.com')
print(f"Balance: {result['credits_balance']}")
```

### 5.2 Teste de tracking

Faça uma requisição real à IA e verifique no banco:

```sql
-- Ver uso registrado
SELECT * FROM usage_tracking
WHERE user_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 5;

-- Ver custo acumulado
SELECT * FROM cost_accumulation
WHERE user_email = 'test@example.com'
AND status = 'accumulating';
```

### 5.3 Teste de dedução

Simule uso até atingir R$ 0,04:

```sql
-- Forçar acumulação de R$ 0,05 (deve deduzir 1 crédito)
UPDATE cost_accumulation
SET accumulated_cost_brl = 0.05
WHERE user_email = 'test@example.com'
AND status = 'accumulating';

-- Executar check
-- (via código da sua aplicação)

-- Verificar dedução
SELECT * FROM credit_deductions
WHERE user_email = 'test@example.com'
ORDER BY deducted_at DESC
LIMIT 1;
```

---

## Exemplos Completos

### Exemplo 1: Chat simples com Gemini

```typescript
import { trackUsage } from './lib/creditos-centralizados';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function chat(userEmail: string, message: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(message);
    const response = result.response;

    // Tracking
    await trackUsage({
        userEmail: userEmail,
        modelCode: 'gemini-2.5-flash',
        inputTokens: result.response.usageMetadata?.promptTokenCount || 0,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
        status: 'success'
    });

    return response.text();
}
```

### Exemplo 2: API REST com Express

```typescript
import express from 'express';
import { trackUsage, checkAndDeductCredits } from './lib/creditos-centralizados';

const app = express();

app.post('/api/chat', async (req, res) => {
    const { user_email, message } = req.body;

    try {
        // Processar com IA
        const aiResponse = await processWithAI(message);

        // Track usage
        await trackUsage({
            userEmail: user_email,
            modelCode: 'gemini-2.5-flash',
            inputTokens: aiResponse.inputTokens,
            outputTokens: aiResponse.outputTokens,
        });

        // Check credits (async, não bloqueia resposta)
        checkAndDeductCredits(user_email).catch(console.error);

        res.json({ response: aiResponse.text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Exemplo 3: Background job (processar em lote)

```typescript
// Processar deduções em background a cada hora
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
    console.log('Checking credits for all users...');

    // Buscar usuários com custo acumulado >= R$ 0,04
    const result = await pool.query(`
        SELECT DISTINCT user_email
        FROM cost_accumulation
        WHERE status = 'accumulating'
        AND accumulated_cost_brl >= 0.04
    `);

    for (const row of result.rows) {
        try {
            const result = await checkAndDeductCredits(row.user_email);
            if (result.creditsDeducted) {
                console.log(`Deducted ${result.creditsDeducted} credits from ${row.user_email}`);
            }
        } catch (error) {
            console.error(`Error processing ${row.user_email}:`, error);
        }
    }
});
```

---

## Troubleshooting

### Erro: "Platform not found"

**Causa:** Plataforma não foi registrada no banco

**Solução:**
```sql
INSERT INTO platforms (platform_code, platform_name, description)
VALUES ('sua_plataforma', 'Sua Plataforma', 'Descrição');
```

### Erro: "Model not found"

**Causa:** Modelo não está cadastrado

**Solução:**
```sql
-- Ver modelos disponíveis
SELECT model_code, model_name FROM ai_models WHERE is_active = true;

-- Se necessário, adicionar novo modelo (consultar admin)
```

### Erro: "Connection refused"

**Causa:** Firewall ou credenciais incorretas

**Solução:**
1. Verificar se o host está acessível
2. Confirmar credenciais no `.env`
3. Testar conexão direta: `psql -h easypanel.gerenciaplus.com -p 6432 -U postgres -d Creditos_Ensinoplus`

### Créditos não estão sendo deduzidos

**Verificações:**

1. Custo acumulado é >= R$ 0,04?
```sql
SELECT accumulated_cost_brl FROM cost_accumulation
WHERE user_email = 'user@example.com' AND status = 'accumulating';
```

2. Função `checkAndDeductCredits()` está sendo chamada?
```typescript
// Adicionar log
console.log('Checking credits for:', userEmail);
```

3. Há erros no log?
```bash
# Buscar por erros
grep -i "creditos.*error" application.log
```

### Performance lenta

**Otimizações:**

1. Usar pool de conexões (já implementado)
2. Chamar `checkAndDeductCredits()` de forma assíncrona
3. Processar deduções em background job

---

## Suporte

- **Documentação técnica:** [SISTEMA-CREDITOS-CENTRALIZADO.md](SISTEMA-CREDITOS-CENTRALIZADO.md)
- **Código fonte completo:** Chat CCT (`src/lib/creditos-centralizados.ts`)
- **Admin do banco:** (contato do administrador)

---

## Checklist de Integração

- [ ] Plataforma registrada no banco (`platforms`)
- [ ] Biblioteca copiada e `PLATFORM_CODE` alterado
- [ ] Variáveis de ambiente configuradas
- [ ] Dependência PostgreSQL instalada
- [ ] Função `trackUsage()` integrada após chamadas de IA
- [ ] Função `checkAndDeductCredits()` chamada periodicamente
- [ ] Testes realizados com sucesso
- [ ] Logs funcionando corretamente
- [ ] Deploy em produção

---

**Última atualização:** 2025-01-15
