<?php
// Arquivo para exibir os créditos do usuário de forma simples
// Este arquivo deve ser colocado no servidor em https://ensinoplus.com.br/autocalc/api/credits_display.php

// Inclui o arquivo de configuração
require_once 'config.php';

// Verifica se a API key foi fornecida
$api_key = isset($_GET['api_key']) ? trim($_GET['api_key']) : '';

if (!$api_key) {
    echo '<span style="color: #dc3545;">API Key não fornecida</span>';
    exit;
}

try {
    // Consulta os créditos do usuário
    $stmt = $mysqli->prepare('SELECT credits FROM users WHERE api_key = ? LIMIT 1');
    if (!$stmt) {
        throw new Exception('Erro no prepare: ' . $mysqli->error);
    }
    
    $stmt->bind_param('s', $api_key);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if (!$result) {
        throw new Exception('Erro no get_result: ' . $stmt->error);
    }
    
    $user = $result->fetch_assoc();
    
    if (!$user) {
        echo '<span style="color: #dc3545;">Usuário não encontrado</span>';
        exit;
    }
    
    // Exibe os créditos
    echo '<span style="color: #28a745;"><i class="bi bi-coin"></i> <strong>' . (int)$user['credits'] . '</strong> créditos disponíveis</span>';
    
} catch (Exception $e) {
    echo '<span style="color: #dc3545;">Erro: ' . htmlspecialchars($e->getMessage()) . '</span>';
}
?>
