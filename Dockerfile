FROM python:3.14

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN chmod +x start.sh

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# Railway Docker deployment - Railway provides PORT env var automatically
ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["./start.sh"]
