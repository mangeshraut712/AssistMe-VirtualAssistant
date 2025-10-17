#!/bin/bash

echo "🚀 Starting Railway deployment..."

# Wait for database to be ready (Railway provides PostgreSQL)
echo "⏳ Waiting for database connection..."
sleep 5

# Run database migrations with error handling
echo "🗄️ Running database migrations..."
if alembic upgrade head; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Migration failed, but continuing to start server..."
fi

# Start the server with proper port handling
echo "⚡ Starting FastAPI server on port ${PORT:-8000}..."
echo "📡 Railway URL: https://assistme-virtualassistant.up.railway.app"

# Use Railway's PORT environment variable or default
PORT=${PORT:-8000}
uvicorn app.main:app --host 0.0.0.0 --port $PORT
