# 🚀 Complete Manual Render Deployment Guide

This is a comprehensive step-by-step guide to manually deploy your Mafia game on Render. Every single click, field, and value is documented.

## Prerequisites
- GitHub account with repository URL
- Render account (will create in Step 2)
- 30-40 minutes of time for first deployment

---

## Step 1: Push Your Code to GitHub

Before deploying, ensure your code is on GitHub.

### 1.1 Open PowerShell
1. Press `Windows Key + X`
2. Select **"Windows PowerShell"** or **"Terminal"**

### 1.2 Navigate to Project Directory
```powershell
cd "C:\Users\vyasg\OneDrive\Desktop\project\Mafia"
```

Press Enter. You should see your terminal prompt change to show the Mafia folder.

### 1.3 Check Git Status
```powershell
git status
```

Press Enter. You'll see either:
- Files listed in red (uncommitted changes) - proceed to next step
- "nothing to commit, working tree clean" - skip to 1.6

### 1.4 Stage All Changes
```powershell
git add .
```

Press Enter. The dot (.) means "add everything".

### 1.5 Commit Changes
```powershell
git commit -m "Ready for Render deployment"
```

Press Enter. You'll see a summary of files committed.

### 1.6 Push to GitHub
```powershell
git push origin master
```

Press Enter. You'll see:
```
Enumerating objects: X, done.
Counting objects: 100%
Writing objects: 100%
To https://github.com/YourUsername/Mafia.git
```

### 1.7 Verify on GitHub
1. Open your browser
2. Go to your repository URL (e.g., `https://github.com/YourUsername/Mafia`)
3. Verify you see all your files including:
   - `Dockerfile`
   - `docker-compose.yml`
   - `package.json`
   - `client/` folder
   - `server/` folder
4. Check the latest commit message shows "Ready for Render deployment"

**✅ If you see all files, proceed to Step 2**

---

## Step 2: Create Render Account

### 2.1 Go to Render Website
1. Open a new browser tab
2. Navigate to: **https://render.com**
3. You'll see the Render homepage with a large "Get Started" button

### 2.2 Sign Up with GitHub
1. Click the **"Get Started"** button (center of page)
2. On the sign-up page, click **"GitHub"** button (should be the first option)
3. A GitHub authorization page will open

### 2.3 Authorize Render
1. You'll see: "Authorize Render"
2. Review the permissions (Render needs to read your repositories)
3. Click the green **"Authorize render"** button
4. You may need to enter your GitHub password

### 2.4 Complete Profile
1. You'll be redirected back to Render
2. Fill in:
   - **Team/Organization Name**: Can use your name or project name (e.g., "Mafia Game")
   - **How will you use Render**: Select "Personal Projects" or "Production Applications"
3. Click **"Complete Setup"** or "Continue"

### 2.5 Reach Dashboard
You'll now see the Render Dashboard with:
- Navigation menu on the left
- "New +" button at the top right
- Empty services list (or any existing services)
- "Get Started" guides

**✅ You're now ready to create services**

---

## Step 3: Create MongoDB Database

You'll create a private MongoDB database that only your app can access.

### 3.1 Start New Service Creation
1. Look at the **top right** of the Dashboard
2. Click the blue **"New +"** button
3. A dropdown menu appears with options

### 3.2 Select Private Service
1. From the dropdown, scroll down
2. Click **"Private Service"**
3. A new page opens: "Create a new Private Service"

### 3.3 Choose MongoDB
1. You'll see various database options (PostgreSQL, MySQL, MongoDB, etc.)
2. Find and click on **"MongoDB"**
3. The page updates to show MongoDB-specific settings

### 3.4 Fill MongoDB Configuration
You'll see a form with multiple fields. Fill them EXACTLY as shown:

**Service Details Section:**
- **Name**: Type `mafia-mongodb`
  - This is the service identifier
  - Must be lowercase, no spaces
  - You'll use this name in connection strings
  
- **Region**: Select `Oregon (US West)` from dropdown
  - Choose the region closest to you
  - All services should use the SAME region
  - Oregon is recommended for US users

**Database Configuration Section:**
- **Database Name**: Type `mafia`
  - This is the actual database name
  - Your collections will be stored here
  
- **User**: Type `admin` (or leave as default `mongo`)
  - This is the database username
  - Case-sensitive

- **MongoDB Version**: Leave as default (latest, usually 7.0)

**Plan Section:**
- **Instance Type**: Select `Free`
  - Free tier: 256MB RAM, 1GB storage
  - Enough for development/small games
  - Can upgrade later if needed
  
- Scroll down past pricing information

### 3.5 Create Database
1. Review all fields one more time
2. At the bottom, click the blue **"Create Database"** button
3. You'll be redirected to the database overview page

### 3.6 Wait for Provisioning
1. At the top, you'll see status: **"Creating"** with a spinning icon
2. This takes **2-4 minutes**
3. The page will auto-refresh
4. Wait until status changes to: **"Available"** with a green dot

**What's happening:**
- Render is allocating database resources
- Creating the database instance
- Setting up authentication
- Configuring network access

### 3.7 Copy Internal Connection String
Once status shows "Available":

