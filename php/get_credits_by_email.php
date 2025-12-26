<?php
// Endpoint para obter créditos do usuário pelo email
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Permite OPTIONS para CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Pega o email via GET ou POST
$email = '';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = isset($data['email']) ? trim($data['email']) : '';
}

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email não fornecido']);
    exit;
}

// Conexão com o banco de dados
require_once __DIR__ . '/../config.php';

try {
    // Busca usuário pelo email
    $stmt = $mysqli->prepare('SELECT id, email, credits FROM users WHERE email = ? AND is_admin = 0 LIMIT 1');
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

    // Verificar se tem plano ativo
    $has_active_plan = false;
    $data_expira = null;
    $email_user = $user['email'];

    // Fazer a chamada GET para a API externa
    $api_url = "https://ensinoplus2021.bubbleapps.io/version-live/api/1.1/wf/calcmachine?email_user=" . urlencode($email_user);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200 && $response) {
        $api_data = json_decode($response, true);

        if (isset($api_data['response']['data_expira'])) {
            $data_expira = $api_data['response']['data_expira'];

            $data_parts = explode('/', $data_expira);
            if (count($data_parts) == 3) {
                $data_expira_timestamp = mktime(0, 0, 0, $data_parts[1], $data_parts[0], $data_parts[2]);
                $hoje_timestamp = time();

                if ($data_expira_timestamp >= $hoje_timestamp) {
                    $has_active_plan = true;
                }
            }
        }
    }

    // Retorna os dados do usuário
    echo json_encode([
        'success' => true,
        'data' => [
            'email' => $user['email'],
            'credits' => (int)$user['credits'],
            'has_active_plan' => $has_active_plan,
            'plan_expires_at' => $data_expira
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro: ' . $e->getMessage()]);
}
?>
