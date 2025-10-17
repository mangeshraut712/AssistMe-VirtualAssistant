FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN chmod +x start.sh

# Railway Docker deployment - Railway provides PORT env var automatically
ENV PYTHONPATH=/app

EXPOSE 8001

CMD ./backend/start.sh
