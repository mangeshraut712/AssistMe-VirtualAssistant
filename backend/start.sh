#!/bin/bash

echo "🚀 Starting FastAPI server..."

# Railway sets PORT env var, defaults to 8001 for Railway Docker mapping
SERVER_PORT=${PORT:-8001}
echo "⚡ Starting FastAPI server on port ${SERVER_PORT}..."

# Start uvicorn with basic configuration
uvicorn app.main:app --host 0.0.0.0 --port $SERVER_PORT --log-level info --access-log --lifespan on --workers 1
