# AssistMe Deployment Guide

Complete guide for deploying the AssistMe Virtual Assistant to production.

## 📋 Prerequisites

### Required Accounts
- **Vercel Account**: For frontend deployment ([vercel.com](https://vercel.com))
- **Railway Account**: For backend deployment ([railway.app](https://railway.app))
- **OpenRouter API Key**: For AI models ([openrouter.ai](https://openrouter.ai))
- **GitHub Account**: For repository hosting and CI/CD

### Local Development Tools
- Node.js 18+ or 20+
- Python 3.12+
- Git
- npm or yarn

## 🚀 Quick Deployment

### 1. Prepare Repository

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant

# Install dependencies
npm install
```

### 2. Deploy Backend to Railway

#### Option A: Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
railway variables set APP_URL=https://your-vercel-app.vercel.app
railway variables set DEV_MODE=false

# Deploy
railway up
```

#### Option B: Using Railway Dashboard
1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Railway will auto-detect the Dockerfile
4. Configure environment variables in the Railway dashboard:
   ```
   OPENROUTER_API_KEY = sk-or-v1-your-actual-key-here
   APP_URL = https://your-vercel-app.vercel.app
   DEV_MODE = false
   PYTHONUNBUFFERED = 1
   FASTAPI_BIND_HOST = 0.0.0.0
   ```
5. Click "Deploy" - Railway will use the Dockerfile
6. Note the generated URL (e.g., `https://your-app.up.railway.app`)

#### Add PostgreSQL Database (Optional but Recommended)
1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically set `DATABASE_URL` environment variable
3. Restart your backend service

### 3. Deploy Frontend to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and create a new project
2. Import your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
4. Add environment variable:
   ```
   NODE_ENV = production
   ```
5. Click "Deploy"

#### Update Backend URL in vercel.json
After Railway deployment, update `vercel.json` with your Railway backend URL:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-actual-railway-url.up.railway.app/api/:path*"
    }
  ]
}
```

Then redeploy:
```bash
vercel --prod
```

### 4. Update Backend CORS Settings

After Vercel deployment, update Railway environment variables:
```bash
railway variables set APP_URL=https://your-actual-vercel-url.vercel.app
```

Then restart the Railway service.

## 🔧 Environment Variables

### Backend (Railway)

#### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI models | `sk-or-v1-...` |

#### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `APP_URL` | Frontend URL for CORS | Auto-detected |
| `DATABASE_URL` | PostgreSQL connection string | SQLite fallback |
| `DEV_MODE` | Development mode flag | `false` |
| `PORT` | Server port | Auto-assigned by Railway |
| `FASTAPI_BIND_HOST` | Server bind address | `0.0.0.0` |
| `PYTHONUNBUFFERED` | Python output buffering | `1` |

### Frontend (Vercel)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |

## 🧪 Testing Deployment

### Backend Health Check
```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "assistme-api",
  "version": "2.0.0",
  "timestamp": "2025-01-12T12:00:00.000000",
  "components": {
    "database": {
      "status": "connected"
    },
    "chat_client": {
      "status": "available",
      "api_key_configured": true
    },
    "kimi_client": {
      "status": "unavailable"
    }
  }
}
```

### Frontend Test
1. Visit your Vercel URL: `https://your-vercel-url.vercel.app`
2. Click "New chat"
3. Select a model from the dropdown
4. Send a test message
5. Verify you receive a response

### API Status Test
```bash
curl https://your-railway-url.up.railway.app/api/status
```

### Models List Test
```bash
curl https://your-railway-url.up.railway.app/api/models
```

## 🔒 Security Checklist

- [ ] Environment variables set correctly in both platforms
- [ ] `.env` files NOT committed to repository
- [ ] OpenRouter API key is valid and active
- [ ] CORS configured with actual frontend URL
- [ ] Health check endpoint returns 200 OK
- [ ] HTTPS enabled on both deployments
- [ ] Database credentials secured (if using PostgreSQL)
- [ ] No console.logs in production build

## 🐛 Troubleshooting

### Backend Issues

#### "Chat functionality is not available"
**Cause**: OpenRouter API key not set or invalid

**Solution**:
```bash
railway variables set OPENROUTER_API_KEY=sk-or-v1-your-actual-key
railway restart
```

#### "Database connection failed"
**Cause**: DATABASE_URL not set or invalid

**Solution**:
1. Add PostgreSQL database in Railway dashboard
2. Restart backend service
3. Check logs: `railway logs`

#### Health check fails
**Cause**: Port binding issues or startup errors

**Solution**:
```bash
# Check Railway logs
railway logs

# Verify environment variables
railway variables

# Restart service
railway restart
```

### Frontend Issues

#### "Failed to fetch" errors
**Cause**: CORS misconfiguration or wrong backend URL

**Solution**:
1. Update `vercel.json` with correct Railway URL
2. Redeploy: `vercel --prod`
3. Update Railway `APP_URL` with Vercel URL
4. Restart Railway service

#### Build fails on Vercel
**Cause**: Node version mismatch or missing dependencies

**Solution**:
1. Check build logs in Vercel dashboard
2. Ensure Node.js 18+ is used
3. Try clearing cache and rebuilding
4. Verify `package.json` and `package-lock.json` are committed

### Common Issues

#### 404 on API routes
**Cause**: Vercel rewrite rules not working

**Solution**: Verify `vercel.json` has correct rewrite rules pointing to Railway

#### Slow response times
**Cause**: Cold starts or distant server regions

**Solution**:
1. Consider upgrading Railway plan for always-on instances
2. Adjust Vercel region in `vercel.json` to match Railway region
3. Implement caching strategies

## 📊 Monitoring

### Railway Monitoring
- View logs: `railway logs` or in dashboard
- Check metrics: CPU, Memory, Network in dashboard
- Set up alerts for errors and downtime

### Vercel Monitoring
- Analytics dashboard shows page views and performance
- Function logs available in dashboard
- Set up Vercel Integration for alerts

### Health Monitoring
Set up external monitoring with services like:
- UptimeRobot
- Pingdom
- Better Uptime

Monitor these endpoints:
- Frontend: `https://your-vercel-url.vercel.app`
- Backend health: `https://your-railway-url.up.railway.app/health`
- Backend API: `https://your-railway-url.up.railway.app/api/status`

## 🔄 Continuous Deployment

### Automatic Deployments

Both Vercel and Railway support automatic deployments from Git:

1. **Railway**: Auto-deploys on push to `main` branch
2. **Vercel**: Auto-deploys on push to `main` branch

### GitHub Actions CI

The project includes CI workflow that:
- Runs on every push and PR to `main`
- Tests build on Node 18 and 20
- Creates build artifacts
- Validates code quality

To enable:
1. Workflows are in `.github/workflows/`
2. No additional setup needed
3. View results in GitHub Actions tab

## 📈 Performance Optimization

### Frontend Optimizations
- ✅ Code splitting enabled
- ✅ Terser minification
- ✅ CSS minification
- ✅ Asset hashing for caching
- ✅ Console.log removal in production
- ✅ Bundle size: ~42KB (gzipped: ~12KB)

### Backend Optimizations
- ✅ Docker multi-stage builds
- ✅ Non-root user for security
- ✅ Health check with curl
- ✅ SQLite fallback for dev
- ✅ Graceful degradation
- ✅ Connection pooling

## 📝 Post-Deployment Steps

1. **Update README.md** with actual deployment URLs
2. **Set up monitoring** for uptime and errors
3. **Configure custom domain** (optional):
   - Vercel: Add domain in settings
   - Railway: Add custom domain in settings
4. **Enable analytics** in Vercel dashboard
5. **Set up error tracking** (e.g., Sentry)
6. **Create backup strategy** for database
7. **Document API endpoints** for team

## 🆘 Getting Help

- **GitHub Issues**: Report bugs and request features
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **OpenRouter Docs**: [openrouter.ai/docs](https://openrouter.ai/docs)

## 📄 License

MIT License - See LICENSE file for details.

---

**Last Updated**: January 2025  
**Version**: 2.0.0
