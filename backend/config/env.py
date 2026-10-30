"""Parsing and validation of settings that come from environment variables."""
from urllib.parse import urlsplit
from django.core.exceptions import ImproperlyConfigured


def origin_of(url):
    parts = urlsplit(url)
    return f'{parts.scheme}://{parts.netloc}'


def trusted_origins(value, allow_http=False):
    """Comma-separated origins for CSRF_TRUSTED_ORIGINS: scheme and host only, no wildcards."""
    origins = []
    for raw in filter(None, (item.strip() for item in value.split(','))):
        parts = urlsplit(raw)
        schemes = {'https', 'http'} if allow_http else {'https'}
        try:
            parts.port
        except ValueError:
            raise ImproperlyConfigured('Origen de CSRF no válido') from None
        if (parts.scheme not in schemes or not parts.hostname or '*' in raw or parts.username or parts.password
                or parts.path not in {'', '/'} or parts.query or parts.fragment):
            raise ImproperlyConfigured('Origen de CSRF no válido')
        origins.append(origin_of(raw))
    return origins


def client_ip_settings(header, proxy_count):
    """Header the load balancer fills with the client address, and how many proxies append to it."""
    try:
        count = int(proxy_count or 0)
    except ValueError:
        raise ImproperlyConfigured('SHALOM_TRUSTED_PROXY_COUNT debe ser un número') from None
    header = header.strip()
    if count < 0 or bool(header) != bool(count):
        raise ImproperlyConfigured('SHALOM_CLIENT_IP_HEADER y SHALOM_TRUSTED_PROXY_COUNT van juntos')
    if header and not header.replace('-', '').isalnum():
        raise ImproperlyConfigured('SHALOM_CLIENT_IP_HEADER no válido')
    meta = 'HTTP_' + header.upper().replace('-', '_') if header else ''
    return meta, count
