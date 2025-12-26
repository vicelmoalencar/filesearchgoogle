#!/bin/bash

# Script de teste simples para verificar dedução de créditos
# Execute: bash test-simple.sh

echo "🧪 Teste de Dedução de Créditos"
echo "================================"
echo ""

# Configurações (ALTERE AQUI)
USER_ID="cole-aqui-o-user-id"
USER_EMAIL="seu@email.com"

echo "📋 Configuração:"
echo "   User ID: $USER_ID"
echo "   Email: $USER_EMAIL"
echo ""

# Verificar se servidor está rodando
echo "🔍 Verificando se servidor está rodando..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "⚠️  Servidor não está rodando na porta 3000"
    echo "   Execute: npm run dev"
    exit 1
fi
echo "✅ Servidor rodando"
echo ""

# Chamar API de verificação
echo "🔄 Chamando API /api/check-credits..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/check-credits \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"userEmail\": \"$USER_EMAIL\"
  }")

echo "📊 Resposta da API:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar créditos atuais via PHP
echo "💰 Verificando créditos no MySQL..."
CREDITS=$(curl -s -X POST https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\"}")

echo "📊 Créditos atuais:"
echo "$CREDITS" | jq '.' 2>/dev/null || echo "$CREDITS"
echo ""

echo "✅ Teste concluído!"
