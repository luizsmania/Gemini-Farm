# Guia de Deploy do Servidor WebSocket

Este guia vai te ajudar a fazer o deploy do servidor WebSocket para habilitar sincronização em tempo real.

## Opção 1: Railway (Recomendado - Mais Fácil) 🚀

### Passo 1: Criar Conta no Railway

1. Acesse https://railway.app
2. Clique em "Login" e faça login com GitHub
3. Railway oferece $5 grátis por mês (suficiente para começar)

### Passo 2: Criar Novo Projeto

1. No dashboard do Railway, clique em "New Project"
2. Selecione "Deploy from GitHub repo"
3. Selecione seu repositório `Gemini-Farm-1`
4. Railway vai detectar automaticamente

### Passo 3: Configurar o Servidor WebSocket

1. **Criar arquivo `railway.json`** (opcional, para configurar):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node websocket-server-example.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Criar arquivo `Procfile`** (alternativa):
```
web: node websocket-server-example.js
```

### Passo 4: Configurar Variáveis de Ambiente

No Railway dashboard:

1. Vá em **Variables**
2. Adicione as seguintes variáveis:

```
PORT=3001
CLIENT_URL=https://gemini-farm-umber.vercel.app
API_URL=https://gemini-farm-umber.vercel.app
NODE_ENV=production
```

**Importante:** Substitua `gemini-farm-umber.vercel.app` pela URL real do seu app Vercel!

### Passo 5: Deploy e Tornar Público

1. Railway vai fazer deploy automaticamente
2. Aguarde alguns minutos até o deploy terminar
3. **Tornar o serviço público:**
   - No dashboard do Railway, clique no seu projeto
   - Vá na aba **"Settings"** (Configurações) ⚙️
   - Role até a seção **"Networking"** ou **"Domains"**
   - **Se não aparecer URL pública:**
     - Clique em **"Generate Domain"** ou **"Generate Public Domain"**
     - Railway vai gerar uma URL pública automaticamente
     - Aguarde alguns segundos
   - **Você verá uma URL como:** `your-app.up.railway.app`
   - **Copie essa URL!** Você vai precisar dela
   
4. **Verificar se está funcionando:**
   - Acesse: `https://your-app.up.railway.app/health`
   - Deve retornar: `{"status":"ok","connections":0}`
   - Se funcionar, está público! ✅

### Passo 6: Configurar no Vercel

1. Vá no dashboard do Vercel
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione:

```
VITE_WS_URL=wss://your-app.up.railway.app
```

**Importante:** Use `wss://` (não `https://`) para WebSocket seguro!

### Passo 7: Testar

1. Faça commit e push das mudanças
2. Aguarde o deploy no Vercel
3. Abra o jogo em dois dispositivos diferentes
4. Faça uma mudança em um dispositivo
5. Deve aparecer no outro dispositivo instantaneamente! 🎉

---

## Opção 2: Render (Alternativa Gratuita) 🎨

### Passo 1: Criar Conta

1. Acesse https://render.com
2. Faça login com GitHub
3. Render oferece plano gratuito (com algumas limitações)

### Passo 2: Criar Novo Web Service

1. Clique em "New" → "Web Service"
2. Conecte seu repositório GitHub
3. Configure:
   - **Name:** `gemini-farm-websocket`
   - **Environment:** `Node`
   - **Build Command:** (deixe vazio)
   - **Start Command:** `node websocket-server-example.js`
   - **Instance Type:** Free (ou pago se preferir)

### Passo 3: Variáveis de Ambiente

Adicione as mesmas variáveis do Railway:
```
PORT=10000
CLIENT_URL=https://gemini-farm-umber.vercel.app
API_URL=https://gemini-farm-umber.vercel.app
```

### Passo 4: Deploy

1. Clique em "Create Web Service"
2. Aguarde o deploy (pode levar alguns minutos)
3. Render vai gerar uma URL: `https://your-app.onrender.com`

### Passo 5: Configurar no Vercel

Adicione no Vercel:
```
VITE_WS_URL=wss://your-app.onrender.com
```

---

## Opção 3: Fly.io (Alternativa) 🪰

### Passo 1: Instalar Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

### Passo 2: Login

```bash
fly auth login
```

### Passo 3: Criar App

```bash
fly launch
```

Siga as instruções e configure:
- Nome do app
- Região (escolha a mais próxima)

### Passo 4: Configurar

Crie arquivo `fly.toml`:
```toml
app = "seu-app-name"
primary_region = "gru"  # São Paulo

[build]

[env]
  PORT = "3001"
  CLIENT_URL = "https://gemini-farm-umber.vercel.app"
  API_URL = "https://gemini-farm-umber.vercel.app"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Passo 5: Deploy

```bash
fly deploy
```

### Passo 6: Configurar no Vercel

```
VITE_WS_URL=wss://seu-app-name.fly.dev
```

---

## Verificação e Troubleshooting

### Verificar se o Servidor Está Funcionando

1. Acesse: `https://your-websocket-server.com/health`
2. Deve retornar: `{"status":"ok","connections":0}`

### Problemas Comuns

**Erro: Connection refused**
- Verifique se o servidor está rodando
- Verifique a URL no Vercel (deve ser `wss://` não `https://`)

**Erro: CORS**
- Adicione sua URL do Vercel na variável `CLIENT_URL`
- Verifique se o servidor está permitindo CORS

**WebSocket não conecta**
- Verifique os logs do servidor
- Verifique se a porta está correta
- Verifique se o firewall está bloqueando

### Testar Localmente Primeiro

Antes de fazer deploy, teste localmente:

1. **Terminal 1 - Servidor WebSocket:**
```bash
# Instalar dependências do servidor
npm install socket.io

# Rodar servidor
node websocket-server-example.js
```

2. **Terminal 2 - Game:**
```bash
# Criar arquivo .env.local
echo "VITE_WS_URL=ws://localhost:3001" > .env.local

# Rodar game
npm run dev
```

3. **Testar:**
   - Abra o jogo em duas abas diferentes
   - Faça uma mudança em uma aba
   - Deve aparecer na outra aba instantaneamente!

---

## Próximos Passos

Depois que o servidor WebSocket estiver funcionando:

1. ✅ Sincronização em tempo real entre dispositivos
2. ✅ Notificações instantâneas
3. ✅ Melhor performance (menos requisições HTTP)
4. ✅ Experiência mais fluida

## Suporte

Se tiver problemas:
1. Verifique os logs do servidor WebSocket
2. Verifique o console do navegador (F12)
3. Verifique se as variáveis de ambiente estão corretas
4. Teste localmente primeiro

Boa sorte! 🚀

