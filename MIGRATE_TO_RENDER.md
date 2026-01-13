# 🚀 Complete Step-by-Step Guide: Migrating from Railway to Render

This is a detailed, beginner-friendly tutorial to migrate your Checkers WebSocket server from Railway to Render (free tier).

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Your code pushed to GitHub (or GitLab/Bitbucket)
- ✅ Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
- ✅ Your PostgreSQL connection string (from Vercel Postgres or your database provider)
- ✅ Access to your Railway project (to copy environment variables)

---

## Part 1: Gather Information from Railway

### Step 1.1: Copy Your Environment Variables

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Log in to your account
   - Click on your project

2. **Find Your Service**
   - Click on your WebSocket server service
   - Go to the **"Variables"** tab

3. **Copy These Values** (write them down or keep them handy):
   - `CLIENT_URL` - Your Vercel frontend URL https://gemini-farm-umber.vercel.app
   - `POSTGRES_URL` - Your database connection string postgresql://neondb_owner:npg_1Yh6IwZuQoCk@ep-ancient-dew-ad8p5llw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
   - `ALLOWED_ORIGINS` - Your allowed CORS origins (if set)
   - `NODE_ENV` - Should be `production`

4. **Copy Your Railway Service URL**
   - Go to the **"Settings"** tab
   - Find your **Public Domain** (e.g., `your-app.up.railway.app`)
   - Copy this URL - you'll need to update it in Vercel later

**📝 Note:** Keep these values safe - you'll need them in the next steps!

---

## Part 2: Create Render Account

### Step 2.1: Sign Up for Render

