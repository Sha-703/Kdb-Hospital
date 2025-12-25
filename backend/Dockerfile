FROM python:3.11-slim

# Basic python image tweaks
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# System deps (libpq-dev needed when installing psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential libpq-dev netcat-openbsd --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better caching
COPY requirements.txt /app/requirements.txt

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the backend source into the image
COPY . /app

RUN mkdir -p /vol/web/media
RUN chmod +x /app/docker-entrypoint.sh || true

# Ensure Django settings point to the correct project
ENV DJANGO_SETTINGS_MODULE=hms.settings

# Entrypoint will run migrations/collectstatic and start gunicorn
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
