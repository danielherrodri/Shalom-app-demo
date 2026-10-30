"""Request limits shared by every instance: counters live in PostgreSQL, not in process memory."""
import hashlib
import ipaddress
from datetime import timedelta
from django.conf import settings
from django.db import connection
from django.utils import timezone
from .models import RateCounter

# Longest window in use; older counters can be purged.
MAX_WINDOW = timedelta(minutes=15)


def client_ip(request):
    remote = request.META.get('REMOTE_ADDR', '')
    if not settings.CLIENT_IP_HEADER:
        return remote
    hops = [hop.strip() for hop in request.META.get(settings.CLIENT_IP_HEADER, '').split(',')]
    # Each trusted proxy appends the address it saw; anything further left is what the client sent.
    if len(hops) < settings.TRUSTED_PROXY_COUNT:
        return remote
    return hops[-settings.TRUSTED_PROXY_COUNT]


def origin_key(request):
    """Hashed client origin; IPv6 groups by /64, which one person usually controls whole."""
    try:
        address = ipaddress.ip_address(client_ip(request))
    except ValueError:
        # Malformed values share one bucket, so they cannot be rotated to dodge the limit.
        bucket = 'invalid'
    else:
        if address.version == 6 and address.ipv4_mapped:
            address = address.ipv4_mapped
        bucket = str(ipaddress.ip_network(f'{address}/64', strict=False) if address.version == 6 else address)
    return hashlib.sha256(bucket.encode()).hexdigest()


def over_limit(key, limit, window):
    """Count one hit in a fixed window and say whether it exceeds the limit; atomic across instances."""
    now = timezone.now()
    table = connection.ops.quote_name(RateCounter._meta.db_table)
    with connection.cursor() as cursor:
        cursor.execute(
            f'INSERT INTO {table} (key, window_start, hits) VALUES (%s, %s, 1) '
            f'ON CONFLICT (key) DO UPDATE SET '
            f'hits = CASE WHEN {table}.window_start <= %s THEN 1 ELSE {table}.hits + 1 END, '
            f'window_start = CASE WHEN {table}.window_start <= %s THEN EXCLUDED.window_start ELSE {table}.window_start END '
            f'RETURNING hits',
            [key, now, now - window, now - window])
        return cursor.fetchone()[0] > limit


def purge_expired():
    return RateCounter.objects.filter(window_start__lt=timezone.now() - MAX_WINDOW).delete()[0]
