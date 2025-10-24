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
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./
RUN chmod +x start.sh

#

ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
ENV PYTHONPATH=/app

EXPOSE 8001

# Let Railway use Dockerfile CMD directly - no competing startCommand in railway.toml
CMD ./start.sh
