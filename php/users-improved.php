<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar Usuários - CALC MACHINE</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #4F46E5;
            --secondary-color: #818CF8;
            --success-color: #10B981;
            --warning-color: #F59E0B;
            --danger-color: #EF4444;
            --dark-bg: #1F2937;
            --light-bg: #F9FAFB;
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container-main {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin: 40px auto;
            padding: 0;
            max-width: 1400px;
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 30px;
            border-radius: 16px 16px 0 0;
        }

        .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
        }

        .stats-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stats-card .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            margin: 0;
        }

        .stats-card .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .user-table {
            margin-top: 20px;
        }

        .user-table th {
            background-color: var(--dark-bg);
            color: white;
            font-weight: 600;
            padding: 15px;
            border: none;
        }

        .user-table td {
            padding: 15px;
            vertical-align: middle;
        }

        .user-table tbody tr:hover {
            background-color: rgba(79, 70, 229, 0.05);
            transition: all 0.3s ease;
        }

        .badge-credits {
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 1rem;
        }

        .badge-credits.low {
            background: linear-gradient(135deg, #F59E0B, #D97706);
        }

        .badge-credits.zero {
            background: linear-gradient(135deg, #EF4444, #DC2626);
        }

        .btn-action {
            margin: 2px;
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 0.85rem;
            transition: all 0.3s ease;
        }

        .btn-action:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .modal-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border-radius: 8px 8px 0 0;
        }

        .modal-header .btn-close {
            filter: brightness(0) invert(1);
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(79, 70, 229, 0.25);
        }

        .api-key-display {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 6px;
            word-break: break-all;
            font-size: 0.85rem;
            border: 1px solid #ddd;
        }

        .last-activity {
            font-size: 0.85rem;
            color: #6B7280;
        }

        .search-box {
            margin-bottom: 20px;
        }

        .search-box input {
            border-radius: 10px;
            padding: 12px 20px;
            border: 2px solid #E5E7EB;
        }

        .search-box input:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(79, 70, 229, 0.15);
        }

        .filter-section {
            background: var(--light-bg);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            .user-table {
                font-size: 0.85rem;
            }

            .btn-action {
                padding: 4px 8px;
                font-size: 0.75rem;
            }

            .stats-card .stat-number {
                font-size: 1.8rem;
            }
        }
    </style>
