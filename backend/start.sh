#!/bin/bash

set -x  # Enable verbose logging

echo "🚀 Starting Railway deployment..."

# Print environment info
echo "🐛 Debugging Railway deployment..."
echo "Environent variables:"
echo "DATABASE_URL=${DATABASE_URL:0:20}..." # Mask for security
echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY:+SET}" # Show if set, not the value
echo "PORT=${PORT:-not_set}"
echo "APP_URL=${APP_URL}"

# Try database connection (skip if no DB configured)
echo "🗄️ Testing database connection..."
python3 - <<'PYTHON'
from sqlalchemy import create_engine, text

from app.settings import get_database_url

db_url = get_database_url()
if not db_url:
    print("⚠️  Database URL not configured; skipping connectivity check.")
else:
    print("⏳ Waiting for database connection...")
    sleep 5
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
    except Exception as exc:
        print(f"❌ Database connection failed: {exc}")
PYTHON

# Run database migrations with error handling
if python3 - <<'PYTHON'
from app.settings import get_database_url
import sys

if get_database_url() is None:
    sys.exit(1)
PYTHON
then
  echo "🗄️ Running database migrations..."
  if alembic upgrade head; then
    echo "✅ Database migrations completed successfully"
  else
    echo "❌ Migration failed, but continuing to start server..."
  fi
else
  echo "ℹ️ No DATABASE_URL detected; skipping migrations."
fi

# Check if required env vars are set
echo "🔑 Checking environment variables..."
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "⚠️  WARNING: OPENROUTER_API_KEY not set!"
else
    echo "✅ OPENROUTER_API_KEY is set"
fi

# Start the server with proper port handling
# Railway sets PORT env var, defaults to 8001 for Railway Docker mapping
SERVER_PORT=${PORT:-8001}
echo "⚡ Starting FastAPI server on port ${SERVER_PORT}..."
echo "📡 Railway URL: https://assistme-virtualassistant-production.up.railway.app"
echo "🔌 Railway PORT environment variable: '${PORT}' (defaults to 8001)"

# Start uvicorn with more verbose output
uvicorn app.main:app --host 0.0.0.0 --port $SERVER_PORT --log-level info
