# 💻 Exemplos de Código - Sistema de Créditos

Esta documentação contém exemplos práticos de código para integrar o sistema de créditos em diferentes linguagens.

## 📋 Índice

1. [Node.js/TypeScript](#nodejs--typescript)
2. [Python](#python)
3. [PHP](#php)
4. [Configuração de Ambiente](#configuração-de-ambiente)

---

## Node.js / TypeScript

### 1. Instalação

```bash
npm install pg @types/pg
```

### 2. Configuração (.env.local)

```bash
DATABASE_URL_CREDITOS=postgresql://postgres:senha@host:6432/Creditos_Ensinoplus?sslmode=disable
```

### 3. Biblioteca de Créditos (creditos-centralizados.ts)

```typescript
import { Pool } from 'pg';

// Converter formato Python para Node.js
const connectionString = process.env.DATABASE_URL_CREDITOS?.replace(
    'postgresql+psycopg2://',
    'postgresql://'
);

const creditosPool = new Pool({
    connectionString: connectionString,
    ssl: connectionString?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

const PLATFORM_CODE = 'sua_plataforma'; // Altere aqui!
const COST_PER_CREDIT = 0.04; // R$ 0,04 = 1 crédito

interface UsageData {
    userEmail: string;
    modelCode: string;
    inputTokens: number;
    outputTokens: number;
    audioTokens?: number;
    requestDurationMs: number;
    status: 'success' | 'error';
    errorMessage?: string;
    metadata?: Record<string, any>;
}

/**
 * Registra uso de IA no sistema centralizado
 */
export async function trackUsage(data: UsageData): Promise<void> {
    const client = await creditosPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscar platform_id
        const platformResult = await client.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            [PLATFORM_CODE]
        );

        if (platformResult.rows.length === 0) {
            throw new Error(`Platform ${PLATFORM_CODE} not found`);
        }

        const platformId = platformResult.rows[0].id;

        // 2. Buscar model_id e preços
        const modelResult = await client.query(
            `SELECT id, cost_input_brl, cost_output_brl, cost_audio_brl
             FROM ai_models
             WHERE model_code = $1 AND is_active = true`,
            [data.modelCode]
        );

        if (modelResult.rows.length === 0) {
            throw new Error(`Model ${data.modelCode} not found`);
        }

        const model = modelResult.rows[0];

        // 3. Calcular custos
        const costInput = (data.inputTokens / 1_000_000) * parseFloat(model.cost_input_brl);
        const costOutput = (data.outputTokens / 1_000_000) * parseFloat(model.cost_output_brl);
        const costAudio = ((data.audioTokens || 0) / 1_000_000) * parseFloat(model.cost_audio_brl || '0');
        const totalCost = costInput + costOutput + costAudio;
        const totalTokens = data.inputTokens + data.outputTokens + (data.audioTokens || 0);

        // 4. Inserir em usage_tracking
        await client.query(
            `INSERT INTO usage_tracking (
                platform_id, user_email, model_id,
                input_tokens, output_tokens, audio_tokens, total_tokens,
                cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                request_duration_ms, status, error_message, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                platformId, data.userEmail, model.id,
                data.inputTokens, data.outputTokens, data.audioTokens || 0, totalTokens,
                costInput, costOutput, costAudio, totalCost,
                data.requestDurationMs, data.status,
                data.errorMessage || null,
                data.metadata ? JSON.stringify(data.metadata) : null
            ]
        );

        // 5. Atualizar/criar acumulação
        const accumulationResult = await client.query(
            `INSERT INTO cost_accumulation (
                user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status
            ) VALUES ($1, $2, $3, $4, 'accumulating')
            ON CONFLICT (user_email, platform_id, status)
            DO UPDATE SET
                accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + $3,
                accumulated_tokens = cost_accumulation.accumulated_tokens + $4,
                updated_at = NOW()
            RETURNING accumulated_cost_brl`,
            [data.userEmail, platformId, totalCost, totalTokens]
        );

        await client.query('COMMIT');

        console.log(`[Creditos] Usage tracked: ${totalTokens} tokens = R$ ${totalCost.toFixed(6)}`);
        console.log(`[Creditos] Accumulated: R$ ${accumulationResult.rows[0].accumulated_cost_brl}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Creditos] Error tracking usage:', error);
        throw error;
    } finally {
        client.release();
    }
}

interface CreditCheckResult {
    success: boolean;
    message: string;
    creditsBalance: number;
    accumulatedCost?: number;
    costUntilNextDeduction?: number;
    creditsDeducted?: number;
}

/**
 * Verifica acumulação e deduz créditos se necessário
 */
export async function checkAndDeductCredits(
    userEmail: string
): Promise<CreditCheckResult> {
    const client = await creditosPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscar platform_id
        const platformResult = await client.query(
            'SELECT id FROM platforms WHERE platform_code = $1',
            [PLATFORM_CODE]
        );

        if (platformResult.rows.length === 0) {
            throw new Error(`Platform ${PLATFORM_CODE} not found`);
        }

        const platformId = platformResult.rows[0].id;

        // 2. Buscar acumulação atual
        const accumulationResult = await client.query(
            `SELECT id, accumulated_cost_brl, accumulated_tokens
             FROM cost_accumulation
             WHERE user_email = $1 AND platform_id = $2 AND status = 'accumulating'`,
            [userEmail, platformId]
        );

        let accumulatedCost = 0;
        let accumulatedTokens = 0;
        let accumulationId = null;

        if (accumulationResult.rows.length > 0) {
            accumulatedCost = parseFloat(accumulationResult.rows[0].accumulated_cost_brl);
            accumulatedTokens = accumulationResult.rows[0].accumulated_tokens;
            accumulationId = accumulationResult.rows[0].id;
        }

        // 3. Calcular créditos a deduzir
        const creditsToDeduct = Math.floor(accumulatedCost / COST_PER_CREDIT);

        if (creditsToDeduct === 0) {
            await client.query('COMMIT');

            // Buscar saldo atual
            const balanceResult = await client.query(
                'SELECT credits_balance FROM users_credits WHERE user_email = $1',
                [userEmail]
            );

            const balance = balanceResult.rows.length > 0
                ? balanceResult.rows[0].credits_balance
                : 0;

            return {
                success: true,
                message: 'No credits to deduct',
                creditsBalance: balance,
                accumulatedCost,
                costUntilNextDeduction: COST_PER_CREDIT - accumulatedCost
            };
        }

        // 4. Deduzir créditos
        const costDeducted = creditsToDeduct * COST_PER_CREDIT;
        const remainingCost = accumulatedCost - costDeducted;

        // Atualizar saldo do usuário
        const updateResult = await client.query(
            `UPDATE users_credits
             SET credits_balance = credits_balance - $1,
                 total_credits_used = total_credits_used + $1,
                 last_activity_at = NOW(),
                 updated_at = NOW()
             WHERE user_email = $2
             RETURNING credits_balance`,
            [creditsToDeduct, userEmail]
        );

        if (updateResult.rows.length === 0) {
            throw new Error('User not found or insufficient credits');
        }

        const newBalance = updateResult.rows[0].credits_balance;

        // Registrar dedução
        await client.query(
            `INSERT INTO credit_deductions (
                user_email, platform_id,
                cost_accumulated_brl, tokens_accumulated,
                credits_deducted, credits_remaining
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [userEmail, platformId, costDeducted, accumulatedTokens, creditsToDeduct, newBalance]
        );

        // Marcar acumulação como deduzida
        await client.query(
            `UPDATE cost_accumulation
             SET status = 'deducted',
                 deducted_at = NOW(),
                 credits_deducted = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [creditsToDeduct, accumulationId]
        );

        // Criar nova acumulação com o resto
        if (remainingCost > 0) {
            await client.query(
                `INSERT INTO cost_accumulation (
                    user_email, platform_id,
                    accumulated_cost_brl, accumulated_tokens, status
                ) VALUES ($1, $2, $3, 0, 'accumulating')`,
                [userEmail, platformId, remainingCost]
            );
        }

        await client.query('COMMIT');

        console.log(`[Creditos] Deducted ${creditsToDeduct} credits from ${userEmail}`);
        console.log(`[Creditos] New balance: ${newBalance}`);

        return {
            success: true,
            message: `${creditsToDeduct} credit(s) deducted`,
            creditsBalance: newBalance,
            creditsDeducted: creditsToDeduct,
            accumulatedCost: remainingCost,
            costUntilNextDeduction: COST_PER_CREDIT - remainingCost
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Creditos] Error checking/deducting credits:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Busca saldo de créditos do usuário
 */
export async function getUserCredits(userEmail: string): Promise<number> {
    const result = await creditosPool.query(
        'SELECT credits_balance FROM users_credits WHERE user_email = $1',
        [userEmail]
    );

    return result.rows.length > 0 ? result.rows[0].credits_balance : 0;
}
```

### 4. Exemplo de Uso

```typescript
import { trackUsage, checkAndDeductCredits } from './creditos-centralizados';

// Após cada uso de IA
await trackUsage({
    userEmail: 'user@example.com',
    modelCode: 'gemini-2.5-flash',
    inputTokens: 1000,
    outputTokens: 500,
    audioTokens: 0,
    requestDurationMs: 2000,
    status: 'success'
});

// Verificar e deduzir créditos
const result = await checkAndDeductCredits('user@example.com');
console.log(result);
```

---

## Python

### 1. Instalação

```bash
pip install psycopg2-binary python-dotenv
```

### 2. Configuração (.env)

```bash
DATABASE_URL_CREDITOS=postgresql+psycopg2://postgres:senha@host:6432/Creditos_Ensinoplus?sslmode=disable
```

### 3. Biblioteca de Créditos (creditos_centralizados.py)

```python
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv

load_dotenv()

# Pool de conexões
pool = ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=os.getenv('DATABASE_URL_CREDITOS')
)

PLATFORM_CODE = 'sua_plataforma'  # Altere aqui!
COST_PER_CREDIT = 0.04

def track_usage(data: dict) -> None:
    """
    Registra uso de IA no sistema centralizado

    Args:
        data: {
            'user_email': str,
            'model_code': str,
            'input_tokens': int,
            'output_tokens': int,
            'audio_tokens': int (opcional),
            'request_duration_ms': int,
            'status': 'success' | 'error',
            'error_message': str (opcional),
            'metadata': dict (opcional)
        }
    """
    conn = pool.getconn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute('BEGIN')

        # 1. Buscar platform_id
        cursor.execute(
            "SELECT id FROM platforms WHERE platform_code = %s",
            (PLATFORM_CODE,)
        )
        platform = cursor.fetchone()

        if not platform:
            raise Exception(f'Platform {PLATFORM_CODE} not found')

        platform_id = platform['id']

        # 2. Buscar model_id e preços
        cursor.execute(
            """SELECT id, cost_input_brl, cost_output_brl, cost_audio_brl
               FROM ai_models
               WHERE model_code = %s AND is_active = true""",
            (data['model_code'],)
        )
        model = cursor.fetchone()

        if not model:
            raise Exception(f"Model {data['model_code']} not found")

        # 3. Calcular custos
        cost_input = (data['input_tokens'] / 1_000_000) * float(model['cost_input_brl'])
        cost_output = (data['output_tokens'] / 1_000_000) * float(model['cost_output_brl'])
        audio_tokens = data.get('audio_tokens', 0)
        cost_audio = (audio_tokens / 1_000_000) * float(model['cost_audio_brl'] or 0)
        total_cost = cost_input + cost_output + cost_audio
        total_tokens = data['input_tokens'] + data['output_tokens'] + audio_tokens

        # 4. Inserir em usage_tracking
        cursor.execute(
            """INSERT INTO usage_tracking (
                platform_id, user_email, model_id,
                input_tokens, output_tokens, audio_tokens, total_tokens,
                cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                request_duration_ms, status, error_message, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                platform_id, data['user_email'], model['id'],
                data['input_tokens'], data['output_tokens'], audio_tokens, total_tokens,
                cost_input, cost_output, cost_audio, total_cost,
                data['request_duration_ms'], data['status'],
                data.get('error_message'), data.get('metadata')
            )
        )

        # 5. Atualizar/criar acumulação
        cursor.execute(
            """INSERT INTO cost_accumulation (
                user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status
            ) VALUES (%s, %s, %s, %s, 'accumulating')
            ON CONFLICT (user_email, platform_id, status)
            DO UPDATE SET
                accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + %s,
                accumulated_tokens = cost_accumulation.accumulated_tokens + %s,
                updated_at = NOW()
            RETURNING accumulated_cost_brl""",
            (data['user_email'], platform_id, total_cost, total_tokens, total_cost, total_tokens)
        )

        accumulated = cursor.fetchone()

        conn.commit()
        print(f"[Creditos] Usage tracked: {total_tokens} tokens = R$ {total_cost:.6f}")
        print(f"[Creditos] Accumulated: R$ {accumulated['accumulated_cost_brl']}")

    except Exception as e:
        conn.rollback()
        print(f"[Creditos] Error tracking usage: {e}")
        raise
    finally:
        cursor.close()
        pool.putconn(conn)


def check_and_deduct_credits(user_email: str) -> dict:
    """Verifica acumulação e deduz créditos se necessário"""
    conn = pool.getconn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute('BEGIN')

        # Buscar platform_id
        cursor.execute(
            "SELECT id FROM platforms WHERE platform_code = %s",
            (PLATFORM_CODE,)
        )
        platform = cursor.fetchone()
        platform_id = platform['id']

        # Buscar acumulação
        cursor.execute(
            """SELECT id, accumulated_cost_brl, accumulated_tokens
               FROM cost_accumulation
               WHERE user_email = %s AND platform_id = %s AND status = 'accumulating'""",
            (user_email, platform_id)
        )
        accumulation = cursor.fetchone()

        accumulated_cost = float(accumulation['accumulated_cost_brl']) if accumulation else 0
        accumulated_tokens = accumulation['accumulated_tokens'] if accumulation else 0
        accumulation_id = accumulation['id'] if accumulation else None

        # Calcular créditos a deduzir
        credits_to_deduct = int(accumulated_cost // COST_PER_CREDIT)

        if credits_to_deduct == 0:
            conn.commit()

            cursor.execute(
                "SELECT credits_balance FROM users_credits WHERE user_email = %s",
                (user_email,)
            )
            user = cursor.fetchone()
            balance = user['credits_balance'] if user else 0

            return {
                'success': True,
                'message': 'No credits to deduct',
                'credits_balance': balance,
                'accumulated_cost': accumulated_cost,
                'cost_until_next_deduction': COST_PER_CREDIT - accumulated_cost
            }

        # Deduzir créditos
        cost_deducted = credits_to_deduct * COST_PER_CREDIT
        remaining_cost = accumulated_cost - cost_deducted

        cursor.execute(
            """UPDATE users_credits
               SET credits_balance = credits_balance - %s,
                   total_credits_used = total_credits_used + %s,
                   last_activity_at = NOW(),
                   updated_at = NOW()
               WHERE user_email = %s
               RETURNING credits_balance""",
            (credits_to_deduct, credits_to_deduct, user_email)
        )

        result = cursor.fetchone()
        if not result:
            raise Exception('User not found or insufficient credits')

        new_balance = result['credits_balance']

        # Registrar dedução
        cursor.execute(
            """INSERT INTO credit_deductions (
                user_email, platform_id,
                cost_accumulated_brl, tokens_accumulated,
                credits_deducted, credits_remaining
            ) VALUES (%s, %s, %s, %s, %s, %s)""",
            (user_email, platform_id, cost_deducted, accumulated_tokens,
             credits_to_deduct, new_balance)
        )

        # Marcar acumulação como deduzida
        cursor.execute(
            """UPDATE cost_accumulation
               SET status = 'deducted',
                   deducted_at = NOW(),
                   credits_deducted = %s
               WHERE id = %s""",
            (credits_to_deduct, accumulation_id)
        )

        # Criar nova acumulação com o resto
        if remaining_cost > 0:
            cursor.execute(
                """INSERT INTO cost_accumulation (
                    user_email, platform_id,
                    accumulated_cost_brl, accumulated_tokens, status
                ) VALUES (%s, %s, %s, 0, 'accumulating')""",
                (user_email, platform_id, remaining_cost)
            )

        conn.commit()

        print(f"[Creditos] Deducted {credits_to_deduct} credits from {user_email}")
        print(f"[Creditos] New balance: {new_balance}")

        return {
            'success': True,
            'message': f'{credits_to_deduct} credit(s) deducted',
            'credits_balance': new_balance,
            'credits_deducted': credits_to_deduct,
            'accumulated_cost': remaining_cost,
            'cost_until_next_deduction': COST_PER_CREDIT - remaining_cost
        }

    except Exception as e:
        conn.rollback()
        print(f"[Creditos] Error: {e}")
        raise
    finally:
        cursor.close()
        pool.putconn(conn)
```

### 4. Exemplo de Uso (Python)

```python
from creditos_centralizados import track_usage, check_and_deduct_credits

# Registrar uso
track_usage({
    'user_email': 'user@example.com',
    'model_code': 'gemini-2.5-flash',
    'input_tokens': 1000,
    'output_tokens': 500,
    'audio_tokens': 0,
    'request_duration_ms': 2000,
    'status': 'success'
})

# Verificar e deduzir
result = check_and_deduct_credits('user@example.com')
print(result)
```

---

## PHP

### 1. Configuração (.env)

```bash
DATABASE_URL_CREDITOS=postgresql://postgres:senha@host:6432/Creditos_Ensinoplus?sslmode=disable
```

### 2. Biblioteca de Créditos (CreditosCentralizados.php)

```php
<?php

class CreditosCentralizados {
    private $pdo;
    private const PLATFORM_CODE = 'sua_plataforma'; // Altere aqui!
    private const COST_PER_CREDIT = 0.04;

    public function __construct() {
        $dsn = getenv('DATABASE_URL_CREDITOS');
        $this->pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    }

    public function trackUsage(array $data): void {
        try {
            $this->pdo->beginTransaction();

            // 1. Buscar platform_id
            $stmt = $this->pdo->prepare(
                "SELECT id FROM platforms WHERE platform_code = ?"
            );
            $stmt->execute([self::PLATFORM_CODE]);
            $platform = $stmt->fetch();

            if (!$platform) {
                throw new Exception("Platform " . self::PLATFORM_CODE . " not found");
            }

            $platformId = $platform['id'];

            // 2. Buscar model_id e preços
            $stmt = $this->pdo->prepare(
                "SELECT id, cost_input_brl, cost_output_brl, cost_audio_brl
                 FROM ai_models
                 WHERE model_code = ? AND is_active = true"
            );
            $stmt->execute([$data['model_code']]);
            $model = $stmt->fetch();

            if (!$model) {
                throw new Exception("Model {$data['model_code']} not found");
            }

            // 3. Calcular custos
            $costInput = ($data['input_tokens'] / 1000000) * floatval($model['cost_input_brl']);
            $costOutput = ($data['output_tokens'] / 1000000) * floatval($model['cost_output_brl']);
            $audioTokens = $data['audio_tokens'] ?? 0;
            $costAudio = ($audioTokens / 1000000) * floatval($model['cost_audio_brl'] ?? 0);
            $totalCost = $costInput + $costOutput + $costAudio;
            $totalTokens = $data['input_tokens'] + $data['output_tokens'] + $audioTokens;

            // 4. Inserir em usage_tracking
            $stmt = $this->pdo->prepare(
                "INSERT INTO usage_tracking (
                    platform_id, user_email, model_id,
                    input_tokens, output_tokens, audio_tokens, total_tokens,
                    cost_input_brl, cost_output_brl, cost_audio_brl, total_cost_brl,
                    request_duration_ms, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            $stmt->execute([
                $platformId, $data['user_email'], $model['id'],
                $data['input_tokens'], $data['output_tokens'], $audioTokens, $totalTokens,
                $costInput, $costOutput, $costAudio, $totalCost,
                $data['request_duration_ms'], $data['status']
            ]);

            // 5. Atualizar acumulação
            $stmt = $this->pdo->prepare(
                "INSERT INTO cost_accumulation (
                    user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status
                ) VALUES (?, ?, ?, ?, 'accumulating')
                ON CONFLICT (user_email, platform_id, status)
                DO UPDATE SET
                    accumulated_cost_brl = cost_accumulation.accumulated_cost_brl + ?,
                    accumulated_tokens = cost_accumulation.accumulated_tokens + ?,
                    updated_at = NOW()
                RETURNING accumulated_cost_brl"
            );

            $stmt->execute([
                $data['user_email'], $platformId, $totalCost, $totalTokens,
                $totalCost, $totalTokens
            ]);

            $this->pdo->commit();

            error_log("[Creditos] Usage tracked: {$totalTokens} tokens = R$ " . number_format($totalCost, 6));

        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("[Creditos] Error: " . $e->getMessage());
            throw $e;
        }
    }

    public function checkAndDeductCredits(string $userEmail): array {
        try {
            $this->pdo->beginTransaction();

            // Buscar platform_id
            $stmt = $this->pdo->prepare(
                "SELECT id FROM platforms WHERE platform_code = ?"
            );
            $stmt->execute([self::PLATFORM_CODE]);
            $platform = $stmt->fetch();
            $platformId = $platform['id'];

            // Buscar acumulação
            $stmt = $this->pdo->prepare(
                "SELECT id, accumulated_cost_brl, accumulated_tokens
                 FROM cost_accumulation
                 WHERE user_email = ? AND platform_id = ? AND status = 'accumulating'"
            );
            $stmt->execute([$userEmail, $platformId]);
            $accumulation = $stmt->fetch();

            $accumulatedCost = $accumulation ? floatval($accumulation['accumulated_cost_brl']) : 0;
            $creditsToDeduct = intval(floor($accumulatedCost / self::COST_PER_CREDIT));

            if ($creditsToDeduct === 0) {
                $this->pdo->commit();

                $stmt = $this->pdo->prepare(
                    "SELECT credits_balance FROM users_credits WHERE user_email = ?"
                );
                $stmt->execute([$userEmail]);
                $user = $stmt->fetch();
                $balance = $user ? $user['credits_balance'] : 0;

                return [
                    'success' => true,
                    'message' => 'No credits to deduct',
                    'credits_balance' => $balance,
                    'accumulated_cost' => $accumulatedCost
                ];
            }

            // Deduzir créditos
            $costDeducted = $creditsToDeduct * self::COST_PER_CREDIT;
            $remainingCost = $accumulatedCost - $costDeducted;

            $stmt = $this->pdo->prepare(
                "UPDATE users_credits
                 SET credits_balance = credits_balance - ?,
                     total_credits_used = total_credits_used + ?
                 WHERE user_email = ?
                 RETURNING credits_balance"
            );
            $stmt->execute([$creditsToDeduct, $creditsToDeduct, $userEmail]);
            $result = $stmt->fetch();
            $newBalance = $result['credits_balance'];

            // Marcar como deduzida
            $stmt = $this->pdo->prepare(
                "UPDATE cost_accumulation
                 SET status = 'deducted', credits_deducted = ?
                 WHERE id = ?"
            );
            $stmt->execute([$creditsToDeduct, $accumulation['id']]);

            // Nova acumulação
            if ($remainingCost > 0) {
                $stmt = $this->pdo->prepare(
                    "INSERT INTO cost_accumulation (
                        user_email, platform_id, accumulated_cost_brl, accumulated_tokens, status
                    ) VALUES (?, ?, ?, 0, 'accumulating')"
                );
                $stmt->execute([$userEmail, $platformId, $remainingCost]);
            }

            $this->pdo->commit();

            return [
                'success' => true,
                'message' => "{$creditsToDeduct} credit(s) deducted",
                'credits_balance' => $newBalance,
                'credits_deducted' => $creditsToDeduct
            ];

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
```

### 3. Exemplo de Uso (PHP)

```php
<?php
require_once 'CreditosCentralizados.php';

$creditos = new CreditosCentralizados();

// Registrar uso
$creditos->trackUsage([
    'user_email' => 'user@example.com',
    'model_code' => 'gemini-2.5-flash',
    'input_tokens' => 1000,
    'output_tokens' => 500,
    'audio_tokens' => 0,
    'request_duration_ms' => 2000,
    'status' => 'success'
]);

// Verificar e deduzir
$result = $creditos->checkAndDeductCredits('user@example.com');
print_r($result);
```

---

## Configuração de Ambiente

### PostgreSQL Connection String

```bash
# Formato para Node.js/PHP
DATABASE_URL_CREDITOS=postgresql://user:pass@host:port/Creditos_Ensinoplus?sslmode=disable

# Formato para Python
DATABASE_URL_CREDITOS=postgresql+psycopg2://user:pass@host:port/Creditos_Ensinoplus?sslmode=disable
```

### Registrar Nova Plataforma

```sql
INSERT INTO platforms (platform_code, platform_name, description, is_active)
VALUES ('sua_plataforma', 'Sua Plataforma', 'Descrição aqui', true);
```

---

**Próximo passo**: Teste a integração com o script de teste fornecido no [GUIA-INTEGRACAO-CREDITOS.md](GUIA-INTEGRACAO-CREDITOS.md)
