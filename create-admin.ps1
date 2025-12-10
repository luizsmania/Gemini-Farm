# Script PowerShell para criar usuário admin
# Substitua YOUR_APP_URL pela URL do seu app Vercel

$APP_URL = "https://seu-app.vercel.app"

Write-Host "Criando usuário admin..." -ForegroundColor Yellow

$body = @{
    username = "luizao"
    password = "luizao"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$APP_URL/api/create-admin" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Resposta:" -ForegroundColor Green
$response | ConvertTo-Json

Write-Host "`nAdmin criado! Agora você pode fazer login com:" -ForegroundColor Cyan
Write-Host "Username: luizao" -ForegroundColor White
Write-Host "Password: luizao" -ForegroundColor White

