#!/usr/bin/env bash
# Render build script for AssistMe Virtual Assistant
# Installs dependencies and runs database migrations

set -e  # Exit on any error

echo "🚀 Starting Render build process..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r backend/requirements.txt

# Run database migrations
echo "🗄️ Running database migrations..."
cd backend
python -m alembic upgrade head

echo "✅ Build process completed successfully!"
