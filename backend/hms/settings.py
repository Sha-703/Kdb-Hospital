from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get('DJANGO_SECRET', 'dev-secret')
# Enable DEBUG by default for local development; in production set DJANGO_DEBUG='False'
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('1', 'true', 'yes')
# ALLOWED_HOSTS: read from env (comma-separated).
# In development default to '*' for convenience; in production default to the backend's Render URL.
raw_allowed = os.environ.get('ALLOWED_HOSTS', '')
if raw_allowed:
    ALLOWED_HOSTS = [h.strip() for h in raw_allowed.split(',') if h.strip()]
else:
    # sensible defaults: permissive in DEBUG, restrictive in production
    ALLOWED_HOSTS = ['*'] if DEBUG else ['kdb-hospital.onrender.com']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'tenants',
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Tenant middleware must run after AuthenticationMiddleware so we can
    # fallback to the authenticated user's Staff.tenant when header is absent.
    'middleware.tenant_middleware.TenantMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hms.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {'context_processors': ['django.template.context_processors.debug',
                                           'django.template.context_processors.request',
                                           'django.contrib.auth.context_processors.auth',
                                           'django.contrib.messages.context_processors.messages',]},
    }
]

WSGI_APPLICATION = 'hms.wsgi.application'

# Database configuration: prefer Postgres via env, fallback to sqlite for dev
if os.environ.get('POSTGRES_DB'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB'),
            'USER': os.environ.get('POSTGRES_USER'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
            'HOST': os.environ.get('POSTGRES_HOST', 'db'),
            'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'fr'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
# Where `collectstatic` will gather files for production deployments
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Optional extra static dirs (project-level static files)
STATICFILES_DIRS = [BASE_DIR / 'static']
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS configuration
# By default during development (DEBUG=True) allow all origins for convenience.
# In production, set `CORS_ALLOW_ALL_ORIGINS=false` and provide
# `CORS_ALLOWED_ORIGINS` as a comma-separated list (e.g. https://app.example.com)
CORS_ALLOW_ALL_ORIGINS = os.environ.get(
    'CORS_ALLOW_ALL_ORIGINS',
    'True' if DEBUG else 'False'
).lower() in ('1', 'true', 'yes')

# Optional explicit allowed origins (comma-separated). If not provided in production,
# default to the known frontend Render URL so only the deployed frontend is allowed.
raw_cors_allowed = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if raw_cors_allowed:
    CORS_ALLOWED_ORIGINS = [u.strip() for u in raw_cors_allowed.split(',') if u.strip()]
else:
    CORS_ALLOWED_ORIGINS = ['https://kdb-hospital-8e4t.onrender.com'] if not DEBUG else []

# If CORS_ALLOW_ALL_ORIGINS is True, django-cors-headers will allow all origins.

from rest_framework.permissions import IsAuthenticatedOrReadOnly

REST_FRAMEWORK = {
    # For local development allow unauthenticated read-only access;
    # production should use stricter defaults (IsAuthenticated).
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticatedOrReadOnly'],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# CSRF trusted origins: allow the frontend host for cross-site POSTs when in production.
raw_csrf = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if raw_csrf:
    CSRF_TRUSTED_ORIGINS = [u.strip() for u in raw_csrf.split(',') if u.strip()]
else:
    CSRF_TRUSTED_ORIGINS = ['https://kdb-hospital-8e4t.onrender.com'] if not DEBUG else []

# Simple JWT default settings (tweaks can be adjusted for prod)
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}
