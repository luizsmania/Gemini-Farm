# Como Corrigir o Erro de WebSocket - Passo a Passo

## 🔍 Passo 1: Verificar se o Servidor Está Rodando no Railway

### 1.1 Acesse o Railway Dashboard
1. Vá para: https://railway.app
2. Faça login na sua conta
3. Clique no seu projeto (provavelmente "Gemini-Farm-1" ou similar)

### 1.2 Verificar Status do Serviço
1. No dashboard, você verá um card do seu serviço
2. **Verifique o status:**
   - ✅ **"Active"** ou **"Running"** = Servidor está rodando
   - ❌ **"Failed"** ou **"Crashed"** = Servidor não está rodando
   - ⏸️ **"Stopped"** = Servidor está parado

**Se estiver "Failed" ou "Crashed", vá para o Passo 2.**
**Se estiver "Active" ou "Running", vá para o Passo 3.**

---

## 📋 Passo 2: Verificar Logs do Railway (Se Servidor Não Está Rodando)

### 2.1 Acessar Logs
1. No Railway Dashboard, clique no seu serviço
2. Clique na aba **"Logs"** (ou "View Logs")
3. Role para ver os logs mais recentes

### 2.2 Procurar por Erros
Procure por mensagens em **vermelho** ou que começam com "Error":

**Erro Comum 1: "Cannot find module 'socket.io'"**
```
Error: Cannot find module 'socket.io'
```

**Solução:**
- O Railway precisa instalar as dependências
- Vá para **Settings → Variables**
- Verifique se há um `package.json` no projeto
- Se não houver, continue no Passo 4

**Erro Comum 2: "Cannot find module './database.js'"**
```
Error: Cannot find module './database.js'
```

**Solução:**
- O servidor WebSocket não precisa do database.js
- O código já foi atualizado para usar a API do Vercel
- Continue no Passo 4

**Erro Comum 3: "EADDRINUSE" (porta em uso)**
```
Error: listen EADDRINUSE: address already in use
```

**Solução:**
- Railway define a porta automaticamente
- O código já usa `process.env.PORT`
- Continue no Passo 4

### 2.3 Procurar por Mensagem de Sucesso
Procure por:
```
WebSocket server running on port...
```

**Se encontrar essa mensagem:**
- O servidor está rodando! ✅
- Vá para o Passo 3

**Se NÃO encontrar:**
- O servidor não iniciou corretamente
- Vá para o Passo 4

---

## 🔧 Passo 3: Testar o Endpoint /health (Se Servidor Está Rodando)

### 3.1 Testar no Navegador
1. Abra uma nova aba no navegador
2. Acesse: `https://gemini-farm-production.up.railway.app/health`
3. **O que deve aparecer:**
   ```json
   {"status":"ok","connections":0,"timestamp":"..."}
   ```

**Se aparecer o JSON acima:**
- ✅ Servidor está funcionando!
- O problema pode ser CORS ou configuração
- Vá para o Passo 5

**Se aparecer "Não foi possível conectar" ou página em branco:**
- ❌ Servidor não está respondendo
- Vá para o Passo 4

---

## 🛠️ Passo 4: Corrigir o Servidor WebSocket no Railway

### 4.1 Verificar Arquivo de Início
1. No Railway Dashboard, vá em **Settings → Service**
2. Procure por **"Start Command"** ou **"Command"**
3. **Deve estar:**
   ```
   node websocket-server-example.js
   ```
   Ou:
   ```
   npm start
   ```

**Se estiver vazio ou diferente:**
- Clique em "Edit"
- Digite: `node websocket-server-example.js`
- Salve

### 4.2 Verificar se o Arquivo Existe
1. No Railway Dashboard, vá em **Settings → Source**
2. Verifique se o arquivo `websocket-server-example.js` está no repositório
3. **Se não estiver:**
   - Você precisa fazer commit e push do arquivo
   - Vá para o Passo 6

### 4.3 Verificar Dependências
1. No Railway Dashboard, vá em **Settings → Variables**
2. **IMPORTANTE:** O Railway usa o `package.json` principal do projeto
3. **Verifique se `socket.io` está nas dependências:**
   - O `package.json` principal já tem `"type": "module"`
   - O arquivo `websocket-server-example.js` já foi convertido para ES modules (usa `import`)
   - **Mas precisa adicionar `socket.io` nas dependências:**
   
   **Adicione no `package.json` principal:**
   ```json
   "dependencies": {
     "@vercel/node": "^3.0.0",
     "@vercel/postgres": "^0.5.0",
     "lucide-react": "^0.556.0",
     "react": "^19.2.1",
     "react-dom": "^19.2.1",
     "socket.io-client": "^4.8.1",
     "socket.io": "^4.7.5"
   }
   ```
   - Faça commit e push
   - Vá para o Passo 6

