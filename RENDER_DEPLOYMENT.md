# 🚀 Quick Render Deployment Guide

This guide will help you deploy your Mafia game to Render in minutes.

## Prerequisites
- GitHub account with the repository pushed
- Render account (sign up at https://render.com - free tier available)

## Automatic Deployment with render.yaml

Your project includes a `render.yaml` file that automatically configures all services.

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### Step 2: Create Blueprint Instance
1. From the Render Dashboard, click **"New +"** → **"Blueprint"**
2. Connect your repository: `VyasGaurav1/Mafia_Game`
3. Render will detect the `render.yaml` file automatically
4. Click **"Apply"**

### Step 3: Configure Environment Variables
Render will create:
- ✅ Web Service (mafia-game)
- ✅ MongoDB Database (mafia-mongodb)
- ✅ Redis Cache (mafia-redis)

You need to set these environment variables in the web service:

1. Go to your **mafia-game** service
2. Click **"Environment"** tab
3. Add/Update these variables:

```
MONGODB_URI = internal:[your-mongodb-internal-url]
REDIS_URL = redis://red-[your-redis-id]:6379
CORS_ORIGIN = https://mafia-game.onrender.com
```

**To get the connection strings:**
- **MongoDB**: Click on your MongoDB database → Copy "Internal Connection String"
- **Redis**: Click on your Redis instance → Copy "Internal Connection String"
- **CORS_ORIGIN**: Use your deployed app URL (shown in the dashboard)

### Step 4: Deploy
1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait for the build to complete (5-10 minutes for first deployment)
3. Your app will be live at: `https://mafia-game.onrender.com` (or your custom URL)

## Manual Deployment (Alternative)

If you prefer manual setup:

### 1. Create MongoDB Database
1. Dashboard → **New +** → **PostgreSQL** → Choose **MongoDB** from Private Services
2. Name: `mafia-mongodb`
3. Region: Oregon (or closest to you)
4. Plan: Free
5. Copy the Internal Connection String

### 2. Create Redis Instance
1. Dashboard → **New +** → **Redis**
2. Name: `mafia-redis`
3. Region: Oregon (same as MongoDB)
4. Plan: Free
5. Copy the Internal Connection String

### 3. Create Web Service
1. Dashboard → **New +** → **Web Service**
2. Connect repository: `VyasGaurav1/Mafia_Game`
3. Settings:
   - **Name**: `mafia-game`
   - **Runtime**: Docker
   - **Branch**: master
   - **Dockerfile Path**: `Dockerfile`
   - **Region**: Oregon
   - **Plan**: Free (or upgrade for better performance)

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=[paste from step 1]
   REDIS_URL=[paste from step 2]
   JWT_SECRET=[generate random 64-char string]
   CORS_ORIGIN=https://[your-app-name].onrender.com
   ```

5. Click **"Create Web Service"**

## Verify Deployment

After deployment completes:

1. Visit your app URL
2. Check the logs: Service → **"Logs"** tab
3. Test the health endpoint: `https://[your-app].onrender.com/api/health`

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
