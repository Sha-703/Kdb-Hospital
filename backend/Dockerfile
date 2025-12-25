FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /vol/web/media
RUN chmod +x /app/docker-entrypoint.sh || true
CMD ["/bin/sh", "/app/docker-entrypoint.sh"]
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential libpq-dev --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt

RUN pip install --upgrade pip
RUN pip install -r /app/requirements.txt

COPY backend /app

ENV DJANGO_SETTINGS_MODULE=elections_project.settings

# Try to collect static files if configured; don't fail the build if it fails.
RUN python manage.py collectstatic --noinput || true

CMD ["gunicorn", "elections_project.wsgi:application", "--bind", "0.0.0.0:8000"]
