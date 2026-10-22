FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade 'pip>=26.2.2' 'certifi>=2026.10.19'
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Make start.sh executable
RUN chmod +x start.sh
# Use exec form for Railway compatibility
CMD ["./start.sh"]