1. Look at the right side of the page
2. Find the **"Connections"** section (it's a box with connection details)
3. You'll see two types of connection strings:
   - **External Connection String** - Don't use this
   - **Internal Connection String** - Use this one
4. Find **"Internal Connection String"**
5. It looks like: `mongodb://admin:abc123XYZ456@mafia-mongodb:27017/mafia`
6. Click the **copy icon** (📋) next to it

**CRITICAL: Save this string!**
1. Open **Notepad** (Windows Start → type "Notepad")
2. Paste the connection string
3. Label it: "MongoDB Connection String"
4. Keep Notepad open - you'll need this later

**Connection String Breakdown:**
```
mongodb://admin:abc123XYZ456@mafia-mongodb:27017/mafia
         ↑      ↑              ↑                ↑
      username password    hostname:port   database
```

**✅ MongoDB is ready! Proceed to Step 4**

---

## Step 4: Create Redis Instance

You'll create a Redis cache for session storage and real-time features.

### 4.1 Return to Dashboard
1. Click **"Dashboard"** in the left navigation menu
2. You'll see your `mafia-mongodb` database listed

### 4.2 Start New Service Creation
1. Click the **"New +"** button (top right) again
2. Dropdown menu appears

### 4.3 Select Redis
1. From the dropdown menu, find and click **"Redis"**
2. A new page opens: "Create a new Redis"

### 4.4 Fill Redis Configuration
You'll see a simpler form than MongoDB:

**Service Details Section:**
- **Name**: Type `mafia-redis`
  - Must match exactly for consistency
  - Lowercase, no spaces

- **Region**: Select `Oregon (US West)` from dropdown
  - ⚠️ **MUST be the SAME region as MongoDB**
  - Using different regions increases latency

**Redis Configuration Section:**
- **Maxmemory Policy**: Leave as default `noeviction`
  - Options: noeviction, allkeys-lru, volatile-lru, etc.
  - `noeviction` prevents data loss
  
- **Redis Version**: Leave as default (latest, usually 7.x)

**Plan Section:**
- **Instance Type**: Select `Free`
  - Free tier: 25MB RAM
  - Sufficient for session storage
  - Can upgrade later

### 4.5 Create Redis
1. Verify all fields
2. Click the blue **"Create Redis"** button at the bottom
3. You'll be redirected to the Redis overview page

### 4.6 Wait for Provisioning
1. Status at top shows: **"Creating"** with spinning icon
2. Takes **1-3 minutes** (faster than MongoDB)
3. Wait for status to change to: **"Available"** with green dot

### 4.7 Copy Internal Connection String
Once status shows "Available":

1. Look at the **"Connections"** section on the right
2. Find **"Internal Connection String"**
3. It looks like: `redis://red-abcd1234efgh5678ijkl:6379`
4. Click the **copy icon** (📋) to copy it

**Save this string:**
1. Go back to your **Notepad** window
2. On a new line, paste the Redis connection string
3. Label it: "Redis Connection String"
4. Keep Notepad open

**Connection String Breakdown:**
```
redis://red-abcd1234efgh5678ijkl:6379
        ↑                        ↑
    unique Redis ID            port
```

**✅ Redis is ready! Proceed to Step 5**

---

## Step 5: Create Web Service (Main Application)

This is the most detailed step - you'll create the main web service that runs your game.

### 5.1 Return to Dashboard
1. Click **"Dashboard"** in the left navigation
2. You should now see TWO services:
   - `mafia-mongodb` (Database)
   - `mafia-redis` (Redis)

### 5.2 Start New Service Creation
1. Click **"New +"** button (top right)
2. Dropdown menu appears

### 5.3 Select Web Service
1. From the dropdown, click **"Web Service"**
2. A page opens asking how to deploy

### 5.4 Choose Git Deployment
1. You'll see options:
   - "Build and deploy from a Git repository" ← Click this
   - "Deploy an existing image from a registry"
2. Click **"Build and deploy from a Git repository"**
3. Click **"Next"** or "Continue"

### 5.5 Connect Repository
You'll now see a list of your GitHub repositories:

1. Find your **"Mafia"** repository in the list
2. On the right side of that row, click the blue **"Connect"** button
3. A new page opens with configuration form

### 5.6 Configure Basic Settings

You'll see a long form with many sections. Fill them CAREFULLY:

#### **General Section:**

**Name:** (First field at the top)
- Type: `mafia-game`
- Must be lowercase
- This becomes part of your URL

**Region:** (Dropdown below name)
- Select: `Oregon (US West)`
- ⚠️ **SAME region as MongoDB and Redis**

**Branch:** (Dropdown)
- Select: `master` (or `main` if that's your default branch)
- This is the Git branch Render will deploy from

**Root Directory:** (Text field)
- Leave this **BLANK** (empty)
- Only needed if your code is in a subfolder

#### **Build & Deploy Section:**

**Runtime:** (Dropdown - IMPORTANT!)
- Select: **`Docker`**
- ⚠️ This is CRITICAL - must be Docker, not Node
- Render will use your Dockerfile

**Dockerfile Path:** (Text field)
- Type: `./Dockerfile`
- This tells Render where your Dockerfile is located
- The `./` means "in the root directory"

**Docker Command:** (Text field)
- Leave **BLANK** (empty)
- Your Dockerfile already has CMD instruction

**Build Command:** (Text field)
- Leave **BLANK** (empty)
- Docker handles the build

**Start Command:** (Text field)
- Leave **BLANK** (empty)
- Docker CMD will start the server

#### **Plan Section:**

**Instance Type:** (Radio buttons or dropdown)
- Select: **`Free`**
- Free tier: 512MB RAM, shared CPU
- ⚠️ Free tier has cold starts (apps sleep after 15 min inactivity)
- Upgrade to "Starter" ($7/month) for 24/7 uptime

### 5.7 Configure Advanced Settings

Scroll down and click **"Advanced"** button to expand:

**Auto-Deploy:** (Toggle/Checkbox)
- Set to: **Yes** (Enabled/On)
- Green checkmark or toggle to the right
- This auto-deploys when you push to GitHub

**Health Check Path:** (Text field)
- Type: `/`
- Render will check this URL to verify app is running
- Our app serves the frontend at root path

**Pre-Deploy Command:** (Text field)
- Leave **BLANK**

**Docker Context Directory:** (Text field)
- Leave **BLANK**

### 5.8 Add Environment Variables

This is the MOST IMPORTANT part. You'll add 6 variables.

Scroll down to **"Environment Variables"** section.

You'll see:
- A message: "Add environment variables"
- A button: **"Add Environment Variable"**

Click **"Add Environment Variable"** - two fields appear: Key and Value.

#### **Variable 1 - NODE_ENV:**

1. Click **"Add Environment Variable"**
2. **Key**: Type `NODE_ENV`
   - Must be EXACT, case-sensitive
3. **Value**: Type `production`
   - Must be lowercase
4. Don't click Save yet - we're adding all 6 first

#### **Variable 2 - PORT:**

1. Click **"Add Environment Variable"** again
2. **Key**: Type `PORT`
3. **Value**: Type `3001`
   - This is the port your server listens on
   - Render will route traffic to this port

#### **Variable 3 - MONGODB_URI:**

This connects your app to the MongoDB database.

1. Click **"Add Environment Variable"**
2. **Key**: Type `MONGODB_URI`
   - EXACT spelling with underscore
3. **Value**: Go to your **Notepad**
   - Copy the MongoDB connection string
   - Should look like: `mongodb://admin:abc123XYZ456@mafia-mongodb:27017/mafia`
   - Paste it in the Value field
4. ⚠️ **VERIFY**: 
   - Starts with `mongodb://`
   - Contains `@mafia-mongodb:27017`
   - Ends with `/mafia`
   - No extra spaces before or after

#### **Variable 4 - REDIS_URL:**

This connects your app to Redis.

1. Click **"Add Environment Variable"**
2. **Key**: Type `REDIS_URL`
3. **Value**: Go to your **Notepad**
   - Copy the Redis connection string
   - Should look like: `redis://red-abcd1234efgh5678:6379`
   - Paste it in the Value field
4. ⚠️ **VERIFY**:
   - Starts with `redis://`
   - Contains `red-` followed by alphanumeric
   - Ends with `:6379`
   - No extra spaces

#### **Variable 5 - JWT_SECRET:**

This is a secret key for user authentication tokens.

1. Click **"Add Environment Variable"**
2. **Key**: Type `JWT_SECRET`
3. **Value**: You need a random 64-character string

**Option A - Use this pre-generated secret:**
```
mafiagame2026secretkeyrandomstringforjwttokensecuritypurposesRENDER
```
Copy and paste exactly.

**Option B - Generate your own:**
- Go to: https://generate-random.org/api-token-generator
- Click "Generate"
- Copy a 64-character token
- Paste in Value field

4. ⚠️ **IMPORTANT**: 
   - Must be at least 32 characters
   - No spaces
   - Save this somewhere - needed if you redeploy

#### **Variable 6 - CORS_ORIGIN:**

This controls which domains can access your API.

1. Click **"Add Environment Variable"**
2. **Key**: Type `CORS_ORIGIN`
3. **Value**: Type `https://mafia-game.onrender.com`
   - ⚠️ **NOTE**: This might not be your exact URL
   - We'll update it in Step 6 after we see the actual URL
   - Must start with `https://` (not http)
   - No trailing slash at the end
   - Replace `mafia-game` with the name you entered in 5.6

### 5.9 Review All Settings

Before clicking Create, scroll up and verify:

**✅ Checklist:**
- [ ] Name: `mafia-game`
- [ ] Region: `Oregon (US West)`
- [ ] Branch: `master`
- [ ] Runtime: `Docker`
- [ ] Dockerfile Path: `./Dockerfile`
- [ ] 6 environment variables added:
  - [ ] NODE_ENV = production
  - [ ] PORT = 3001
  - [ ] MONGODB_URI = (long mongodb:// string)
  - [ ] REDIS_URL = (redis:// string)
  - [ ] JWT_SECRET = (64-char random string)
  - [ ] CORS_ORIGIN = (https://your-app.onrender.com)

### 5.10 Create Web Service

1. Scroll to the very bottom
2. Click the large blue **"Create Web Service"** button
3. You'll be redirected to the service dashboard
4. Deployment starts automatically!

**✅ Web service created! Proceed to Step 6**

---

## Step 6: Update CORS_ORIGIN with Actual URL

After the service is created, you need to verify and update the CORS origin.

### 6.1 Find Your Actual App URL

1. You're now on the `mafia-game` service page
2. Look at the **very top** of the page, below the service name
3. You'll see a URL, something like:
   - `https://mafia-game.onrender.com` OR
   - `https://mafia-game-a1b2.onrender.com` (with random suffix)
4. **Copy this exact URL**

### 6.2 Check if CORS_ORIGIN Matches

1. Does the URL you copied EXACTLY match what you entered in Variable 6?
2. If YES - skip to Step 7
3. If NO (has extra suffix like `-a1b2`) - continue to 6.3

### 6.3 Update CORS_ORIGIN

1. On the left sidebar, click **"Environment"**
2. You'll see a list of all your environment variables
3. Find the row with Key = `CORS_ORIGIN`
4. On the right side of that row, click the **pencil/edit icon** ✏️
5. The Value field becomes editable
6. **Delete** the old value
7. **Paste** your actual app URL from step 6.1
8. ⚠️ **Remove trailing slash** if present:
   - Correct: `https://mafia-game-a1b2.onrender.com`
   - Wrong: `https://mafia-game-a1b2.onrender.com/`
9. Click the **checkmark** or **"Save"** button

### 6.4 Trigger Redeploy

After saving:
1. You'll see a message: "Environment variable updated"
2. The service will automatically start redeploying
3. You'll see: "Deploy initiated" or similar message

**✅ CORS is configured correctly! Proceed to Step 7**

---

## Step 7: Monitor Build and Deployment

Now you wait for the build to complete. Let's monitor it in detail.

### 7.1 Access Logs

1. Make sure you're on the `mafia-game` service page
2. On the left sidebar, click **"Logs"**
3. You'll see a terminal-like window with live log output

### 7.2 Understand Build Phases

You'll see logs in these phases:

#### **Phase 1: Build Start (0-1 min)**
```
==> Build started...
==> Cloning repository from GitHub
==> Checking out branch 'master'
==> Repository cloned successfully
```

#### **Phase 2: Docker Build (1-8 min)**
```
==> Building Docker image from ./Dockerfile
Step 1/15 : FROM node:18-alpine
 ---> Pulling image...
Step 2/15 : WORKDIR /app
 ---> Running in...
Step 3/15 : COPY package*.json ./
 ---> Running in...
```

This phase:
- Downloads Node.js base image
- Copies package files
- Installs server dependencies
- Installs client dependencies
- Builds TypeScript server code
- Builds React client code (takes longest)
- Creates optimized production bundle

**This phase takes 6-10 minutes on first build.**

You'll see lots of:
- `npm install` output
- `Building client...`
- `Building server...`
- Webpack/Vite build logs
- File compilation messages

#### **Phase 3: Image Creation (8-10 min)**
```
==> Successfully built Docker image
==> Pushing image to registry
==> Image pushed successfully
```

#### **Phase 4: Deployment (10-11 min)**
```
==> Starting deployment
==> Pulling Docker image
==> Starting container
```

#### **Phase 5: Application Start (11-12 min)**
```
Server starting...
Connecting to MongoDB...
MongoDB connected successfully
Connecting to Redis...
Redis connected successfully
Server listening on port 3001
✓ Application started
```

#### **Phase 6: Live! (12 min)**
```
==> Your service is live 🎉
==> Health check passed
```

### 7.3 Monitor Status Indicator

At the **top of the page**, watch the status badge:

1. **Building** (orange/yellow) - Code is compiling
2. **Deploying** (blue) - Container is starting
3. **Live** (green) - App is running!
4. **Deploy failed** (red) - Something went wrong

### 7.4 What to Do If Build Fails

If you see **"Deploy failed"** (red):

1. **Don't panic** - read the error in logs
2. Common issues:

**Issue: "Cannot find Dockerfile"**
- Solution: Verify `./Dockerfile` exists in repository root
- Check Dockerfile Path in Settings is correct

**Issue: "npm install failed"**
- Solution: Ensure package.json has all dependencies
- Check for syntax errors in package.json

**Issue: "Cannot connect to MongoDB"**
- Solution: Verify MONGODB_URI environment variable
- Check MongoDB service is "Available"

**Issue: "Port 3001 is not accessible"**
- Solution: Verify PORT=3001 environment variable
- Check Dockerfile EXPOSE command

3. **To retry after fixing:**
   - Click **"Manual Deploy"** dropdown (top right)
   - Select **"Clear build cache & deploy"**

### 7.5 Expected Build Time

| Build Phase | Time | Status |
|-------------|------|--------|
| Clone repo | 30s | Starting |
| Docker setup | 1 min | Building |
| Install dependencies | 3 min | Building |
| Build client | 4 min | Building |
| Build server | 2 min | Building |
| Create image | 1 min | Building |
| Start container | 1 min | Deploying |
| **TOTAL** | **10-12 min** | **Live** |

**Subsequent builds:** 3-5 minutes (uses cache)

**✅ Once status shows "Live", proceed to Step 8**

---

## Step 8: Comprehensive Verification

Verify everything works correctly.

### 8.1 Check Service Status

1. You're on the `mafia-game` service page
2. At the top, status should show: **"Live"** with a green dot
3. Below status, you'll see:
   - **"Last deploy"**: Just now (or timestamp)
   - **"Deploy time"**: ~10-12 minutes
   - **"Commits"**: Your latest commit

### 8.2 Test Frontend Application

1. At the top of the page, find your app URL
2. Click the URL (or copy and paste into new browser tab)
3. **Expected Result:**
   - Page loads within 2-3 seconds
   - You see the Mafia game landing page
   - Professional UI with styled components
   - Two prominent buttons:
     - **"Create Room"** button
     - **"Join Room"** button
   - No error messages in browser
   - No blank white page

4. **If page doesn't load:**
   - Wait 30 seconds (could be cold start)
   - Refresh the page
   - Check browser console (F12) for errors
   - Go back to Render logs for errors

### 8.3 Test Backend Health Endpoint

Verify the backend API is working:

1. Copy your app URL
2. Add `/api/health` to the end
3. Example: `https://mafia-game-a1b2.onrender.com/api/health`
4. Open this URL in a new browser tab

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T15:30:45.123Z",
  "mongodb": "connected",
  "redis": "connected",
  "uptime": 120
}
```

**What this means:**
- `status: "ok"` - Server is running
- `mongodb: "connected"` - Database connection works
- `redis: "connected"` - Cache connection works
- `timestamp` - Current server time
- `uptime` - Seconds since server started

**If you see an error:**
- 404 Not Found: Check routing in server code
- 500 Internal Error: Check logs for database connection issues
- Timeout: Service might be starting, wait 30s and retry

### 8.4 Test Create Room Flow

Let's test actual game functionality:

1. Go back to the main app URL (home page)
2. Click **"Create Room"** button
3. **Expected**: Modal or new page appears
4. Fill in:
   - **Room Code**: Type any code like `TEST123`
   - **Your Name**: Type your name
   - **Player Count**: Select a number (e.g., 6)
5. Click **"Create"** or "Start Lobby"

**Expected Result:**
- You're redirected to lobby page
- URL changes to include room code: `/lobby?room=TEST123` or similar
- You see:
  - Room code displayed
  - Your name in player list
  - "Waiting for players..." message
  - Share link or copy button
- No errors in browser console

**If it fails:**
- Check browser console (F12) for errors
- Common issue: CORS error means CORS_ORIGIN is wrong
- Common issue: Socket connection error means WebSocket isn't working

### 8.5 Test Join Room Flow

Test multiplayer connection:

1. Copy your app URL
2. Open a **new incognito/private browser window** (Ctrl+Shift+N in Chrome)
3. Paste the app URL and press Enter
4. Click **"Join Room"** button
5. Fill in:
   - **Room Code**: Use the code from step 8.4 (e.g., `TEST123`)
   - **Your Name**: Type a different name (e.g., "Player 2")
6. Click **"Join"**

**Expected Result:**
- Player 2 joins the lobby
- In the first browser window, you see Player 2 appear in the player list
- Both players see each other
- Chat works (if implemented)
- Ready buttons work (if implemented)

**This confirms:**
- ✅ WebSocket connections work
- ✅ Real-time updates work
- ✅ Multiple clients can connect
- ✅ Redis session storage works
- ✅ MongoDB state persistence works

### 8.6 Check Logs for Errors

Even if everything seems to work, check logs for warnings:

1. Go back to Render dashboard
2. Click `mafia-game` service
3. Click **"Logs"** in sidebar
4. Scroll through recent logs
5. Look for:
   - ❌ `ERROR` - Critical issues
   - ⚠️ `WARN` - Potential problems
   - ✅ `INFO` - Normal operation logs

**Healthy logs look like:**
```
Server listening on port 3001
MongoDB connected: mafia-mongodb:27017
Redis connected: red-xxxxx:6379
New socket connection: socket-id-12345
Room created: TEST123
Player joined: TEST123 - Player 2
```

### 8.7 Test Free Tier Cold Start (Optional)

Free tier apps sleep after 15 minutes of inactivity. Test this:

1. Close all browser tabs with your app
2. Wait 16 minutes (get a coffee ☕)
3. Open your app URL again

**Expected Behavior:**
- First request takes **30-60 seconds** to respond
- You see "Starting..." or loading
- After wake-up, app works normally
- Subsequent requests are fast

**This is normal for free tier.** To eliminate cold starts:
- Upgrade to Starter plan ($7/month)
- Your app stays running 24/7
- First request is always fast

### 8.8 Verification Checklist

Go through this final checklist:

- [ ] Dashboard shows mafia-game status: **Live** (green)
- [ ] Dashboard shows mafia-mongodb status: **Available** (green)
- [ ] Dashboard shows mafia-redis status: **Available** (green)
- [ ] App URL opens and shows landing page
- [ ] No errors in browser console (F12)
- [ ] `/api/health` endpoint returns JSON with `status: "ok"`
- [ ] Can create a room successfully
- [ ] Can join a room from another browser/device
- [ ] Players appear in lobby
- [ ] Real-time updates work
- [ ] No critical errors in Render logs

**✅ If all items are checked, deployment is successful!**

---

## Step 9: Post-Deployment Configuration

Optional but recommended configurations.

### 9.1 Set Up Custom Domain (Optional)

If you own a domain:

1. On `mafia-game` service page
2. Click **"Settings"** in left sidebar
3. Scroll to **"Custom Domain"**
4. Click **"Add Custom Domain"**
5. Enter your domain: `mafia.yourdomain.com`
6. Render provides DNS instructions:
   - Type: CNAME
   - Name: mafia
   - Value: mafia-game.onrender.com
7. Add this record in your domain registrar
8. Wait for DNS propagation (5-60 minutes)
9. Once verified, update `CORS_ORIGIN` environment variable to your custom domain

### 9.2 Enable Notifications

Get notified when deployments succeed/fail:

1. Click your profile icon (top right)
2. Select **"Account Settings"**
3. Click **"Notifications"** tab
4. Enable:
   - Deploy success notifications
   - Deploy failure notifications
   - Service health alerts
5. Add your email
6. Save settings

### 9.3 Set Up Auto-Deploy from GitHub

Already enabled by default, but verify:

1. On `mafia-game` service
2. Click **"Settings"** in sidebar
3. Find **"Build & Deploy"** section
4. **Auto-Deploy**: Should be **Yes**
5. This means:
   - Push to `master` branch → Auto-deploys
   - Pull request merged → Auto-deploys
   - Manual commits → Auto-deploys

### 9.4 Configure Health Checks

Fine-tune health monitoring:

1. On `mafia-game` service
2. Click **"Settings"**
3. Scroll to **"Health & Alerts"**
4. Settings:
   - **Health Check Path**: `/` (already set)
   - **Health Check Interval**: 30 seconds (default)
   - **Unhealthy Threshold**: 3 attempts (default)
5. Render will restart service if health check fails 3 times

### 9.5 Review Metrics

Monitor your app performance:

1. On `mafia-game` service
2. Click **"Metrics"** in left sidebar
3. You'll see graphs for:
   - **CPU Usage**: Should be low (< 50%) most of the time
   - **Memory Usage**: Should be under 400MB for free tier
   - **Network**: Requests in/out
   - **HTTP Requests**: Count and status codes
   - **Response Time**: Latency graphs
4. Use this to identify performance issues

### 9.6 Set Up Monitoring Alerts

Get alerts for issues:

1. On `mafia-game` service
2. Click **"Settings"**
3. Scroll to **"Alerts"** section
4. Click **"Add Alert"**
5. Configure:
   - **Alert Type**: Service down
   - **Notification**: Email
   - **Recipients**: Your email
6. Save alert

---

## 📋 Complete Deployment Summary

Congratulations! Your Mafia game is now live on Render.

### Services Created:

| Service Name | Type | Region | Plan | Status |
|--------------|------|--------|------|--------|
| mafia-mongodb | MongoDB Database | Oregon | Free | Available |
| mafia-redis | Redis Cache | Oregon | Free | Available |
| mafia-game | Web Service (Docker) | Oregon | Free | Live |

### Environment Variables Configured:

| Variable | Purpose | Value Type |
|----------|---------|------------|
| NODE_ENV | Environment mode | `production` |
| PORT | Application port | `3001` |
| MONGODB_URI | Database connection | Internal connection string |
| REDIS_URL | Cache connection | Internal connection string |
| JWT_SECRET | Auth token secret | 64-char random string |
| CORS_ORIGIN | API access control | App URL |

### Your App URLs:

- **Main Application**: `https://mafia-game-xxxx.onrender.com`
- **Health Check**: `https://mafia-game-xxxx.onrender.com/api/health`
- **WebSocket**: Connects automatically via Socket.IO

### Performance Expectations:

**Free Tier:**
- ✅ Unlimited bandwidth
- ✅ 750 hours/month runtime
- ✅ Automatic HTTPS
- ✅ Auto-deploy from Git
- ⚠️ Cold starts after 15 min inactivity (30-60s wake-up)
- ⚠️ 512MB RAM limit
- ⚠️ Shared CPU

**To Eliminate Cold Starts:**
- Upgrade to Starter plan: $7/month per service
- App runs 24/7
- No sleep/wake delays
- Better performance

---

## 🐛 Comprehensive Troubleshooting

Common issues and solutions.

### Issue 1: Build Fails with "Cannot find module"

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Cause:** Missing dependency in package.json

**Solution:**
1. Check server/package.json includes all dependencies
2. Verify client/package.json includes all dependencies
3. In root package.json, verify workspaces are defined:
   ```json
   "workspaces": ["server", "client"]
   ```
4. Push changes to GitHub
5. Trigger manual deploy on Render

### Issue 2: "Application failed to respond"

**Symptoms:**
- App status stuck on "Starting"
- Health checks fail
- Logs show: "Health check failed"

**Cause:** App not listening on correct port or path

**Solution:**
1. Verify server listens on process.env.PORT
2. Check server code:
   ```javascript
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => console.log(`Server on ${PORT}`));
   ```
3. Verify Dockerfile exposes port 3001
4. Check Health Check Path is `/` in settings

### Issue 3: CORS Errors in Browser Console

**Symptoms:**
```
Access to fetch blocked by CORS policy
No 'Access-Control-Allow-Origin' header
```

**Cause:** CORS_ORIGIN doesn't match your app URL

**Solution:**
1. Go to Environment variables
2. Find CORS_ORIGIN
3. Update to EXACT app URL (no trailing slash)
4. Save and wait for redeploy
5. Clear browser cache and retry

### Issue 4: "Cannot connect to MongoDB"

**Symptoms:**
```
MongoError: failed to connect
Connection timeout
```

**Cause:** Wrong MONGODB_URI or MongoDB not running

**Solution:**
1. Check mafia-mongodb status is "Available"
2. Verify MONGODB_URI environment variable:
   - Should start with `mongodb://`
   - Should include `@mafia-mongodb:27017`
   - Should end with `/mafia`
3. Copy connection string again from MongoDB service
4. Update environment variable
5. Redeploy

### Issue 5: WebSocket Connections Fail

**Symptoms:**
- Real-time features don't work
- "Socket connection failed" in console
- Players don't see each other

**Cause:** WebSocket configuration or Redis issue

**Solution:**
1. Check mafia-redis status is "Available"
2. Verify REDIS_URL environment variable
3. Check server Socket.IO configuration allows your domain
4. Verify Socket.IO client connects to correct URL
5. Check logs for Socket.IO errors

### Issue 6: Static Files Not Found (404)

**Symptoms:**
- Main page works
- CSS/JS files return 404
- Page loads but looks broken

**Cause:** Static file serving not configured

**Solution:**
1. Verify Dockerfile copies client build:
   ```dockerfile
   COPY --from=client-builder /app/client/dist ./client/dist
   ```
2. Check server serves static files:
   ```javascript
   app.use(express.static(path.join(__dirname, '../client/dist')));
   ```
3. Rebuild and redeploy

### Issue 7: "Out of Memory" Errors

**Symptoms:**
```
JavaScript heap out of memory
Process killed
```

**Cause:** Free tier has 512MB RAM limit

**Solution:**
1. Optimize build process
2. Remove unnecessary dependencies
3. Use production builds (smaller)
4. Upgrade to Starter plan (2GB RAM)

### Issue 8: Service Won't Start After Deploy

**Symptoms:**
- Build succeeds
- Status shows "Starting..." forever
- Eventually shows "Deploy failed"

**Cause:** Application crashes on startup

**Solution:**
1. Check logs for error messages
2. Common issues:
   - Missing environment variables
   - Database connection fails
   - Port already in use
   - Syntax error in code
3. Fix the error, push to Git
4. Trigger new deploy

### Issue 9: Free Tier Cold Starts Too Slow

**Symptoms:**
- App takes 60+ seconds to wake up
- Users complain about timeouts

**Cause:** Free tier limitation

**Solutions:**
1. **Optimize Docker image size:**
   - Use alpine base images
   - Multi-stage builds
   - Remove dev dependencies

2. **Use ping services (workaround):**
   - Services like UptimeRobot
   - Ping your app every 14 minutes
   - Keeps app warm
   - ⚠️ Against Render ToS if abused

3. **Upgrade to paid plan:**
   - Starter: $7/month
   - No cold starts
   - Better performance
   - Worth it for production

### Issue 10: Database Connection Drops

**Symptoms:**
```
MongoDB connection lost
Redis connection closed
```

**Cause:** Network interruption or timeout

**Solution:**
1. Implement connection retry logic in code:
   ```javascript
   mongoose.connect(uri, {
     useNewUrlParser: true,
     useUnifiedTopology: true,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
   });
   ```
2. Add connection event listeners
3. Reconnect automatically on disconnect
4. Already implemented in your code

---

## 🔐 Security Best Practices

Important security configurations.

### 1. Rotate JWT_SECRET Regularly

Every 90 days:
1. Generate new random 64-char string
2. Update JWT_SECRET environment variable
3. All users will need to log in again

### 2. Use Environment Variables for Secrets

Never commit to Git:
- ❌ `const secret = "mysecret123";`
- ✅ `const secret = process.env.JWT_SECRET;`

### 3. Enable HTTPS Only

Already enabled by Render:
- All traffic uses HTTPS
- HTTP redirects to HTTPS
- TLS 1.2+ enforced

### 4. Restrict CORS Origin

Never use wildcard:
- ❌ `CORS_ORIGIN=*`
- ✅ `CORS_ORIGIN=https://your-app.onrender.com`

### 5. Monitor Service Logs

Weekly:
1. Check logs for suspicious activity
2. Look for failed login attempts
3. Monitor unusual traffic patterns
4. Review error frequencies

### 6. Keep Dependencies Updated

Monthly:
1. Run `npm audit` in server and client
2. Update vulnerable packages
3. Test updates locally
4. Push to GitHub (auto-deploys)

### 7. Set Up Database Backups

Free tier doesn't include backups:
1. Upgrade to paid plan for auto-backups
2. Or manually export MongoDB data weekly
3. Use `mongodump` or MongoDB Compass
4. Store backups securely

---

## 📊 Monitoring & Maintenance

Keep your app running smoothly.

### Daily Checks:
- [ ] Check service status (all green)
- [ ] Verify app loads correctly
- [ ] Review error counts in logs

### Weekly Checks:
- [ ] Review metrics (CPU, memory, requests)
- [ ] Check for new errors in logs
- [ ] Test full game flow end-to-end
- [ ] Verify database storage usage

### Monthly Checks:
- [ ] Review and rotate JWT_SECRET
- [ ] Update npm dependencies
- [ ] Run security audit (`npm audit`)
- [ ] Review and optimize performance
- [ ] Check database size and cleanup old data
- [ ] Test disaster recovery (backup restore)

### When to Upgrade:

Consider paid plans when:
1. **You have regular users** - Cold starts hurt UX
2. **Usage > 750 hrs/month** - Free tier limit
3. **Need backups** - Production data safety
4. **Want better performance** - More RAM/CPU
5. **Need support** - Faster response times

---

## 🎉 Success! You're Live!

Your Mafia game is now deployed and accessible worldwide at:
**`https://your-app.onrender.com`**

### Share with Friends:
1. Copy your app URL
2. Send to friends
3. Create a room together
4. Play Mafia online!

### Next Steps:
- [ ] Add custom domain (optional)
- [ ] Set up monitoring alerts
- [ ] Invite beta testers
- [ ] Gather feedback
- [ ] Iterate and improve
- [ ] Consider upgrading plan for better UX

### Support Resources:
- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Render Status**: https://status.render.com
- **Your Logs**: Check `mafia-game` → Logs for issues

---

**Need help?** Check the troubleshooting section above or review your logs for specific error messages!

**Congratulations on deploying your Mafia game! 🎮🎉**

1. On the Render Dashboard, click the **"New +"** button (top right)
2. Select **"Private Service"** from the dropdown
3. Choose **"MongoDB"** (you may need to scroll down)
4. Fill in these details:

**MongoDB Configuration:**
- **Name**: `mafia-mongodb`
- **Database Name**: `mafia`
- **User**: `admin` (or leave default)
- **Region**: `Oregon (US West)` (or closest to you)
- **Plan**: `Free` (or choose paid for better performance)

5. Click **"Create Database"** button
6. Wait 2-3 minutes for MongoDB to provision
7. Once status shows **"Available"**, click on the database
8. Find **"Internal Connection String"** in the Connections section
9. Click the **copy icon** - it looks like: `mongodb://admin:XXXXXXXXXX@mafia-mongodb:27017/mafia`
10. **SAVE THIS** - open Notepad and paste it (you'll need it in Step 5)

---

## Step 4: Create Redis Instance

1. Go back to Dashboard, click **"New +"** button again
2. Select **"Redis"** from the dropdown
3. Fill in these details:

**Redis Configuration:**
- **Name**: `mafia-redis`
- **Region**: `Oregon (US West)` (same as MongoDB)
- **Plan**: `Free` (or choose paid)
- **Maxmemory Policy**: `noeviction` (default is fine)

4. Click **"Create Redis"** button
5. Wait 1-2 minutes for Redis to provision
6. Once status shows **"Available"**, click on the Redis instance
7. Find **"Internal Connection String"** in the Connections section
8. Click the **copy icon** - it looks like: `redis://red-xxxxxxxxxxxxxxxxxxxxx:6379`
9. **SAVE THIS** - paste it in Notepad below the MongoDB string

---

## Step 5: Create Web Service

Now create the main application that serves both frontend and backend.

1. Go back to Dashboard, click **"New +"** button
2. Select **"Web Service"** from the dropdown
3. Click **"Build and deploy from a Git repository"**
4. Click **"Connect"** next to your Mafia repository
5. Fill in ALL these settings carefully:

### Basic Settings:
- **Name**: `mafia-game`
- **Region**: `Oregon (US West)` (same as your databases)
- **Branch**: `master`
- **Root Directory**: (leave blank)
- **Runtime**: Select **"Docker"**
- **Dockerfile Path**: `./Dockerfile`

### Instance Settings:
- **Plan Type**: `Free` (or upgrade to Starter $7/month for no cold starts)

### Advanced Settings:
Click **"Advanced"** button to expand, then:

- **Auto-Deploy**: `Yes` (enabled by default)
- **Health Check Path**: `/`

### Environment Variables:
Click **"Add Environment Variable"** for each of these. You'll add 6 variables total:

**Variable 1:**
- **Key**: `NODE_ENV`
- **Value**: `production`

**Variable 2:**
- **Key**: `PORT`
- **Value**: `3001`

**Variable 3:**
- **Key**: `MONGODB_URI`
- **Value**: Paste the MongoDB connection string from Step 3 (from your Notepad)
- Example: `mongodb://admin:abc123xyz@mafia-mongodb:27017/mafia`

**Variable 4:**
- **Key**: `REDIS_URL`
- **Value**: Paste the Redis connection string from Step 4 (from your Notepad)
- Example: `redis://red-abcd1234efgh5678:6379`

**Variable 5:**
- **Key**: `JWT_SECRET`
- **Value**: Generate a random string (64 characters)
- You can use: `mafiagame2026secretkeyrandomstringforjwttokensecuritypurposesonly123`
- Or generate your own at https://generate-random.org/api-token-generator

**Variable 6:**
- **Key**: `CORS_ORIGIN`
- **Value**: `https://mafia-game.onrender.com` (you'll update this after deployment)

6. Double-check all environment variables are entered correctly
7. Click **"Create Web Service"** button at the bottom

---

## Step 6: Update CORS_ORIGIN

After the web service is created:

1. You'll see your actual app URL at the top (e.g., `https://mafia-game-xxxx.onrender.com`)
2. If it's different from what you entered, update the CORS_ORIGIN:
   - Click **"Environment"** in the left sidebar
   - Find `CORS_ORIGIN` variable
   - Click the **pencil icon** to edit
   - Update with your actual URL (copy from the top of the page)
   - **Remove any trailing slash** - should be `https://mafia-game-xxxx.onrender.com` NOT `https://mafia-game-xxxx.onrender.com/`
   - Click **"Save Changes"**

The service will automatically redeploy with the correct CORS setting.

---

## Step 7: Monitor Deployment

1. Stay on the **"mafia-game"** service page
2. Click **"Logs"** in the left sidebar
3. Watch the build process in real-time
4. You'll see logs like:
   ```
   ==> Building Docker image...
   ==> Downloading base images
   ==> Installing dependencies
   ==> Building client and server
   ==> Starting application
   ==> Server listening on port 3001
   ==> Your service is live 🎉
   ```

**Build Time:** 
- First deployment: 8-12 minutes
- Subsequent deployments: 3-5 minutes

**What's happening:**
- Render pulls your code from GitHub
- Builds Docker container with Node.js
- Installs all dependencies for client and server
- Builds the React frontend
- Starts the Express backend
- Serves static files through the backend

---

## Step 8: Verify Deployment

### 8.1 Check Service Status
1. At the top of the page, status should show **"Live"** (green dot)
2. If it shows "Deploy failed" or "Build failed", check the Logs tab for errors

### 8.2 Test Your Application
1. Click your app URL at the top (e.g., `https://mafia-game-xxxx.onrender.com`)
2. Your Mafia game should open in a new browser tab
3. You should see the landing page with:
   - Mafia game logo/title
   - "Create Room" button
   - "Join Room" button
   - Clean UI without errors

### 8.3 Test Backend API
Open this URL in your browser (replace with your actual URL):
```
https://mafia-game-xxxx.onrender.com/api/health
```

You should see a JSON response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T12:34:56.789Z",
  "mongodb": "connected",
  "redis": "connected"
}
```

### 8.4 Test a Full Game (Optional)
1. Click **"Create Room"**
2. Enter a room code and your name
3. Open the same URL in another browser or incognito window
4. Click **"Join Room"** with the same code
5. Verify that:
   - Both players appear in the lobby
   - Chat works
   - Game can start when ready

---

## ✅ Deployment Complete!

Your Mafia game is now live and accessible worldwide!

**Your Deployment Summary:**

| Service | URL/Connection | Status |
|---------|----------------|--------|
| **Web App** | `https://mafia-game-xxxx.onrender.com` | Live |
| **MongoDB** | Internal connection (private) | Available |
| **Redis** | Internal connection (private) | Available |
| **Health Check** | `/api/health` | OK |
| **WebSocket** | Connects via Socket.IO automatically | Active |

---

## 📋 Complete Configuration Reference

Here's everything you configured:

### MongoDB (`mafia-mongodb`)
- **Type**: Private Service - MongoDB
- **Database Name**: `mafia`
- **Region**: Oregon (US West)
- **Plan**: Free
- **Connection**: Internal (private network)

### Redis (`mafia-redis`)
- **Type**: Redis
- **Region**: Oregon (US West)
- **Plan**: Free
- **Connection**: Internal (private network)

### Web Service (`mafia-game`)
- **Type**: Web Service
- **Runtime**: Docker
- **Dockerfile**: `./Dockerfile`
- **Branch**: master
- **Region**: Oregon (US West)
- **Plan**: Free

**Environment Variables:**
```
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://admin:PASSWORD@mafia-mongodb:27017/mafia
REDIS_URL=redis://red-XXXXX:6379
JWT_SECRET=your-64-char-random-string
CORS_ORIGIN=https://mafia-game-xxxx.onrender.com
```

---

## Verify Deployment

## Important Notes

### Free Tier Limitations
- Apps spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- 750 hours/month of runtime
- MongoDB and Redis have storage limits

### Upgrading
To avoid cold starts and get better performance:
- Upgrade to **Starter** plan ($7/month per service)
- Keeps your app running 24/7
- Better performance and resources

## Troubleshooting

### Build Fails
- Check **"Logs"** tab for error messages
- Verify `Dockerfile` is at project root
- Ensure all dependencies are listed in `package.json`

### App Crashes on Startup
- Check environment variables are set correctly
- Verify MongoDB and Redis connection strings
- Check **"Logs"** for specific error messages

### Database Connection Errors
- Use **internal** connection strings (faster, free networking)
- Format: `mongodb://[internal-url]:27017/mafia`
- Verify both MongoDB and Redis are running

### CORS Errors
- Update `CORS_ORIGIN` to match your deployed URL
- Don't include trailing slash
- Must use HTTPS (http:// won't work)

## Monitoring

### View Logs
- Service Dashboard → **"Logs"** tab
- Real-time log streaming
- Filter by severity (info, error, etc.)

### Metrics
- Service Dashboard → **"Metrics"** tab
- CPU, Memory, Network usage
- Request counts and response times

### Health Checks
- Automatic health checks every 30 seconds
- Endpoint: `/` (Nginx serves index.html)
- Backend: `/api/health`

## Custom Domain (Optional)

1. Service Dashboard → **"Settings"** → **"Custom Domain"**
2. Add your domain: `mafia.yourdomain.com`
3. Update DNS records as instructed
4. Update `CORS_ORIGIN` environment variable

## Backup & Updates

### Database Backups
- Free tier: No automated backups
- Paid plans: Automated daily backups
- Manual export: Use MongoDB Compass or mongodump

### Deploy Updates
1. Push changes to GitHub
2. Render auto-deploys from `master` branch
3. Or click **"Manual Deploy"** → **"Clear build cache & deploy"**

### Rollback
1. Service Dashboard → **"Events"** tab
2. Find previous successful deployment
3. Click **"Rollback to this version"**

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: https://github.com/VyasGaurav1/Mafia_Game/issues

---

**Your app is production-ready!** 🎉

Expected timeline:
- Blueprint setup: 2 minutes
- First build: 8-12 minutes
- Subsequent builds: 3-5 minutes
