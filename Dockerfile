# Use slim Python base
FROM python:3.11-slim

# Prevents Python from writing .pyc and ensures output is shown immediately
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Workdir
WORKDIR /app

# System updates (no dev toolchains needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Render provides $PORT; default to 8080 for local docker run
ENV PORT=8080

# Expose for local runs (Render ignores EXPOSE but it's fine)
EXPOSE 8080

# Initialize DB on container start then launch gunicorn
# (Flask init_db runs when app imports; to be safe we keep it simple)
CMD exec gunicorn app:app --bind 0.0.0.0:${PORT} --workers 2 --threads 8 --timeout 120
