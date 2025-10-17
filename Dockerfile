FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ .
RUN chmod +x start.sh

ENV PYTHONPATH=/app
ENV PORT=8001

EXPOSE 8001

CMD ./start.sh