### 4.4 Verificar Variáveis de Ambiente
1. No Railway Dashboard, vá em **Settings → Variables**
2. Verifique se estas variáveis estão configuradas:
   ```
   CLIENT_URL=https://gemini-farm-umber.vercel.app
   API_URL=https://gemini-farm-umber.vercel.app
   ```
3. **Se não estiverem:**
   - Clique em "New Variable"
   - Adicione cada uma
   - Salve

### 4.5 Fazer Redeploy
1. No Railway Dashboard, vá na aba **"Deployments"**
2. Clique nos 3 pontinhos do deployment mais recente
3. Clique em **"Redeploy"** ou **"Restart"**
4. Aguarde alguns minutos
5. Verifique os logs novamente (Passo 2)

---

## 🚀 Passo 5: Verificar Configuração no Vercel

### 5.1 Verificar Variável de Ambiente
1. Acesse: https://vercel.com
2. Seu projeto → **Settings → Environment Variables**
3. Procure por: `VITE_WS_URL`
4. **Deve estar:**
   ```
   VITE_WS_URL=wss://gemini-farm-production.up.railway.app
   ```

**Se estiver diferente ou errado:**
- Clique em "Edit"
- Corrija para: `wss://gemini-farm-production.up.railway.app`
- **IMPORTANTE:** Use `wss://` (não `https://`)
- Salve

### 5.2 Fazer Redeploy no Vercel
1. Vá em **Deployments**
2. Clique nos 3 pontinhos do deployment mais recente
3. Clique em **"Redeploy"**
4. Aguarde o deploy terminar

---

## ⚡ Passo 6: Solução Rápida - Desabilitar WebSocket Temporariamente

**Se você não conseguir fazer o servidor funcionar agora, pode desabilitar temporariamente:**

### 6.1 Remover Variável no Vercel
1. Vercel Dashboard → Settings → Environment Variables
2. Encontre `VITE_WS_URL`
3. Clique em "Delete" ou desmarque para todos os ambientes
4. Salve

### 6.2 Fazer Redeploy
1. Vá em Deployments
2. Clique em "Redeploy"
3. Aguarde terminar

**Resultado:**
- ✅ O jogo vai funcionar normalmente
- ✅ Sem erros no console
- ⚠️ Sem sincronização em tempo real (mas tudo mais funciona)

---

## ✅ Passo 7: Testar a Solução

### 7.1 Testar o Jogo
1. Abra o jogo: https://gemini-farm-umber.vercel.app
2. Abra o Console do navegador (F12)
3. **Procure por:**
   - ✅ "WebSocket connected" = Funcionando!
   - ⚠️ "WebSocket server not configured" = Desabilitado (OK)
   - ❌ Erros de conexão = Ainda com problema

### 7.2 Se Ainda Houver Erros
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página (Ctrl+F5)
3. Teste novamente

---

## 📝 Resumo Rápido

**Se o servidor Railway não está funcionando:**
1. ✅ Verifique logs (Passo 2)
2. ✅ Verifique Start Command (Passo 4.1)
3. ✅ Verifique se arquivo existe (Passo 4.2)
4. ✅ Verifique dependências (Passo 4.3)
5. ✅ Faça redeploy (Passo 4.5)

**Solução rápida (temporária):**
1. ✅ Remova `VITE_WS_URL` do Vercel (Passo 6)
2. ✅ Faça redeploy
3. ✅ Jogo funciona sem WebSocket

**Quando o servidor estiver funcionando:**
1. ✅ Teste `/health` (Passo 3)
2. ✅ Configure `VITE_WS_URL` no Vercel (Passo 5)
3. ✅ Faça redeploy
4. ✅ Teste o jogo (Passo 7)

---

## 🆘 Ainda com Problemas?

**Compartilhe:**
1. O que aparece nos logs do Railway (Passo 2)
2. O que aparece quando acessa `/health` (Passo 3)
3. O status do serviço no Railway (Passo 1)

Com essas informações, posso ajudar a diagnosticar melhor! 🔍

