#!/bin/bash
echo "Starting AssistMe Virtual Assistant..."
echo "Running database migrations..."
python -m alembic upgrade head || echo "Migration failed, continuing..."
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT
