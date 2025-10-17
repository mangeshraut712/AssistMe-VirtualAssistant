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

# Wait for database to be ready (Railway provides PostgreSQL)
echo "⏳ Waiting for database connection..."
sleep 5

# Try database connection
echo "🗄️ Testing database connection..."
python3 -c "
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
db_url = os.getenv('DATABASE_URL')
if db_url:
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1'))
            print('✅ Database connection successful')
            conn.close()
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
else:
    print('❌ DATABASE_URL not set')
"

# Run database migrations with error handling
echo "🗄️ Running database migrations..."
if alembic upgrade head; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Migration failed, but continuing to start server..."
fi

# Check if required env vars are set
echo "🔑 Checking environment variables..."
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "⚠️  WARNING: OPENROUTER_API_KEY not set!"
else
    echo "✅ OPENROUTER_API_KEY is set"
fi

# Start the server with proper port handling
PORT=${PORT:-8000}
echo "⚡ Starting FastAPI server on port ${PORT}..."
echo "📡 Railway URL: https://assistme-virtualassistant-production.up.railway.app"

# Start uvicorn with more verbose output
uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info
