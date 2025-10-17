FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN chmod +x start.sh

# Railway Docker deployment for AssistMe Virtual Assistant
ENV PYTHONPATH=/app
ENV PORT=8001

EXPOSE 8001

CMD ./start.sh
