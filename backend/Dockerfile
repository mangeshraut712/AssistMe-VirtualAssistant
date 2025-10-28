# Optimized for Railway deployment to prevent build timeouts
# Use Python slim image with build essential for faster installs
#
# If still timing out, try switching to requirements-production.txt:
# COPY requirements-production.txt requirements.txt
FROM python:3.11-slim

# Install system dependencies in single RUN to reduce layers
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libssl-dev \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set work directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies optimized for Railway (fast builds)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make start.sh executable
RUN chmod +x start.sh

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

# Use exec form for Railway compatibility
CMD ["./start.sh"]
