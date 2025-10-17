FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV PYTHONPATH=/app
ENV PORT=8001

EXPOSE 8001

CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
