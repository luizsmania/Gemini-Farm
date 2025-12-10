#!/bin/bash
# Script para criar usuário admin
# Substitua YOUR_APP_URL pela URL do seu app Vercel

APP_URL="https://seu-app.vercel.app"

echo "Criando usuário admin..."
curl -X POST "${APP_URL}/api/create-admin" \
  -H "Content-Type: application/json" \
  -d '{"username":"luizao","password":"luizao"}'

echo ""
echo "Admin criado! Agora você pode fazer login com:"
echo "Username: luizao"
echo "Password: luizao"

