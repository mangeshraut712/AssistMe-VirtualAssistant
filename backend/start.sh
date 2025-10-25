#!/usr/bin/env sh

echo "🚀 Starting FastAPI server..."
SERVER_PORT=${PORT:-8001}
echo "⚡ Starting FastAPI server on port ${SERVER_PORT}..."

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${SERVER_PORT}" --log-level info --access-log --lifespan on --workers 1
