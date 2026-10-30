"""Maintenance endpoints for Cloud Scheduler, authenticated by a Google-signed OIDC token."""
import json
import threading
import time
import urllib.request
import jwt
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from . import emails, kids, limits

GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs'
GOOGLE_ISSUERS = ('https://accounts.google.com', 'accounts.google.com')


class GoogleKeys:
    """Google's public signing keys, refreshed hourly; an unknown key id refetches at most every 5 minutes."""
    MAX_AGE = 3600
    MISS_INTERVAL = 300

    def __init__(self):
        self.keys = {}
        self.fetched = float('-inf')
        self.lock = threading.Lock()

    def fetch(self):
        with urllib.request.urlopen(GOOGLE_CERTS, timeout=5) as response:
            return {key.key_id: key.key for key in jwt.PyJWKSet.from_dict(json.load(response)).keys}

    def get(self, kid):
        age = time.monotonic() - self.fetched
        if age > self.MAX_AGE or (kid not in self.keys and age > self.MISS_INTERVAL):
            with self.lock:
                try:
                    self.keys = self.fetch()
                except (OSError, ValueError, jwt.PyJWTError):
                    pass
                # Also after a failure, so forged key ids cannot make every request call Google.
                self.fetched = time.monotonic()
        return self.keys.get(kid)


google_keys = GoogleKeys()


def from_scheduler(request):
    account = settings.SCHEDULER_SERVICE_ACCOUNT
    if not account:
        return False
    scheme, _, token = request.META.get('HTTP_AUTHORIZATION', '').partition(' ')
    if scheme.lower() != 'bearer' or not token or len(token) > 4096:
        return False
    try:
        header = jwt.get_unverified_header(token)
        key = google_keys.get(header.get('kid')) if header.get('alg') == 'RS256' else None
        if key is None:
            return False
        claims = jwt.decode(token, key, algorithms=['RS256'], audience=settings.SCHEDULER_AUDIENCE, issuer=GOOGLE_ISSUERS,
                            leeway=10, options={'require': ['exp', 'iat', 'iss', 'aud', 'email']})
    except jwt.PyJWTError:
        return False
    return claims['email'] == account and claims.get('email_verified') is True


def scheduler_task(task):
    @csrf_exempt  # No cookies or session: the bearer token is the only credential.
    @require_POST
    def view(request):
        if not from_scheduler(request):
            return JsonResponse({'detail': 'No autorizado.'}, status=403)
        return JsonResponse(task())
    return view


drain_email = scheduler_task(emails.drain)
daily = scheduler_task(lambda: {'counters': limits.purge_expired(), 'expired_email': emails.expire(), **kids.send_reminders()})
