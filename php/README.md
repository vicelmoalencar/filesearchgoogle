# 📁 Arquivos PHP para Upload no Servidor

Estes arquivos devem ser enviados para o servidor `ensinoplus.com.br`.

## 📤 Upload dos Arquivos

### 1. get_credits_by_email.php

**Localização no servidor:**
```
https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php
```

**Descrição:** Retorna os créditos do usuário pelo email em formato JSON.

**Como usar:**
```bash
# Via GET
https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php?email=usuario@exemplo.com

# Via POST
curl -X POST https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@exemplo.com"}'
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "data": {
    "email": "usuario@exemplo.com",
    "credits": 50,
    "has_active_plan": true,
    "plan_expires_at": "31/12/2025"
  }
}
```

**Resposta de erro:**
```json
{
  "success": false,
  "message": "Usuário não encontrado"
}
```

### 2. credits_display.php (já existente)

**Localização no servidor:**
```
https://ensinoplus.com.br/autocalc/api/credits_display.php
```

**Descrição:** Retorna HTML formatado com os créditos (para inclusão via iframe).

**Como usar:**
```
https://ensinoplus.com.br/autocalc/api/credits_display.php?api_key=chave_aqui
```

### 3. deduct_credits_by_email.php (já existente)

**Localização no servidor:**
```
https://ensinoplus.com.br/autocalc/api/deduct_credits_by_email.php
```

**Descrição:** Deduz créditos do usuário pelo email.

## 🔧 Configuração Necessária

### Certificar-se que existe:

1. **config.php** no diretório pai (`/autocalc/config.php`)
   - Deve conter a conexão MySQL via `$mysqli`

2. **Tabelas do banco de dados:**
   - `users` (com colunas: id, email, credits, is_admin)
   - `credit_logs` (para histórico)

3. **Permissões CORS:**
   - Os arquivos já incluem headers CORS
   - Permite requisições de qualquer origem

## 📋 Checklist de Upload

- [ ] Fazer upload de `get_credits_by_email.php` para `/autocalc/api/`
- [ ] Verificar que `config.php` existe em `/autocalc/`
- [ ] Testar endpoint via navegador ou Postman
- [ ] Verificar logs de erro do servidor se não funcionar

## 🧪 Como Testar

### 1. Teste direto no navegador:
```
https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php?email=seu_email@teste.com
```

### 2. Teste via curl:
```bash
curl "https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php?email=seu_email@teste.com"
```

### 3. Teste via Postman:
- Método: GET
- URL: `https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php`
- Query Params: `email` = `seu_email@teste.com`

## 🔍 Resolução de Problemas

### Erro 500 (Internal Server Error)
- Verificar se `config.php` existe
- Verificar logs de erro PHP no servidor
- Verificar permissões dos arquivos (644)

### Erro CORS
- Verificar se os headers estão corretos
- Testar direto no navegador (sem CORS)

### Usuário não encontrado
- Verificar se o email existe na tabela `users`
- Verificar se `is_admin = 0` (não admin)

### Erro de conexão MySQL
- Verificar credenciais em `config.php`
- Verificar se o servidor MySQL está rodando

## 📊 Integração com Next.js

O componente `CreditsDisplay.tsx` já está configurado para:
- Buscar créditos automaticamente quando o usuário está logado
- Atualizar a cada 60 segundos
- Mostrar status de plano premium
- Exibir data de expiração do plano

Certifique-se de que o arquivo PHP está acessível na URL correta para que o componente funcione.
