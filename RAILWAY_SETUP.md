# Railway Deployment Setup

## Required Environment Variables (Must be set in Railway Dashboard)

Go to **Railway Dashboard > Your Project > Variables** and set these variables:

### Required for Core Function:
```
OPENROUTER_API_KEY=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
DATABASE_URL=postgresql://railway-database-url-here  # (Automatic from Railway PostgreSQL)
REDIS_URL=redis://railway-redis-url-here      # (Automatic from Railway Redis)
```

### Optional (Enhanced Features):
```
APP_URL=https://assist-me-virtual-assistant.vercel.app
APP_NAME=AssistMe Virtual Assistant
DEV_MODE=false
```

## Railway Services Setup

1. **Add PostgreSQL Database** (required for chat persistence)
2. **Add Redis** (required for rate limiting, voice sessions)
3. **Deploy the application**

## Troubleshooting Health Checks

If deployment fails with health check errors:
1. Check Railway logs for specific error messages
2. Verify all required environment variables are set
3. Ensure the database and Redis services are connected

## Testing Deployment

Once deployed, test these endpoints:
- Health check: `GET /health`
- API status: `GET /api/models` (should return available models)

## Database Migration

The app will auto-create tables on startup, but if you need to run migrations manually:
```bash
railway connect postgres
alembic upgrade head
