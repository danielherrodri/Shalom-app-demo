import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from .env import client_ip_settings, origin_of, trusted_origins

BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = os.environ.get('SHALOM_ENV', 'production')
if ENVIRONMENT not in {'development', 'test', 'production'}:
    raise ImproperlyConfigured('SHALOM_ENV no válido')
DEVELOPMENT = ENVIRONMENT in {'development', 'test'}
DEBUG = ENVIRONMENT == 'development'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEVELOPMENT:
        raise ImproperlyConfigured('Se requiere DJANGO_SECRET_KEY')
    # Ephemeral local/test key; no shared credential or production fallback.
    from secrets import token_urlsafe
    SECRET_KEY = token_urlsafe(64)
if not DEVELOPMENT and len(SECRET_KEY) < 50:
    raise ImproperlyConfigured('DJANGO_SECRET_KEY debe tener al menos 50 caracteres')
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver'] if DEVELOPMENT else os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')
if not DEVELOPMENT and (not all(ALLOWED_HOSTS) or '*' in ALLOWED_HOSTS):
    raise ImproperlyConfigured('Se requieren hosts explícitos')
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'rest_framework', 'core']
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.SessionDeadlineMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
AUTH_USER_MODEL = 'core.User'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'America/Mexico_City'
LANGUAGE_CODE = 'es-mx'
if DEVELOPMENT and os.environ.get('SHALOM_SQLITE_TEST_ONLY') == '1':
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'local.sqlite3'}}
else:
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('PGDATABASE', 'shalom'),
        'USER': os.environ.get('PGUSER', 'shalom'),
        'PASSWORD': os.environ.get('PGPASSWORD', ''),
        'HOST': os.environ.get('PGHOST', '127.0.0.1'),
        'PORT': os.environ.get('PGPORT', '5432'),
        # Cloud Run reaches Cloud SQL through a Unix socket under /cloudsql/ whose connector already
        # encrypts with mutual TLS; libpq never negotiates TLS on sockets, so verify-full is for TCP.
        'OPTIONS': {} if DEVELOPMENT or os.environ.get('PGHOST', '').startswith('/') else {'sslmode': 'verify-full'},
        'CONN_MAX_AGE': 0 if DEVELOPMENT else 60,
        'CONN_HEALTH_CHECKS': not DEVELOPMENT,
    }}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.Argon2PasswordHasher']
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'EXCEPTION_HANDLER': 'core.errors.exception_handler',
}
# Firebase Hosting strips every cookie except __session before reaching Cloud Run, so the session
# uses that name and the CSRF token lives inside it (the frontend reads it from auth/csrf/).
SESSION_COOKIE_NAME = '__session'
CSRF_USE_SESSIONS = True
SESSION_COOKIE_SECURE = not DEVELOPMENT
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 12 * 3600
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_COOKIE_SECURE = not DEVELOPMENT
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_SSL_REDIRECT = not DEVELOPMENT
# Cloud Run terminates TLS and its front end sets X-Forwarded-Proto; without this every request looks like http.
SECURE_PROXY_SSL_HEADER = None if DEVELOPMENT else ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000 if not DEVELOPMENT else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEVELOPMENT
SECURE_HSTS_PRELOAD = False
# Preload is hard to undo and would bind every subdomain of the church's domain; a deliberate choice.
SILENCED_SYSTEM_CHECKS = ['security.W021']
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
DATA_UPLOAD_MAX_MEMORY_SIZE = 65536
# Password login is a synthetic-data development adapter, never production auth.
LOCAL_PASSWORD_LOGIN = DEVELOPMENT
# Admin APIs need a TOTP code verified in the session; development skips it with synthetic data.
ADMIN_MFA_REQUIRED = not DEVELOPMENT
PUBLIC_APP_URL = os.environ.get('SHALOM_PUBLIC_APP_URL', 'http://localhost:5173' if DEVELOPMENT else '')
if not DEVELOPMENT and not PUBLIC_APP_URL.startswith('https://'):
    raise ImproperlyConfigured('SHALOM_PUBLIC_APP_URL debe usar https')
# Behind Firebase Hosting the browser's Origin is the public domain, not the Cloud Run host Django sees.
CSRF_TRUSTED_ORIGINS = sorted({origin_of(PUBLIC_APP_URL), *trusted_origins(os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', ''), allow_http=DEVELOPMENT)})
# Per-origin limits read the client address from the header the load balancer sets, counting
# proxies from the right; unset means REMOTE_ADDR, so a forged X-Forwarded-For is ignored.
CLIENT_IP_HEADER, TRUSTED_PROXY_COUNT = client_ip_settings(os.environ.get('SHALOM_CLIENT_IP_HEADER', ''), os.environ.get('SHALOM_TRUSTED_PROXY_COUNT', ''))
DEFAULT_FROM_EMAIL = os.environ.get('SHALOM_FROM_EMAIL', 'Shalom <no-responder@example.invalid>')
if DEVELOPMENT:
    # Messages stay in memory: emailed links carry single-use tokens and must not reach consoles or logs.
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('SHALOM_EMAIL_HOST', '')
    EMAIL_PORT = int(os.environ.get('SHALOM_EMAIL_PORT', '587'))
    EMAIL_HOST_USER = os.environ.get('SHALOM_EMAIL_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('SHALOM_EMAIL_PASSWORD', '')
    EMAIL_USE_TLS = True
    EMAIL_TIMEOUT = 10
# Fernet key for field encryption (TOTP secrets). Development uses an ephemeral key.
FIELD_ENCRYPTION_KEY = os.environ.get('SHALOM_FIELD_KEY', '')
if not FIELD_ENCRYPTION_KEY:
    if not DEVELOPMENT:
        raise ImproperlyConfigured('Se requiere SHALOM_FIELD_KEY')
    from cryptography.fernet import Fernet
    FIELD_ENCRYPTION_KEY = Fernet.generate_key().decode()
# Cloud Scheduler calls /internal/ with a Google-signed OIDC token for this service account; empty turns them off.
SCHEDULER_SERVICE_ACCOUNT = os.environ.get('SHALOM_SCHEDULER_SERVICE_ACCOUNT', '')
SCHEDULER_AUDIENCE = os.environ.get('SHALOM_SCHEDULER_AUDIENCE', '')
if SCHEDULER_SERVICE_ACCOUNT and not SCHEDULER_AUDIENCE.startswith('https://'):
    raise ImproperlyConfigured('SHALOM_SCHEDULER_AUDIENCE debe ser la URL https del servicio')
if not DEVELOPMENT:
    # One JSON object per line for Cloud Logging, with an allow-list of fields (config/logs.py).
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {'json': {'()': 'config.logs.JsonFormatter'}},
        'handlers': {
            'stdout': {'class': 'logging.StreamHandler', 'stream': 'ext://sys.stdout', 'formatter': 'json'},
            'discard': {'class': 'logging.NullHandler'},
        },
        'root': {'handlers': ['stdout'], 'level': 'INFO'},
        'loggers': {
            'django': {'handlers': ['stdout'], 'level': 'INFO', 'propagate': False},
            # Scanners hit the run.app URL with random Host headers; Cloud Run already logs the 400.
            'django.security.DisallowedHost': {'handlers': ['discard'], 'propagate': False},
        },
    }
# Google OpenID Connect stays off until the church provides the Google Cloud project and credentials.
GOOGLE_OIDC_ENABLED = False
