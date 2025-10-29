# Optimized for Railway deployment - Size limited to 4GB
# Uses production requirements to exclude heavy development dependencies
FROM python:3.12-alpine

# Install system dependencies with minimal footprint
RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    libressl-dev \
    git \
    && rm -rf /var/cache/apk/*

# Set work directory
WORKDIR /app

# Copy production requirements first for better layer caching
COPY requirements-production.txt requirements.txt

# Install Python dependencies with aggressive caching removal
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    find /usr/local -name "*.pyc" -delete && \
    find /usr/local -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf /root/.cache/pip && \
    rm -rf /tmp/*

# Copy application code
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY start.sh .

# Make start.sh executable
RUN chmod +x start.sh

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

# Use exec form for Railway compatibility
CMD ["./start.sh"]
