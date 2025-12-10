# Como Criar o Usuário Admin

Este guia explica como criar o usuário administrador no sistema.

## Método 1: Via Navegador (Mais Fácil)

1. **Acesse a URL do endpoint:**
   ```
   https://seu-app.vercel.app/api/create-admin
   ```

2. **Ou use o Vercel Dashboard:**
   - Vá para seu projeto no Vercel
   - Clique em **Deployments**
   - Selecione o deployment mais recente
   - Vá para a aba **Functions**
   - Encontre `api/create-admin`
   - Clique em **Invoke** para testar

## Método 2: Via Terminal (PowerShell - Windows)

1. **Abra o PowerShell**

2. **Execute o script:**
   ```powershell
   $APP_URL = "https://seu-app.vercel.app"
   $body = @{ username = "luizao"; password = "luizao" } | ConvertTo-Json
   Invoke-RestMethod -Uri "$APP_URL/api/create-admin" -Method POST -ContentType "application/json" -Body $body
   ```

   **Substitua `seu-app.vercel.app` pela URL real do seu app!**

## Método 3: Via Terminal (Bash/Linux/Mac)

1. **Execute:**
   ```bash
   curl -X POST "https://seu-app.vercel.app/api/create-admin" \
     -H "Content-Type: application/json" \
     -d '{"username":"luizao","password":"luizao"}'
   ```

## Método 4: Via Vercel CLI

1. **Instale o Vercel CLI** (se ainda não tiver):
   ```bash
   npm i -g vercel
   ```

2. **Execute:**
   ```bash
   vercel env pull
   vercel dev
   ```

3. **Em outro terminal, execute:**
   ```bash
   curl -X POST "http://localhost:3000/api/create-admin" \
     -H "Content-Type: application/json" \
     -d '{"username":"luizao","password":"luizao"}'
   ```

## Método 5: Diretamente no Banco de Dados (Neon/Supabase)

Se você tem acesso direto ao banco de dados:

1. **Acesse o dashboard do Neon/Supabase**
2. **Execute o SQL:**
   ```sql
   -- Primeiro, verifique se o usuário existe
   SELECT * FROM users WHERE username_lower = 'luizao';
   
   -- Se não existir, crie o usuário (você precisará do hash da senha)
   -- Ou use o endpoint /api/create-admin primeiro
   
   -- Se já existir, apenas torne-o admin:
   UPDATE users 
   SET is_admin = true 
   WHERE username_lower = 'luizao';
   ```

## Verificação

Após criar o admin:

1. **Faça login** no jogo com:
   - Username: `luizao`
   - Password: `luizao`

2. **Verifique o botão de admin:**
   - Você deve ver um ícone de escudo (🛡️) no canto superior direito
   - Clique nele para abrir o painel de administração

## Notas Importantes

- O endpoint `/api/create-admin` pode ser chamado múltiplas vezes com segurança
- Se o usuário já existir, ele será promovido a admin
- Se não existir, será criado como admin
- A senha padrão é `luizao` (você pode mudar depois se quiser)

## Troubleshooting

**Erro 500:**
- Verifique se o banco de dados está configurado
- Verifique os logs do Vercel para mais detalhes

**Usuário não aparece como admin:**
- Faça logout e login novamente
- Limpe o cache do navegador
- Verifique se `is_admin = true` no banco de dados

