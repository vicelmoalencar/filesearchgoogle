<?php
require_once 'includes/auth_middleware.php';
require_once '../includes/database.php';

// Brevo API configuration
// IMPORTANTE: Adicione sua API key do Brevo em um arquivo .env ou configure no servidor
define('BREVO_API_KEY', getenv('BREVO_API_KEY') ?: 'your-brevo-api-key-here');

// Processamento de ações
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    try {
        $db = new Database();
        $db->begin_transaction();
        
        switch ($action) {
            case 'add_credits':
                $user_id = $_POST['user_id'] ?? 0;
                $credits = intval($_POST['credits'] ?? 0);
                
                if ($credits <= 0) {
                    throw new Exception('Quantidade de créditos inválida');
                }
                
                // Atualiza créditos do usuário
                $stmt = $db->prepare("UPDATE users SET credits = credits + ? WHERE id = ?");
                $stmt->bind_param('ii', $credits, $user_id);
                $stmt->execute();
                
                if ($stmt->affected_rows !== 1) {
                    throw new Exception('Usuário não encontrado');
                }
                
                // Registra a operação
                $stmt = $db->prepare("INSERT INTO credit_logs (user_id, action, credits_changed, credits_remaining) 
                                    SELECT ?, 'add', ?, credits 
                                    FROM users WHERE id = ?");
                $stmt->bind_param('iii', $user_id, $credits, $user_id);
                $stmt->execute();
                
                $db->commit();
                $_SESSION['flash'] = ['type' => 'success', 'message' => 'Créditos adicionados com sucesso'];
                break;
                
            case 'create_user':
                $username = $_POST['username'] ?? '';
                $email = $_POST['email'] ?? '';
                $password = $_POST['password'] ?? '';
                $initial_credits = intval($_POST['initial_credits'] ?? 0);
                
                if (empty($username) || empty($email) || empty($password)) {
                    throw new Exception('Todos os campos são obrigatórios');
                }
                
                // Verifica se usuário já existe
                $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
                $stmt->bind_param('ss', $username, $email);
                $stmt->execute();
                
                if ($stmt->get_result()->num_rows > 0) {
                    throw new Exception('Usuário ou email já existe');
                }
                
                // Cria o usuário
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $api_key = bin2hex(random_bytes(32));
                
                $stmt = $db->prepare("INSERT INTO users (username, email, password, credits, api_key) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param('sssis', $username, $email, $hashed_password, $initial_credits, $api_key);
                $stmt->execute();
                
                $user_id = $db->insert_id;
                
                // Registra os créditos iniciais
                if ($initial_credits > 0) {
                    $stmt = $db->prepare("INSERT INTO credit_logs (user_id, action, credits_changed, credits_remaining) VALUES (?, 'initial', ?, ?)");
                    $stmt->bind_param('iii', $user_id, $initial_credits, $initial_credits);
                    $stmt->execute();
                }
                
                $db->commit();
                $_SESSION['flash'] = ['type' => 'success', 'message' => 'Usuário criado com sucesso'];
                break;

            case 'delete_user':
                $user_id = $_POST['user_id'] ?? 0;
                
                // Verifica se o usuário existe e não é admin
                $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND is_admin = 0");
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                
                if ($stmt->get_result()->num_rows !== 1) {
                    throw new Exception('Usuário não encontrado');
                }
                
                // Exclui os logs do usuário
                $stmt = $db->prepare("DELETE FROM credit_logs WHERE user_id = ?");
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                
                // Exclui o usuário
                $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                
                $db->commit();
                $_SESSION['flash'] = ['type' => 'success', 'message' => 'Usuário excluído com sucesso'];
                break;
                
            case 'check_cct_status':
                $user_id = $_POST['user_id'] ?? 0;
                $email = $_POST['email'] ?? '';
                
                if (empty($email)) {
                    throw new Exception('Email não fornecido');
                }
                
                // Fazer a chamada GET para a API externa
                $api_url = "https://ensinoplus2021.bubbleapps.io/version-live/api/1.1/wf/calcmachine?email_user=" . urlencode($email);
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $api_url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                $status_message = 'Não verificado';
                $status_type = 'warning';
                
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
                            
                            // Se a data de expiração for igual ou posterior à data atual, é um usuário CCT válido
                            if ($data_expira_timestamp >= $hoje_timestamp) {
                                $status_message = 'Válido até ' . $data_expira;
                                $status_type = 'success';
                            } else {
                                $status_message = 'Expirado em ' . $data_expira;
                                $status_type = 'danger';
                            }
                        }
                    } else {
                        $status_message = 'Sem plano CCT';
                        $status_type = 'secondary';
                    }
                } else {
                    $status_message = 'Erro ao verificar';
                    $status_type = 'danger';
                }
                
                $_SESSION['cct_status'][$user_id] = [
                    'message' => $status_message,
                    'type' => $status_type
                ];
                
                $_SESSION['flash'] = ['type' => 'info', 'message' => 'Status CCT verificado para ' . $email];
                break;
                
            case 'notify_version':
                $user_id = $_POST['user_id'] ?? 0;
                $email = $_POST['email'] ?? '';
                $version_number = $_POST['version_number'] ?? '';
                $version_details = $_POST['version_details'] ?? '';
                $email_subject = $_POST['email_subject'] ?? 'Nova versão disponível: ' . $version_number;
                
                if (empty($email) || empty($version_number) || empty($version_details) || empty($email_subject)) {
                    throw new Exception('Todos os campos são obrigatórios');
                }
                
                // Obter informações do usuário
                $stmt = $db->prepare("SELECT username FROM users WHERE id = ?");
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    throw new Exception('Usuário não encontrado');
                }
                
                $user = $result->fetch_assoc();
                $username = $user['username'];
                
                // Verificar se a tabela notification_logs existe e buscar a última notificação
                $last_notification_date = null;
                $tables_result = $db->query("SHOW TABLES LIKE 'notification_logs'");
                if ($tables_result && $tables_result->num_rows > 0) {
                    // Buscar a última notificação enviada para este usuário
                    $stmt = $db->prepare("SELECT created_at FROM notification_logs WHERE user_id = ? AND notification_type = 'version_update' ORDER BY created_at DESC LIMIT 1");
                    $stmt->bind_param('i', $user_id);
                    $stmt->execute();
                    $notification_result = $stmt->get_result();
                    
                    if ($notification_result->num_rows > 0) {
                        $notification_data = $notification_result->fetch_assoc();
                        $last_notification_date = $notification_data['created_at'];
                    }
                }
                
                // Preparar o email usando a API do Brevo
                $url = 'https://api.brevo.com/v3/smtp/email';
                $data = [
                    'sender' => [
                        'name' => 'CALC MACHINE',
                        'email' => 'contato@ensinoplus.com.br'
                    ],
                    'to' => [
                        [
                            'email' => $email,
                            'name' => $username
                        ]
                    ],
                    'subject' => $email_subject,
                    'htmlContent' => '<html><body>' .
                                    '<h1>Nova versão disponível: ' . htmlspecialchars($version_number) . '</h1>' .
                                    '<p>Olá ' . htmlspecialchars($username) . ',</p>' .
                                    '<p>Peço alguns segundos de sua preciosa atenção.</p>' .
                                    '<h2>O que há de novo:</h2>' .
                                    '<div><h4>' . nl2br(htmlspecialchars($version_details)) . '</h4></div>' .
                                    '<p>Atualize sua versão do sistema para a versão ' . htmlspecialchars($version_number) . '.</p>' .
                                    '<p><a href="https://ensinoplus.com.br/autocalc/download.php" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">BAIXAR NOVA VERSÃO</a></p>' .
                                    '<p>Ou acesse diretamente o link: <a href="https://ensinoplus.com.br/autocalc/download.php">https://ensinoplus.com.br/autocalc/download.php</a></p>' .
                                    '<p>Atenciosamente,<br>Equipe de Suporte</p>' .
                                    '</body></html>'
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'accept: application/json',
                    'api-key: ' . BREVO_API_KEY,
                    'content-type: application/json'
                ]);
                
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curl_error = curl_error($ch);
                curl_close($ch);
                
                // Log da resposta para depuração
                error_log("Brevo API Response: " . $response);
                error_log("Brevo API HTTP Code: " . $http_code);
                if (!empty($curl_error)) {
                    error_log("Brevo API Curl Error: " . $curl_error);
                }
                
                if ($http_code >= 200 && $http_code < 300) {
                    // Registrar o envio do email no banco de dados
                    try {
                        // Verificar se a tabela notification_logs existe
                        $table_exists = false;
                        $tables_result = $db->query("SHOW TABLES LIKE 'notification_logs'");
                        if ($tables_result && $tables_result->num_rows > 0) {
                            $table_exists = true;
                        }
                        
                        if ($table_exists) {
                            $stmt = $db->prepare("INSERT INTO notification_logs (user_id, notification_type, details) VALUES (?, 'version_update', ?)");
                            $details = json_encode(['version' => $version_number, 'details' => $version_details]);
                            $stmt->bind_param('is', $user_id, $details);
                            $stmt->execute();
                            
                            // Atualizar a sessão com a informação da última notificação
                            if (!isset($_SESSION['last_notification'])) {
                                $_SESSION['last_notification'] = [];
                            }
                            $_SESSION['last_notification'][$user_id] = date('Y-m-d H:i:s');
                        } else {
                            // Se a tabela não existir, apenas registra no log
                            error_log("Tabela notification_logs não existe. Pulando registro do log.");
                        }
                        
                        $db->commit();
                        $_SESSION['flash'] = ['type' => 'success', 'message' => 'Notificação enviada com sucesso para ' . $email];
                    } catch (Exception $log_error) {
                        // Mesmo se houver erro ao registrar, o email foi enviado
                        error_log("Erro ao registrar log de notificação: " . $log_error->getMessage());
                        $db->commit();
                        $_SESSION['flash'] = ['type' => 'success', 'message' => 'Email enviado com sucesso, mas houve um erro ao registrar: ' . $log_error->getMessage()];
                    }
                } else {
                    $error_data = json_decode($response, true);
                    $error_message = isset($error_data['message']) ? $error_data['message'] : 'Erro desconhecido';
                    
                    // Detalhes adicionais para depuração
                    $debug_info = "HTTP Code: {$http_code}, ";
                    $debug_info .= "Response: " . print_r($response, true);
                    error_log("Brevo API Error Details: " . $debug_info);
                    
                    throw new Exception('Falha ao enviar email: ' . $error_message . ' (Código: ' . $http_code . ')');
                }
                break;
                
            case 'generate_api_key':
                $user_id = $_POST['user_id'] ?? 0;
                
                // Verifica se o usuário existe
                $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
                $stmt->bind_param('i', $user_id);
                $stmt->execute();
                
                if ($stmt->get_result()->num_rows === 0) {
                    throw new Exception('Usuário não encontrado');
                }
                
                // Gera uma nova chave API
                $new_api_key = bin2hex(random_bytes(32));
                
                // Atualiza a chave API do usuário
                $stmt = $db->prepare("UPDATE users SET api_key = ? WHERE id = ?");
                $stmt->bind_param('si', $new_api_key, $user_id);
                $stmt->execute();
                
                if ($stmt->affected_rows !== 1) {
                    throw new Exception('Erro ao atualizar a chave API');
                }
                
                $db->commit();
                $_SESSION['flash'] = ['type' => 'success', 'message' => 'Chave API gerada com sucesso'];
                break;
        }
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollback();
        }
        $_SESSION['flash'] = ['type' => 'danger', 'message' => 'Erro: ' . $e->getMessage()];
    }
    
    header('Location: users.php');
    exit;
}

// Lista de usuários
try {
    $db = new Database();
    $result = $db->query("SELECT u.id, u.username, u.email, u.credits, u.api_key,
                         COUNT(DISTINCT cl.id) as total_operations,
                         MAX(cl.created_at) as last_operation
                         FROM users u 
                         LEFT JOIN credit_logs cl ON u.id = cl.user_id
                         WHERE u.is_admin = 0
                         GROUP BY u.id, u.username, u.email, u.credits, u.api_key
                         ORDER BY u.username");
    
    $users = $result->fetch_all(MYSQLI_ASSOC);
    
} catch (Exception $e) {
    $_SESSION['flash'] = ['type' => 'danger', 'message' => 'Erro ao carregar usuários'];
    $users = [];
}

// Define o título da página e o template a ser usado
$pageTitle = 'Gerenciar Usuários';
$content = 'templates/users.php';

// Inclui o layout
require_once 'templates/layout.php';
