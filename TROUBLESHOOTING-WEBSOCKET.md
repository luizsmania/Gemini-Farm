# Troubleshooting: Servidor WebSocket Não Responde

Se `https://gemini-farm-production.up.railway.app/health` não retorna nada, siga estes passos:

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar se o Servidor Está Rodando

**No Railway Dashboard:**
1. Acesse https://railway.app
2. Clique no seu projeto
3. Vá na aba **"Deployments"**
4. Verifique o status:
   - ✅ **"Active"** ou **"Running"** = Servidor está rodando
   - ❌ **"Failed"** ou **"Crashed"** = Servidor não está rodando

**Se estiver "Failed" ou "Crashed":**
- Clique no deployment para ver os logs
- Procure por erros (geralmente em vermelho)
- Veja a seção "Troubleshooting" abaixo

### 2. Verificar os Logs

**No Railway:**
1. Clique no seu serviço
2. Vá na aba **"Logs"**
3. Procure por:
   - `WebSocket server running on port...` ✅ (servidor iniciou)
   - `Error: Cannot find module...` ❌ (falta dependência)
   - `EADDRINUSE` ❌ (porta já em uso)
   - `ECONNREFUSED` ❌ (problema de conexão)

### 3. Verificar Dependências

O servidor precisa do `socket.io`. Verifique:

**No Railway:**
1. Settings → Variables
2. Verifique se há um `package.json` no projeto
3. O Railway deve instalar automaticamente, mas pode falhar

**Solução:**
- Certifique-se de que o arquivo `websocket-server-package.json` existe
- Ou crie um `package.json` na raiz do projeto com:
```json
{
  "name": "gemini-farm-websocket",
  "version": "1.0.0",
  "main": "websocket-server-example.js",
  "scripts": {
    "start": "node websocket-server-example.js"
  },
  "dependencies": {
    "socket.io": "^4.7.5"
  }
}
```

### 4. Verificar Variáveis de Ambiente

**No Railway:**
1. Settings → Variables
2. Verifique se estas variáveis estão configuradas:
   - `PORT` (Railway define automaticamente, mas pode verificar)
   - `CLIENT_URL` ou `VITE_CLIENT_URL` (URL do seu app Vercel)
   - `API_URL` ou `VERCEL_URL` (URL do seu app Vercel)

**Exemplo:**
```
PORT=3001
CLIENT_URL=https://gemini-farm-umber.vercel.app
API_URL=https://gemini-farm-umber.vercel.app
```

### 5. Verificar Arquivo de Início

**No Railway:**
1. Settings → Service
2. Verifique o **"Start Command"**
3. Deve ser: `node websocket-server-example.js`
4. Ou deixe vazio se tiver `package.json` com script `start`

## 🛠️ Soluções Comuns

### Problema 1: Servidor Não Inicia

**Sintomas:** Logs mostram erro ao iniciar

**Soluções:**
1. **Falta socket.io:**
   ```bash
   # Adicione no Railway Settings → Variables:
   NIXPACKS_NODE_VERSION=18
   ```
   Ou crie `package.json` na raiz do projeto

2. **Arquivo não encontrado:**
   - Verifique se `websocket-server-example.js` está na raiz do projeto
   - Ou ajuste o "Start Command" no Railway

3. **Porta incorreta:**
   - Railway define `PORT` automaticamente
   - O código já usa `process.env.PORT || 3001`
   - Não precisa configurar manualmente

### Problema 2: Servidor Inicia mas Não Responde

**Sintomas:** Logs mostram "server running" mas `/health` não funciona

**Soluções:**
1. **Verificar se está escutando em 0.0.0.0:**
   - O código foi atualizado para escutar em `0.0.0.0`
   - Isso permite conexões externas

2. **Verificar firewall/proxy:**
   - Railway não precisa de configuração especial
   - Mas verifique se o serviço está público (não privado)

3. **Testar localmente primeiro:**
   ```bash
   # Instalar dependências
   npm install socket.io
   
   # Rodar servidor
   node websocket-server-example.js
   
   # Testar em outro terminal
   curl http://localhost:3001/health
   ```

### Problema 3: Erro de CORS ou Conexão

**Sintomas:** Servidor responde mas WebSocket não conecta

**Soluções:**
1. **Verificar CORS:**
   - Settings → Variables → `CLIENT_URL`
   - Deve ser a URL completa do seu app Vercel
   - Exemplo: `https://gemini-farm-umber.vercel.app`

2. **Verificar URL no cliente:**
   - Vercel → Settings → Environment Variables
   - `VITE_WS_URL=wss://gemini-farm-production.up.railway.app`
   - Use `wss://` (não `https://`)

## 📋 Checklist Rápido

Antes de pedir ajuda, verifique:

- [ ] Servidor está com status "Running" no Railway?
- [ ] Logs mostram "WebSocket server running on port..."?
- [ ] Arquivo `websocket-server-example.js` existe na raiz?
- [ ] `package.json` tem `socket.io` como dependência?
- [ ] Variável `CLIENT_URL` está configurada?
- [ ] Serviço está público (não privado)?
- [ ] Testou localmente primeiro?

## 🚀 Solução Rápida: Recriar Serviço

Se nada funcionar, tente recriar:

1. **No Railway:**
   - Delete o serviço atual
   - Crie um novo serviço
   - Conecte ao mesmo repositório
   - Configure as variáveis de ambiente
   - Faça deploy

2. **Ou use um template:**
   - Railway → New Project → Deploy from GitHub
   - Selecione seu repositório
   - Railway vai detectar automaticamente

## 📞 Próximos Passos

1. **Verifique os logs no Railway** (mais importante!)
2. **Copie os erros** que aparecem
3. **Teste localmente** para isolar o problema
4. **Verifique se todas as dependências estão instaladas**

## 💡 Dica

O endpoint `/health` deve retornar:
```json
{
  "status": "ok",
  "connections": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Se não retornar nada, o servidor provavelmente não está rodando ou está crashando ao iniciar. **Verifique os logs primeiro!**

---

**Ainda com problemas?** Compartilhe os logs do Railway que eu ajudo a diagnosticar! 🔍

