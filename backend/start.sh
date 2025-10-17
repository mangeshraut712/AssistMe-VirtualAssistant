#!/bin/bash

echo "🚀 Starting Railway deployment..."

# Run database migrations
echo "🗄️ Running database migrations..."
alembic upgrade head

# Start the server
echo "⚡ Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT
