# Como Encontrar a URL do Railway

Depois de fazer o deploy no Railway, você precisa encontrar a URL do seu servidor WebSocket. Aqui estão **3 formas** de encontrar:

## Método 1: Na Aba Settings (Mais Fácil) ⚙️

1. **Acesse o dashboard do Railway:** https://railway.app
2. **Clique no seu projeto** (Gemini-Farm-1 ou o nome que você deu)
3. **Clique na aba "Settings"** (ícone de engrenagem ⚙️)
4. **Role até a seção "Networking"** ou **"Domains"**
5. **Você verá algo como:**
   ```
   Public Domain: your-app.up.railway.app
   ```
6. **Copie essa URL!** Você vai precisar dela

## Método 2: Na Aba Deployments 📦

1. **No dashboard do Railway, clique no seu projeto**
2. **Clique na aba "Deployments"**
3. **Clique no deployment mais recente** (o que está no topo)
4. **A URL estará visível no topo da página**, geralmente em um card azul
5. **Copie a URL completa**

## Método 3: No Card do Serviço 🎯

1. **No dashboard do Railway, você verá um card do seu serviço**
2. **A URL geralmente aparece diretamente no card**
3. **Pode estar escrito como:**
   - `your-app.up.railway.app`
   - Ou um botão "Open" que mostra a URL

## Exemplo Visual:

```
┌─────────────────────────────────────┐
│  Gemini-Farm-WebSocket             │
│                                     │
│  Status: ✅ Running                 │
│  URL: your-app.up.railway.app      │ ← AQUI!
│  [Open] [Settings] [Logs]          │
└─────────────────────────────────────┘
```

## ⚠️ IMPORTANTE:

Depois de encontrar a URL, você precisa:

1. **Adicionar `wss://` na frente** (não `https://`)
   - ❌ Errado: `https://your-app.up.railway.app`
   - ✅ Correto: `wss://your-app.up.railway.app`

2. **Adicionar no Vercel:**
   - Vá no dashboard do Vercel
   - Seu projeto → Settings → Environment Variables
   - Adicione:
     ```
     VITE_WS_URL=wss://your-app.up.railway.app
     ```
   - Substitua `your-app.up.railway.app` pela URL real que você encontrou!

## Se Não Aparecer URL ou Estiver Privado:

Se a URL não aparecer ou estiver marcada como "Private":

1. **Vá em Settings → Networking** (ou **Settings → Domains**)
2. **Procure por "Public Domain"** ou **"Generate Domain"**
3. **Clique em "Generate Domain"** ou **"Generate Public Domain"**
4. **Railway vai gerar uma URL pública para você automaticamente**
5. **Aguarde alguns segundos** - a URL vai aparecer
6. **Copie a URL gerada** (será algo como `your-app.up.railway.app`)

**IMPORTANTE:** Se você não ver a opção "Generate Domain":
- Certifique-se de que o serviço está **deployado** (não apenas criado)
- Verifique se o serviço está **rodando** (Status: Running)
- Tente fazer um novo deploy se necessário

## Testar se Está Funcionando:

1. Acesse: `https://your-app.up.railway.app/health`
2. Deve retornar: `{"status":"ok","connections":0}`
3. Se funcionar, está tudo certo! ✅

## Dica Extra:

Você pode criar um domínio customizado também:
- Settings → Networking → Custom Domain
- Adicione um domínio seu (ex: `ws.seudominio.com`)
- Mas para começar, use a URL do Railway mesmo!

---

**Resumo:** A URL geralmente aparece no card do serviço ou em Settings → Networking. Procure por "Public Domain" ou "URL"! 🎯