</head>
<body>
    <?php
    // Simulação de dados (substitua por consulta real ao banco)
    $users = [
        [
            'id' => 1,
            'username' => 'joao_silva',
            'email' => 'joao@email.com',
            'credits' => 150,
            'api_key' => 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            'total_operations' => 45,
            'last_operation' => '2025-12-26 14:30:00'
        ],
        [
            'id' => 2,
            'username' => 'maria_santos',
            'email' => 'maria@email.com',
            'credits' => 5,
            'api_key' => 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7',
            'total_operations' => 120,
            'last_operation' => '2025-12-26 10:15:00'
        ],
        [
            'id' => 3,
            'username' => 'pedro_costa',
            'email' => 'pedro@email.com',
            'credits' => 0,
            'api_key' => 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8',
            'total_operations' => 8,
            'last_operation' => '2025-12-20 18:45:00'
        ],
    ];

    $total_users = count($users);
    $total_credits = array_sum(array_column($users, 'credits'));
    $active_users = count(array_filter($users, function($u) { return $u['credits'] > 0; }));
    ?>

    <div class="container-main">
        <!-- Header -->
        <div class="header">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h1><i class="bi bi-people-fill me-2"></i>Gerenciar Usuários</h1>
                    <p class="mb-0 opacity-75">Sistema de administração de créditos - CALC MACHINE</p>
                </div>
                <button class="btn btn-light btn-lg" data-bs-toggle="modal" data-bs-target="#createUserModal">
                    <i class="bi bi-person-plus-fill me-2"></i>Novo Usuário
                </button>
            </div>
        </div>

        <div class="p-4">
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="stats-card">
                        <i class="bi bi-people fs-1 mb-2"></i>
                        <p class="stat-number"><?= $total_users ?></p>
                        <p class="stat-label">Total de Usuários</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stats-card" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);">
                        <i class="bi bi-coin fs-1 mb-2"></i>
                        <p class="stat-number"><?= number_format($total_credits, 0, ',', '.') ?></p>
                        <p class="stat-label">Total de Créditos</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stats-card" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);">
                        <i class="bi bi-graph-up-arrow fs-1 mb-2"></i>
                        <p class="stat-number"><?= $active_users ?></p>
                        <p class="stat-label">Usuários Ativos</p>
                    </div>
                </div>
            </div>

            <!-- Search and Filters -->
            <div class="filter-section">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <div class="search-box">
                            <input type="text" id="searchInput" class="form-control" placeholder="🔍 Buscar por nome, email ou API Key...">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex gap-2 justify-content-end">
                            <select class="form-select" id="filterCredits" style="max-width: 200px;">
                                <option value="all">Todos os créditos</option>
                                <option value="high">Alto (&gt; 50)</option>
                                <option value="low">Baixo (1-50)</option>
                                <option value="zero">Zero</option>
                            </select>
                            <button class="btn btn-outline-primary" onclick="exportToCSV()">
                                <i class="bi bi-download me-2"></i>Exportar CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Users Table -->
            <div class="table-responsive">
                <table class="table user-table" id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuário</th>
                            <th>Email</th>
                            <th class="text-center">Créditos</th>
                            <th>API Key</th>
                            <th class="text-center">Operações</th>
                            <th>Última Atividade</th>
                            <th class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($users as $user): ?>
                        <tr data-user-id="<?= $user['id'] ?>">
                            <td><strong>#<?= $user['id'] ?></strong></td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style="width: 40px; height: 40px;">
                                        <strong><?= strtoupper(substr($user['username'], 0, 1)) ?></strong>
                                    </div>
                                    <div>
                                        <strong><?= htmlspecialchars($user['username']) ?></strong>
                                    </div>
                                </div>
                            </td>
                            <td><?= htmlspecialchars($user['email']) ?></td>
                            <td class="text-center">
                                <span class="badge-credits <?= $user['credits'] == 0 ? 'zero' : ($user['credits'] < 50 ? 'low' : '') ?>">
                                    <i class="bi bi-coin me-1"></i><?= number_format($user['credits'], 0, ',', '.') ?>
                                </span>
                            </td>
                            <td>
                                <div class="api-key-display">
                                    <small><?= htmlspecialchars(substr($user['api_key'], 0, 20)) ?>...</small>
                                    <button class="btn btn-sm btn-link p-0 ms-2" onclick="copyToClipboard('<?= $user['api_key'] ?>')">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                </div>
                            </td>
                            <td class="text-center">
                                <span class="badge bg-info"><?= $user['total_operations'] ?></span>
                            </td>
                            <td>
                                <div class="last-activity">
                                    <i class="bi bi-clock-history me-1"></i>
                                    <?php
                                    $last = strtotime($user['last_operation']);
                                    echo $last ? date('d/m/Y H:i', $last) : 'Nunca';
                                    ?>
                                </div>
                            </td>
                            <td class="text-center">
                                <button class="btn btn-success btn-action btn-sm" data-bs-toggle="modal" data-bs-target="#addCreditsModal" onclick="setUserId(<?= $user['id'] ?>, '<?= $user['username'] ?>')">
                                    <i class="bi bi-plus-circle"></i> Créditos
                                </button>
                                <button class="btn btn-primary btn-action btn-sm" onclick="checkCCTStatus(<?= $user['id'] ?>, '<?= $user['email'] ?>')">
                                    <i class="bi bi-shield-check"></i> CCT
                                </button>
                                <button class="btn btn-warning btn-action btn-sm" data-bs-toggle="modal" data-bs-target="#notifyModal" onclick="setUserEmail(<?= $user['id'] ?>, '<?= $user['email'] ?>', '<?= $user['username'] ?>')">
                                    <i class="bi bi-envelope"></i> Avisar
                                </button>
                                <button class="btn btn-info btn-action btn-sm" onclick="regenerateAPIKey(<?= $user['id'] ?>)">
                                    <i class="bi bi-key"></i> API Key
                                </button>
                                <button class="btn btn-danger btn-action btn-sm" onclick="deleteUser(<?= $user['id'] ?>, '<?= $user['username'] ?>')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Modal: Adicionar Créditos -->
    <div class="modal fade" id="addCreditsModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-coin me-2"></i>Adicionar Créditos</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST">
                    <input type="hidden" name="action" value="add_credits">
                    <input type="hidden" name="user_id" id="credits_user_id">
                    <div class="modal-body">
                        <p>Usuário: <strong id="credits_username"></strong></p>
                        <div class="mb-3">
                            <label class="form-label">Quantidade de Créditos</label>
                            <input type="number" name="credits" class="form-control" min="1" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-success">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: Criar Usuário -->
    <div class="modal fade" id="createUserModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-person-plus-fill me-2"></i>Novo Usuário</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST">
                    <input type="hidden" name="action" value="create_user">
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Nome de Usuário</label>
                                <input type="text" name="username" class="form-control" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-control" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Senha</label>
                                <input type="password" name="password" class="form-control" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Créditos Iniciais</label>
                                <input type="number" name="initial_credits" class="form-control" value="0" min="0">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Criar Usuário</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: Notificar Usuário -->
    <div class="modal fade" id="notifyModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-envelope-fill me-2"></i>Enviar Notificação</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST">
                    <input type="hidden" name="action" value="notify_version">
                    <input type="hidden" name="user_id" id="notify_user_id">
                    <input type="hidden" name="email" id="notify_email">
                    <div class="modal-body">
                        <p>Enviando para: <strong id="notify_username"></strong></p>
                        <div class="mb-3">
                            <label class="form-label">Assunto do Email</label>
                            <input type="text" name="email_subject" class="form-control" value="Nova versão disponível" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Número da Versão</label>
                            <input type="text" name="version_number" class="form-control" placeholder="Ex: v2.0.1" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Detalhes da Atualização</label>
                            <textarea name="version_details" class="form-control" rows="5" required></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-warning">Enviar Notificação</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Funções auxiliares
        function setUserId(id, username) {
            document.getElementById('credits_user_id').value = id;
            document.getElementById('credits_username').textContent = username;
        }

        function setUserEmail(id, email, username) {
            document.getElementById('notify_user_id').value = id;
            document.getElementById('notify_email').value = email;
            document.getElementById('notify_username').textContent = username;
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('API Key copiada para a área de transferência!');
            });
        }

        function deleteUser(id, username) {
            if (confirm(`Tem certeza que deseja excluir o usuário "${username}"? Esta ação não pode ser desfeita.`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete_user">
                    <input type="hidden" name="user_id" value="${id}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function regenerateAPIKey(id) {
            if (confirm('Deseja gerar uma nova API Key? A chave antiga será invalidada.')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="generate_api_key">
                    <input type="hidden" name="user_id" value="${id}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function checkCCTStatus(id, email) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.innerHTML = `
                <input type="hidden" name="action" value="check_cct_status">
                <input type="hidden" name="user_id" value="${id}">
                <input type="hidden" name="email" value="${email}">
            `;
            document.body.appendChild(form);
            form.submit();
        }

        // Busca em tempo real
        document.getElementById('searchInput').addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#usersTable tbody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });

        // Filtro de créditos
        document.getElementById('filterCredits').addEventListener('change', function() {
            const filter = this.value;
            const rows = document.querySelectorAll('#usersTable tbody tr');

            rows.forEach(row => {
                const creditsText = row.querySelector('.badge-credits').textContent;
                const credits = parseInt(creditsText.replace(/\D/g, ''));

                let show = true;
                if (filter === 'high' && credits <= 50) show = false;
                if (filter === 'low' && (credits === 0 || credits > 50)) show = false;
                if (filter === 'zero' && credits !== 0) show = false;

                row.style.display = show ? '' : 'none';
            });
        });

        // Exportar CSV
        function exportToCSV() {
            const rows = Array.from(document.querySelectorAll('#usersTable tbody tr'));
            const csv = ['ID,Username,Email,Credits,Operations,Last Activity'];

            rows.forEach(row => {
                if (row.style.display !== 'none') {
                    const cells = row.querySelectorAll('td');
                    const data = [
                        cells[0].textContent.trim(),
                        cells[1].textContent.trim(),
                        cells[2].textContent.trim(),
                        cells[3].textContent.replace(/\D/g, ''),
                        cells[5].textContent.trim(),
                        cells[6].textContent.trim()
                    ];
                    csv.push(data.join(','));
                }
            });

            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'usuarios_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
        }
    </script>
</body>
</html>
