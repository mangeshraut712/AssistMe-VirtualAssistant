#!/usr/bin/env sh
SERVER_PORT=${PORT:-8001}
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${SERVER_PORT}" --log-level info --workers 1
