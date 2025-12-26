<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Permite OPTIONS para CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Permite apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Lê o JSON enviado
$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? trim($data['email']) : '';
$credits_to_deduct = isset($data['credits']) ? (int)$data['credits'] : 2;

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email não fornecido']);
    exit;
}

// Conexão com o banco de dados
require_once __DIR__ . '/../config.php';

try {
    // Busca usuário pelo email
    $stmt = $mysqli->prepare('SELECT id, credits, email FROM users WHERE email = ? AND is_admin = 0 LIMIT 1');
    if (!$stmt) {
        throw new Exception('Erro no prepare: ' . $mysqli->error);
    }

    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        throw new Exception('Erro no get_result: ' . $stmt->error);
    }

    $user = $result->fetch_assoc();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
        exit;
    }

    // Verificar se tem créditos suficientes
    if ($user['credits'] < $credits_to_deduct) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Créditos insuficientes', 'credits' => (int)$user['credits']]);
        exit;
    }

    // Verificar se o usuário tem uma data de expiração na API externa (plano ativo)
    $has_active_plan = false;
    $email_user = $user['email'];

    // Fazer a chamada GET para a API externa
    $api_url = "https://ensinoplus2021.bubbleapps.io/version-live/api/1.1/wf/calcmachine?email_user=" . urlencode($email_user);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // Timeout de 5 segundos
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200 && $response) {
        $api_data = json_decode($response, true);

        // Verificar se existe o campo data_expira na resposta
        if (isset($api_data['response']['data_expira'])) {
            $data_expira = $api_data['response']['data_expira'];

            // Converter a data no formato dd/mm/yyyy para um timestamp
            $data_parts = explode('/', $data_expira);
            if (count($data_parts) == 3) {
                $data_expira_timestamp = mktime(0, 0, 0, $data_parts[1], $data_parts[0], $data_parts[2]);
                $hoje_timestamp = time();

                // Se a data de expiração for igual ou posterior à data atual, tem plano ativo
                if ($data_expira_timestamp >= $hoje_timestamp) {
                    $has_active_plan = true;
                }
            }
        }
    }

    // Define quantos créditos deduzir baseado no plano
    $credits_to_deduct_final = $has_active_plan ? 1 : $credits_to_deduct;

    // Deduz créditos
    $stmt = $mysqli->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
    $stmt->bind_param('ii', $credits_to_deduct_final, $user['id']);
    $stmt->execute();

    // Registra o log de crédito na tabela credit_logs
    $stmt = $mysqli->prepare('INSERT INTO credit_logs (user_id, action, credits_changed, credits_remaining, created_at) VALUES (?, ?, ?, ?, NOW())');
    $action = 'deduct';
    $credits_changed = -$credits_to_deduct_final;
    $credits_remaining = $user['credits'] - $credits_to_deduct_final;
    $stmt->bind_param('isii', $user['id'], $action, $credits_changed, $credits_remaining);
    $stmt->execute();

    // Registrar também no histórico do Supabase
    try {
        // Configurações do Supabase PostgreSQL
        $db_host = getenv('SUPABASE_DB_HOST') ?: 'aws-0-us-east-1.pooler.supabase.com';
        $db_port = getenv('SUPABASE_DB_PORT') ?: '6543';
        $db_name = getenv('SUPABASE_DB_NAME') ?: 'postgres';
        $db_user = getenv('SUPABASE_DB_USER') ?: 'postgres.jslshahzslzkpxnjkzrm';
        $db_pass = getenv('SUPABASE_DB_PASSWORD');

        if ($db_pass) {
            $dsn = "pgsql:host=$db_host;port=$db_port;dbname=$db_name";
            $pdo = new PDO($dsn, $db_user, $db_pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Buscar usuário no Supabase pelo email
            $stmt_pdo = $pdo->prepare("SELECT id FROM users WHERE email = :email");
            $stmt_pdo->execute(['email' => $email]);
            $supabase_user = $stmt_pdo->fetch();

            if ($supabase_user) {
                // Registrar no histórico do Supabase
                $stmt_pdo = $pdo->prepare("
                    INSERT INTO credit_usage_history (
                        user_id,
                        action,
                        model_id,
                        model_name,
                        input_tokens,
                        output_tokens,
                        credits_used,
                        cost_usd,
                        created_at
                    ) VALUES (
                        :user_id,
                        :action,
                        :model_id,
                        :model_name,
                        0,
                        0,
                        :credits_used,
                        :cost_usd,
                        NOW()
                    )
                ");

                $cost_usd = $credits_to_deduct_final * 0.01;

                $stmt_pdo->execute([
                    'user_id' => $supabase_user['id'],
                    'action' => 'gerar_calculo',
                    'model_id' => 'pje-calc-automation',
                    'model_name' => 'Automação PJe-Calc',
                    'credits_used' => $credits_to_deduct_final,
                    'cost_usd' => $cost_usd
                ]);
            }
        }
    } catch (Exception $supabase_error) {
        // Falha ao registrar no Supabase não deve bloquear a operação
        error_log('Erro ao registrar histórico no Supabase: ' . $supabase_error->getMessage());
    }

    // Retorna mensagem apropriada
    if ($has_active_plan) {
        echo json_encode([
            'success' => true,
            'message' => 'Usuário com plano ativo, deduzido 1 crédito',
            'credits_remaining' => $credits_remaining,
            'credits_deducted' => 1
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Créditos deduzidos com sucesso',
            'credits_remaining' => $credits_remaining,
            'credits_deducted' => $credits_to_deduct_final
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
    exit;
}
?>
