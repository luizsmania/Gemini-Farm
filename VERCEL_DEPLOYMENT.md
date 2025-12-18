# 🚀 Vercel Deployment Guide for Online Checkers

This guide will help you deploy the Online Checkers game so that multiple people can play together through your Vercel app.

## Architecture Overview

Since Vercel doesn't support persistent WebSocket connections, we need:

1. **Frontend**: Deployed on Vercel (React app)
2. **WebSocket Server**: Deployed on Railway/Render/Fly.io (handles real-time game logic)
3. **Database**: Vercel Postgres (stores match history)

All users accessing your Vercel app will connect to the same WebSocket server, allowing them to play together.

---

## Step 1: Deploy Frontend to Vercel

1. **Push your code to GitHub** (if not already done)

2. **Create Vercel Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables** (we'll complete these after deploying the WebSocket server)
   - Go to Settings → Environment Variables
   - Add `VITE_WS_URL` (we'll set this value in Step 2)

5. **Deploy**
   - Click "Deploy"
   - Note your Vercel URL (e.g., `https://your-app.vercel.app`)

---

## Step 2: Deploy WebSocket Server to Railway

Railway is recommended because it's free to start and easy to set up.

### Option A: Railway (Recommended)

1. **Create Railway Account**
   - Go to [Railway](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway will auto-detect your project
   - The `railway.json` file should configure it automatically
   - If not, set Start Command: `npx tsx server.ts`

4. **Add Environment Variables**
   - Click on your service → Variables
   - Add:
     ```
     CLIENT_URL=https://your-app.vercel.app
     POSTGRES_URL=your_postgres_url_here
     NODE_ENV=production
     ```
   - **Important**: Set `CLIENT_URL` to your Vercel app URL (from Step 1)

5. **Generate Public Domain**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy the domain (e.g., `your-app.up.railway.app`)

6. **Update Vercel Environment Variables**
   - Go back to Vercel → Settings → Environment Variables
   - **If `VITE_WS_URL` already exists**: Click on it to edit the existing variable
   - **If `VITE_WS_URL` doesn't exist**: Click "Add New" to create it
   - Set the value to: `wss://your-app.up.railway.app` (or `https://your-app.up.railway.app` - both work)
   - Make sure to use `wss://` or `https://` (secure) not `ws://` or `http://`
   - Ensure it's enabled for **Production**, **Preview**, and **Development** environments
   - **Note**: If you see an error "variable already exists", it means the variable is already there - just edit it instead of trying to add a new one
   - **Important**: The code automatically converts `wss://` to `https://` for Socket.IO compatibility

7. **Redeploy Vercel**
   - After setting `VITE_WS_URL`, go to Deployments
   - Click "..." → "Redeploy" on the latest deployment
   - This ensures the frontend uses the new WebSocket URL

### Option B: Render (Alternative)

1. Go to [Render](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Start Command: `npx tsx server.ts`
   - Environment Variables:
     - `CLIENT_URL=https://your-app.vercel.app`
     - `POSTGRES_URL=your_postgres_url`
5. Copy the Render URL and use it in Vercel's `VITE_WS_URL`

---

## Step 3: Set Up Database (Vercel Postgres)

1. **Create Postgres Database**
   - In Vercel Dashboard, go to your project
   - Click "Storage" tab
   - Click "Create Database" → "Postgres"
   - Follow the setup wizard

2. **Get Connection String**
   - Vercel automatically creates environment variables:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`

3. **Add to Railway/Render**
   - Copy the `POSTGRES_URL` from Vercel
   - Add it as `POSTGRES_URL` environment variable in Railway/Render
   - The WebSocket server will use this to initialize the database schema

---

## Step 4: Verify Deployment

1. **Check WebSocket Server**
   - Visit `https://your-railway-app.up.railway.app/health`
   - Should return JSON with status: "ok"

2. **Test Frontend**
   - Visit your Vercel app URL
   - Open browser console (F12)
   - Try to set a nickname
   - Should see "WebSocket connected" in console

3. **Test Multiplayer**
   - Open your Vercel app in two different browser windows/tabs
   - Set different nicknames
   - One creates a lobby, the other joins
   - Game should start automatically

---

## Environment Variables Summary

### Vercel (Frontend)
```env
VITE_WS_URL=wss://your-app.up.railway.app
```

### Railway/Render (WebSocket Server)
```env
CLIENT_URL=https://your-app.vercel.app
POSTGRES_URL=postgresql://... (from Vercel)
NODE_ENV=production
PORT=3000 (auto-set by Railway/Render)
```

---

## Troubleshooting

### "Failed to connect to server" or "Server did not respond"
- **Check Railway/Render service is running**
  - Go to Railway/Render dashboard
  - Verify the service shows as "Active" or "Running"
  - Check logs for any startup errors
  
- **Verify `VITE_WS_URL` is set correctly in Vercel**
  - Go to Vercel → Settings → Environment Variables
  - Check that `VITE_WS_URL` exists and has the correct value
  - Format should be: `wss://your-app.up.railway.app` or `https://your-app.up.railway.app` (both work - code converts automatically)
  - Make sure it's enabled for **Production**, **Preview**, and **Development**
  - **Important**: After adding/updating the variable, you MUST redeploy Vercel for changes to take effect
  
- **Verify the WebSocket server URL is correct**
  - Test the server health endpoint: `https://your-app.up.railway.app/health`
  - Should return JSON with `{"status":"ok"}`
  - If this fails, the server isn't running or the URL is wrong
  
- **Check browser console for detailed errors**
  - Open browser DevTools (F12) → Console tab
  - Look for connection errors with the attempted URL
  - The error message will show what URL it's trying to connect to
  
- **Common issues:**
  - URL has `http://` instead of `https://` or `wss://` (should use secure protocol)
  - Missing environment variable (check Vercel settings)
  - Server not deployed yet (deploy to Railway/Render first)
  - CORS error (check `CLIENT_URL` in Railway matches your Vercel URL exactly)

### "CORS error"
- Verify `CLIENT_URL` in Railway matches your Vercel URL exactly
- Make sure it includes `https://`
- Redeploy Railway after changing `CLIENT_URL`

### "Database error"
- Verify `POSTGRES_URL` is set in Railway/Render
- Check that Vercel Postgres is running
- Check Railway/Render logs for database connection errors

### "Variable already exists" error when adding `VITE_WS_URL`
- This means `VITE_WS_URL` is already configured in Vercel
- **Solution**: Don't try to add it again - instead:
  1. Go to Vercel → Settings → Environment Variables
  2. Find the existing `VITE_WS_URL` variable in the list
  3. Click on it to edit
  4. Update the value to your WebSocket URL
  5. Make sure it's enabled for all environments (Production, Preview, Development)
  6. Save the changes

### Players can't see each other's lobbies
- Make sure both users are accessing the same Vercel URL
- Verify they're connecting to the same WebSocket server
- Check browser console for connection errors

---

## Cost Estimate

- **Vercel**: Free tier (generous limits)
- **Railway**: Free tier ($5 credit/month, then usage-based)
- **Vercel Postgres**: Free tier (256MB storage)

For a small game, everything should be free!

---

## Production Checklist

- [ ] Frontend deployed to Vercel
- [ ] WebSocket server deployed to Railway/Render
- [ ] Database created in Vercel Postgres
- [ ] `VITE_WS_URL` set in Vercel (with `wss://`)
- [ ] `CLIENT_URL` set in Railway (with `https://`)
- [ ] `POSTGRES_URL` set in Railway
- [ ] Health check endpoint working
- [ ] Tested multiplayer with two browsers

---

## Need Help?

- Check server logs in Railway/Render dashboard
- Check browser console for client errors
- Verify all environment variables are set correctly
- Make sure both services are deployed and running

