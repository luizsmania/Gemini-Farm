# 🚀 Deployment Guide

This document consolidates all deployment and configuration instructions for Gemini Farm Tycoon.

## 📋 Table of Contents

1. [Vercel Setup](#vercel-setup)
2. [Railway WebSocket Server](#railway-websocket-server)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)

---

## 🌐 Vercel Setup

### Initial Deployment

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables**
   - Add all required environment variables (see below)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

---

## 🔌 Railway WebSocket Server

### Setup Steps

1. **Create Railway Project**
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Service**
   - Railway will detect `server.js` automatically
   - Set start command: `node server.js`
   - Set port: Railway assigns automatically (use `PORT` env var)

3. **Environment Variables**
   ```env
   PORT=3000
   API_URL=https://your-vercel-app.vercel.app
   NODE_ENV=production
   ```

4. **Generate Public Domain**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy the generated URL (e.g., `https://your-app.up.railway.app`)

5. **Update Vercel Environment Variables**
   - Add `VITE_WS_URL` with your Railway WebSocket URL
   - Format: `wss://your-app.up.railway.app` (use `wss://` for secure)

6. **Redeploy Vercel**
   - After adding `VITE_WS_URL`, trigger a new deployment

### Railway Configuration Files

**railway.json** (already in repo):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Procfile** (already in repo):
```
web: node server.js
```

---

## 🗄️ Database Configuration

### Vercel Postgres Setup

1. **Create Database**
   - In Vercel Dashboard, go to your project
   - Navigate to "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Follow setup wizard

2. **Automatic Environment Variables**
   Vercel automatically adds:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

3. **Database Schema**
   Tables are created automatically on first API request:
   - `users` - User accounts
   - `game_states` - Game progress (JSONB)

---

## 🔐 Environment Variables

### Vercel Environment Variables

```env
# Gemini AI API
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# WebSocket Server URL
VITE_WS_URL=wss://your-railway-app.up.railway.app

# Database (auto-added by Vercel)
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
```

### Railway Environment Variables

```env
PORT=3000
API_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
```

---

## 🛠️ Troubleshooting

### WebSocket Connection Issues

**Problem**: WebSocket not connecting
- ✅ Check `VITE_WS_URL` is set correctly in Vercel
- ✅ Verify Railway service is running
- ✅ Ensure Railway domain is public (not private)
- ✅ Check Railway logs for errors

**Problem**: `require is not defined` error
- ✅ Ensure `server.js` uses ES modules (`import/export`)
- ✅ Check `package.json` has `"type": "module"`
- ✅ Verify Railway is using correct Node.js version

### Database Issues

**Problem**: Database connection fails
- ✅ Verify `POSTGRES_URL` is set in Vercel
- ✅ Check database is created and active
- ✅ Ensure API routes use correct connection string

### Build Issues

**Problem**: Build fails on Vercel
- ✅ Check Node.js version (should be 18+)
- ✅ Verify all dependencies in `package.json`
- ✅ Check build logs for specific errors

---

## 📝 Quick Reference

### Important URLs

- **Frontend**: `https://your-project.vercel.app`
- **WebSocket**: `wss://your-railway-app.up.railway.app`
- **API**: `https://your-project.vercel.app/api/*`

### Key Files

- `server.js` - WebSocket server (Railway)
- `api/*` - API endpoints (Vercel)
- `railway.json` - Railway configuration
- `vercel.json` - Vercel configuration
- `Procfile` - Railway start command

---

## ✅ Deployment Checklist

- [ ] Vercel project created and deployed
- [ ] Railway project created and deployed
- [ ] Railway public domain generated
- [ ] `VITE_WS_URL` set in Vercel
- [ ] `VITE_GEMINI_API_KEY` set in Vercel
- [ ] Vercel Postgres database created
- [ ] All environment variables configured
- [ ] Test WebSocket connection
- [ ] Test database save/load
- [ ] Test multi-device sync

---

## 🆘 Support

If you encounter issues:
1. Check Railway logs: Railway Dashboard → Your Service → Logs
2. Check Vercel logs: Vercel Dashboard → Your Project → Deployments → View Function Logs
3. Verify all environment variables are set correctly
4. Ensure both services are running and accessible

---

**Last Updated**: 2024



