FROM python:3.11-slim

# Install system dependencies for optimal performance
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=1

WORKDIR /app

# Copy and install Python dependencies first (for better caching)
# Use production requirements for faster builds
COPY backend/requirements-production.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./

# Ensure start.sh has execute permissions
RUN chmod +x start.sh

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["./start.sh"]
