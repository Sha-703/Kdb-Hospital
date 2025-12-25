#!/bin/sh
set -e

# Wait for DB to be ready (simple loop)
if [ -n "$POSTGRES_HOST" ]; then
  echo "Waiting for database..."
  while ! nc -z ${POSTGRES_HOST:-db} ${POSTGRES_PORT:-5432}; do
    sleep 1
  done
fi

echo "Apply database migrations"
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput

echo "Collect static"
python manage.py collectstatic --noinput || true

echo "Starting server"
gunicorn hms.wsgi:application --bind 0.0.0.0:8000
