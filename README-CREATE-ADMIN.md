# Como Criar o Admin - Guia Rápido

## ⚠️ Problema: 404 Not Found

Se você recebeu erro 404, o arquivo pode não ter sido deployado ainda. Siga estes passos:

## ✅ Solução 1: Fazer Novo Deploy

1. **Commit e push todas as mudanças:**
   ```bash
   git add .
   git commit -m "Add admin system"
   git push
   ```

2. **Aguarde o deploy no Vercel** (geralmente 1-2 minutos)

3. **Tente novamente** acessando:
   ```
   https://seu-app.vercel.app/api/create-admin
   ```

## ✅ Solução 2: Usar GET ou POST

O endpoint `/api/create-admin` aceita tanto GET quanto POST:
- **GET:** `https://seu-app.vercel.app/api/create-admin`
- **POST:** `https://seu-app.vercel.app/api/create-admin` (com body JSON)

## ✅ Solução 3: Criar Admin Diretamente no Banco

Se os endpoints não funcionarem, você pode criar o admin diretamente no banco de dados:

### No Neon Dashboard:

1. Acesse o dashboard do Neon
2. Vá em **SQL Editor**
3. Execute:

```sql
-- Primeiro, verifique se o usuário existe
SELECT * FROM users WHERE username_lower = 'luizao';

-- Se não existir, você precisa criar primeiro via registro normal
-- Depois execute:
UPDATE users 
SET is_admin = true 
WHERE username_lower = 'luizao';
```

### Ou crie o usuário completo:

```sql
-- Hash da senha "luizao" (SHA-256 com salt)
-- Você pode gerar isso ou usar o endpoint de registro primeiro

-- 1. Primeiro registre o usuário normalmente pelo jogo
-- 2. Depois torne-o admin:
UPDATE users 
SET is_admin = true 
WHERE username_lower = 'luizao';
```

## ✅ Solução 4: Via Vercel Functions Dashboard

1. Acesse **Vercel Dashboard** → Seu Projeto
2. Vá em **Functions**
3. Procure por `create-admin`
4. Se não aparecer, o arquivo não foi deployado ainda
5. Faça um novo deploy

## ✅ Solução 5: Verificar se o Arquivo Existe

No seu repositório, verifique se existe:
- `api/create-admin.ts` ✅

Se não existirem, você precisa fazer commit e push.

## 🔍 Verificação

Após criar o admin:

1. **Faça login** no jogo:
   - Username: `luizao`
   - Password: `luizao`

2. **Verifique o botão de admin:**
   - Deve aparecer um ícone de escudo 🛡️ no canto superior direito

## 📝 Nota Importante

O erro 404 geralmente significa que:
- O arquivo não foi commitado
- O deploy não incluiu o arquivo
- A rota está incorreta

**Solução:** Faça commit, push e aguarde o novo deploy!

