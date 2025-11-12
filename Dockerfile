# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

# Expose port (Railway provides PORT environment variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD sh -c 'python -c "import requests; import os; port=os.environ.get(\"PORT\", \"8000\"); requests.get(f\"http://localhost:{port}/health\")"'

# Start the application (Railway provides PORT environment variable)
CMD sh -c "python -m uvicorn app.main:app --host 0.0.0.0 --port \$PORT"
