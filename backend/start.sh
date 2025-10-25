#!/usr/bin/env sh
SERVER_PORT=${PORT:-8001}
SERVER_HOST=${FASTAPI_BIND_HOST:-0.0.0.0}
exec python3 -m uvicorn app.main:app --host "${SERVER_HOST}" --port "${SERVER_PORT}" --log-level info --workers 1
