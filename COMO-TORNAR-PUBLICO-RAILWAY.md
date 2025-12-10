# Como Tornar o Serviço Railway Público

Se seu serviço está marcado como "Private" ou você não consegue acessar a URL, siga estes passos:

## Passo a Passo para Tornar Público:

### 1. Acesse o Dashboard do Railway
- Vá para https://railway.app
- Faça login na sua conta
- Clique no seu projeto

### 2. Vá em Settings (Configurações)
- Clique na aba **"Settings"** (ícone de engrenagem ⚙️)
- Role até a seção **"Networking"** ou **"Domains"**

### 3. Gerar Domínio Público
- Procure por **"Public Domain"** ou **"Generate Domain"**
- Clique no botão **"Generate Domain"** ou **"Generate Public Domain"**
- Railway vai gerar automaticamente uma URL pública

### 4. Aguardar
- Aguarde alguns segundos
- A URL vai aparecer na tela
- Será algo como: `your-app-name.up.railway.app`

### 5. Copiar a URL
- Copie a URL completa
- **IMPORTANTE:** Use `wss://` (não `https://`) para WebSocket
- Exemplo: `wss://your-app-name.up.railway.app`

## Se Não Aparecer a Opção "Generate Domain":

### Verificar se o Serviço Está Rodando:
1. Vá na aba **"Deployments"**
2. Verifique se há um deployment com status **"Active"** ou **"Running"**
3. Se não houver, você precisa fazer deploy primeiro

### Fazer Deploy:
1. Vá na aba **"Deployments"**
2. Clique em **"New Deployment"** ou **"Redeploy"**
3. Aguarde o deploy terminar
4. Depois, volte em Settings → Networking e gere o domínio

## Alternativa: Usar o Menu do Serviço

1. **No dashboard, clique no card do seu serviço**
2. **Clique nos 3 pontinhos** (menu) no canto superior direito
3. **Procure por "Generate Domain"** ou **"Public URL"**
4. **Clique e aguarde**

## Verificar se Está Público:

1. **Acesse a URL gerada** no navegador
2. **Adicione `/health` no final:**
   ```
   https://your-app.up.railway.app/health
   ```
3. **Deve retornar:**
   ```json
   {"status":"ok","connections":0,"timestamp":"..."}
   ```
4. **Se funcionar, está público!** ✅

## Configurar no Vercel:

Depois de ter a URL pública:

1. **Vá no Vercel Dashboard**
2. **Seu projeto → Settings → Environment Variables**
3. **Adicione:**
   ```
   VITE_WS_URL=wss://your-app-name.up.railway.app
   ```
4. **Substitua `your-app-name.up.railway.app` pela URL real**
5. **Salve e faça redeploy no Vercel**

## Troubleshooting:

### Erro: "Service is private"
- **Solução:** Gere um domínio público em Settings → Networking

### Erro: "Domain not found"
- **Solução:** Aguarde alguns minutos após gerar o domínio
- **Solução:** Verifique se o serviço está rodando

### Erro: "Connection refused"
- **Solução:** Verifique se o servidor está rodando (Deployments → Status)
- **Solução:** Verifique os logs para ver se há erros

### Não Consigo Encontrar "Generate Domain"
- **Solução:** Certifique-se de que o serviço está deployado
- **Solução:** Tente fazer um novo deploy
- **Solução:** Verifique se você está na aba correta (Settings → Networking)

## Dica:

Se você já tem uma URL mas ela não está funcionando:
1. **Delete o domínio atual** (Settings → Networking → Delete Domain)
2. **Gere um novo domínio** (Generate Domain)
3. **Atualize a variável no Vercel** com a nova URL

---

**Resumo:** Settings → Networking → Generate Domain → Copiar URL → Adicionar no Vercel com `wss://` 🚀