1. **Go to Render**
   - Visit [render.com](https://render.com)
   - Click **"Get Started for Free"** or **"Sign Up"**

2. **Choose Sign-Up Method**
   - **Recommended:** Click **"Sign up with GitHub"**
   - This makes it easier to connect your repository later
   - Authorize Render to access your GitHub account

3. **Verify Your Email**
   - Check your email inbox
   - Click the verification link from Render
   - You'll be redirected to the Render dashboard

**✅ You should now see the Render dashboard!**

---

## Part 3: Create New Web Service on Render

### Step 3.1: Start Creating a Web Service

1. **In Render Dashboard**
   - Look for a **"New +"** button (usually in the top right or center)
   - Click it
   - Select **"Web Service"** from the dropdown menu

2. **Connect Your Repository**
   - You'll see options to connect a repository
   - If you signed up with GitHub, you'll see a list of your repositories
   - **Find and select** your checkers game repository
   - Click **"Connect"**

**✅ Your repository is now connected!**

---

### Step 3.2: Configure Basic Settings

You'll now see a form to configure your service. Fill it out step by step:

1. **Name**
   - Enter: `checkers-websocket-server` (or any name you prefer)
   - This is just for your reference in the dashboard

2. **Region**
   - Choose the region closest to your users
   - Common options: `Oregon (US West)`, `Ohio (US East)`, `Frankfurt (EU)`
   - For most users, **Oregon** or **Ohio** works well

3. **Branch**
   - Select your main branch (usually `main` or `master`)
   - This is the branch Render will deploy from

4. **Root Directory**
   - **Leave this empty** (unless your server code is in a subdirectory)
   - If your `server.ts` is in the root, leave it blank

---

### Step 3.3: Configure Build and Start Commands

1. **Runtime**
   - Select: **Node**
   - Render will auto-detect this, but make sure it's selected

2. **Build Command**
   - Enter: `npm ci`
   - Or leave it empty - Render will auto-detect and use `npm install`
   - `npm ci` is faster and more reliable for production

3. **Start Command**
   - **This is important!** Enter: `npx tsx server.ts`
   - This is the command that starts your WebSocket server
   - Make sure it matches what you used on Railway

4. **Plan**
   - Select: **Free** (750 hours/month)
   - This is enough for 24/7 operation on the free tier

---

### Step 3.4: Add Environment Variables

**⚠️ CRITICAL STEP - Don't skip this!**

1. **Scroll down** to find **"Environment Variables"** section
   - You might need to click **"Advanced"** to see it
   - Or look for a button that says **"Add Environment Variable"**

2. **Add Each Variable One by One:**

   Click **"Add Environment Variable"** for each of these:

   **Variable 1: `CLIENT_URL`**
   - **Key:** `CLIENT_URL`
   - **Value:** Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
   - **Important:** Include `https://` at the beginning!
   - Click **"Save"**

   **Variable 2: `POSTGRES_URL`**
   - **Key:** `POSTGRES_URL`
   - **Value:** Your PostgreSQL connection string (from Railway or Vercel)
   - Should look like: `postgresql://user:password@host:port/database`
   - Click **"Save"**

   **Variable 3: `NODE_ENV`**
   - **Key:** `NODE_ENV`
   - **Value:** `production`
   - Click **"Save"**

   **Variable 4: `ALLOWED_ORIGINS`** ⚠️ **REQUIRED IN PRODUCTION!**
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** Your Vercel URLs separated by commas
   - Example: `https://gemini-farm-umber.vercel.app,https://www.gemini-farm-umber.vercel.app`
   - **Important:** This is REQUIRED - the server will exit if this is missing!
   - Include all variations of your domain (with and without www)
   - Click **"Save"**

3. **Verify All Variables Are Added**
   - You should see all 4 variables listed:
     - ✅ `CLIENT_URL`
     - ✅ `POSTGRES_URL`
     - ✅ `NODE_ENV`
     - ✅ `ALLOWED_ORIGINS` (REQUIRED!)
   - Double-check the values are correct
   - **Common mistakes:** 
     - Missing `https://` in URLs
     - Missing `ALLOWED_ORIGINS` (will cause server to crash!)

---

### Step 3.5: Deploy Your Service

1. **Review Your Settings**
   - Double-check:
     - ✅ Name is set
     - ✅ Branch is correct
     - ✅ Start command is `npx tsx server.ts`
     - ✅ All environment variables are added
     - ✅ Plan is set to **Free**

2. **Click "Create Web Service"**
   - This will start the deployment process
   - Render will:
     - Clone your repository
     - Install dependencies (`npm ci`)
     - Start your server

3. **Wait for Deployment**
   - You'll see a build log in real-time
   - This usually takes **2-5 minutes**
   - Watch for any errors in the logs

**✅ Deployment started!**

---

## Part 4: Monitor Deployment

### Step 4.1: Watch the Build Logs

1. **Build Phase**
   - You'll see logs like:
     ```
     Cloning repository...
     Installing dependencies...
     npm ci
     ```
   - Wait for this to complete
   - Look for: `Build successful` or similar message

2. **Start Phase**
   - After build, you'll see:
     ```
     Starting service...
     npx tsx server.ts
     ```
   - Look for your server startup messages:
     ```
     ✓ Database initialized
     ✓ Server started successfully
     ```

3. **If You See Errors:**
   - **Missing POSTGRES_URL:** Add it in Environment Variables
   - **Port error:** Make sure your code uses `process.env.PORT`
   - **Build failed:** Check that all dependencies are in `package.json`

---

### Step 4.2: Get Your Render URL

1. **After Deployment Completes**
   - Look at the top of your service page
   - You'll see a URL like:
     ```
     https://checkers-websocket-server.onrender.com
     ```
   - **Copy this URL** - you'll need it next!

2. **Test the Health Endpoint**
   - Open a new browser tab
   - Visit: `https://your-service-name.onrender.com/health`
   - You should see JSON like:
     ```json
     {
       "status": "ok",
       "database": "healthy",
       "connections": 0,
       "activeGames": 0,
       "lobbies": 0
     }
     ```
   - If you see this, **your server is working!** ✅

---

## Part 5: Update Vercel Frontend

### Step 5.1: Update WebSocket URL in Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Log in and select your project

2. **Navigate to Environment Variables**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Find `VITE_WS_URL`**
   - Look for the variable `VITE_WS_URL` in the list
   - If it exists:
     - Click on it to **edit**
     - Update the value to your new Render URL
   - If it doesn't exist:
     - Click **"Add New"**
     - Key: `VITE_WS_URL`
     - Value: `wss://your-service-name.onrender.com`
     - Or: `https://your-service-name.onrender.com` (both work)

4. **Set Environment**
   - Make sure it's enabled for:
     - ✅ **Production**
     - ✅ **Preview**
     - ✅ **Development**

5. **Save Changes**
   - Click **"Save"** or **"Update"**

---

### Step 5.2: Redeploy Vercel

1. **Trigger Redeploy**
   - Go to **Deployments** tab
   - Find your latest deployment
   - Click the **"..."** (three dots) menu
   - Click **"Redeploy"**
   - Confirm the redeploy

2. **Wait for Redeploy**
   - This usually takes 1-2 minutes
   - Wait for it to complete

**✅ Your frontend is now pointing to Render!**

---

## Part 6: Test Everything

### Step 6.1: Test Health Endpoint

1. **Visit Health Endpoint**
   - Go to: `https://your-service-name.onrender.com/health`
   - Should return JSON with `"status": "ok"`

2. **If It Fails:**
   - Check Render logs for errors
   - Verify environment variables are set correctly
   - Make sure the service shows "Live" status

---

### Step 6.2: Test Frontend Connection

1. **Visit Your Vercel App**
   - Go to your Vercel frontend URL
   - Open browser **Developer Tools** (Press F12)
   - Go to **Console** tab

2. **Set a Nickname**
   - Enter a nickname in your app
   - Look for console messages like:
     ```
     WebSocket connected
     Nickname set successfully
     ```

3. **If You See Connection Errors:**
   - Check that `VITE_WS_URL` is set correctly in Vercel
   - Verify the Render service is running
   - Check CORS settings (CLIENT_URL matches your Vercel URL)

---

### Step 6.3: Test Multiplayer

1. **Open Two Browser Windows**
   - Window 1: Your Vercel app
   - Window 2: Your Vercel app (same URL)

2. **Set Different Nicknames**
   - Window 1: Set nickname "Player1"
   - Window 2: Set nickname "Player2"

3. **Create and Join Lobby**
   - Window 1: Click "Create Lobby"
   - Window 2: Click on the lobby in the list
   - Game should start automatically!

4. **Test Game Play**
   - Make moves in both windows
   - Moves should sync in real-time
   - Chat should work

**✅ If all this works, migration is complete!**

---

## Part 7: Clean Up Railway (Optional)

### Step 7.1: Stop Railway Service

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Select your project

2. **Delete or Pause Service**
   - Option A: **Pause** the service (saves configuration)
   - Option B: **Delete** the service (if you're sure you won't need it)

3. **Update Documentation**
   - Update any docs that reference Railway URLs
   - Update README files

---

## 🎉 Migration Complete!

Your app is now running on Render! Here's what you've accomplished:

- ✅ Created Render account
- ✅ Deployed WebSocket server to Render
- ✅ Updated Vercel to use Render URL
- ✅ Tested everything works

---

## 📝 Important Notes About Render Free Tier

### Service Sleep Behavior

- **Services sleep after 15 minutes of inactivity**
- **First request after sleep takes ~30 seconds** (cold start)
- **Subsequent requests are fast** (service is awake)
- **WebSocket connections keep the service awake** while players are connected

### How to Keep Service Awake

1. **Keep Games Active**
   - As long as players are connected, the service stays awake
   - No action needed if you have regular players

2. **Set Up Monitoring (Optional)**
   - Use a free service like [UptimeRobot](https://uptimerobot.com)
   - Set it to ping `/health` every 10 minutes
   - This keeps your service awake 24/7

3. **Upgrade to Paid (Optional)**
   - Render's paid plans start at $7/month
   - Services never sleep on paid plans

---

## 🐛 Troubleshooting

### Problem: Service Won't Start

**Symptoms:**
- Service shows "Failed" status
- Logs show errors

**Solutions:**
1. **Check Logs**
   - Go to Render dashboard → Your service → Logs
   - Look for error messages

2. **Common Issues:**
   - **Missing POSTGRES_URL:** Add it in Environment Variables
   - **Port error:** Your code should use `process.env.PORT` (Render sets this automatically)
   - **Build failed:** Check that `package.json` has all dependencies

3. **Fix and Redeploy**
   - Fix the issue
   - Render will auto-redeploy, or click "Manual Deploy"

---

### Problem: WebSocket Connection Fails

**Symptoms:**
- Frontend can't connect to server
- Console shows connection errors

**Solutions:**
1. **Check VITE_WS_URL**
   - Go to Vercel → Settings → Environment Variables
   - Verify `VITE_WS_URL` is set to your Render URL
   - Format: `wss://your-service.onrender.com` or `https://your-service.onrender.com`

2. **Check CORS**
   - Verify `CLIENT_URL` in Render matches your Vercel URL exactly
   - Must include `https://`
   - Check `ALLOWED_ORIGINS` if you're using it

3. **Check Service Status**
   - Visit `/health` endpoint
   - Should return `{"status":"ok"}`
   - If it fails, service isn't running

4. **Redeploy Vercel**
   - After updating `VITE_WS_URL`, you MUST redeploy Vercel
   - Go to Deployments → Redeploy

---

### Problem: Service Keeps Sleeping

**Symptoms:**
- First request takes 30+ seconds
- Service works fine after first request

**Solutions:**
1. **This is Normal**
   - Free tier services sleep after 15 minutes of inactivity
   - This is expected behavior

2. **Keep It Awake:**
   - Set up UptimeRobot to ping `/health` every 10 minutes
   - Or upgrade to paid plan ($7/month)

---

### Problem: Database Connection Errors

**Symptoms:**
- Logs show database errors
- Health endpoint shows `"database": "unhealthy"`

**Solutions:**
1. **Check POSTGRES_URL**
   - Verify it's set correctly in Render
   - Format should be: `postgresql://user:password@host:port/database`

2. **Check Database Access**
   - Your database provider must allow connections from Render
   - Vercel Postgres should work automatically
   - If using other providers, check firewall settings

3. **Test Connection**
   - Try connecting with a database client
   - Verify the connection string works

---

## 📊 Environment Variables Checklist

### Render (WebSocket Server)
```env
✅ CLIENT_URL=https://your-frontend.vercel.app
✅ POSTGRES_URL=postgresql://...
✅ NODE_ENV=production
✅ ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.your-frontend.vercel.app
```

### Vercel (Frontend)
```env
✅ VITE_WS_URL=wss://your-service.onrender.com
```

---

## 🎯 Quick Reference

### Render Dashboard
- **URL:** [render.com/dashboard](https://render.com/dashboard)
- **Service URL:** `https://your-service.onrender.com`
- **Health Check:** `https://your-service.onrender.com/health`

### Vercel Dashboard
- **URL:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Environment Variables:** Settings → Environment Variables

### Useful Commands
```bash
# Test health endpoint (in browser or terminal)
curl https://your-service.onrender.com/health

# View Render logs
# (In Render dashboard → Your service → Logs)
```

---

## ✅ Final Checklist

Before considering migration complete:

- [ ] Render service shows "Live" status
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] All environment variables set in Render
- [ ] `VITE_WS_URL` updated in Vercel
- [ ] Vercel frontend redeployed
- [ ] Tested frontend connection (console shows "WebSocket connected")
- [ ] Tested multiplayer (two players can join and play)
- [ ] Railway service stopped/deleted (optional)

---

## 🆘 Need Help?

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Render Support:** support@render.com
- **Check Logs:** Render dashboard → Your service → Logs
- **Check Health:** Visit `/health` endpoint

---

**Congratulations! You've successfully migrated from Railway to Render! 🎉**

