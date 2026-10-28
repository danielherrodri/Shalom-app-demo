import time
from django.contrib.auth import logout
from django.http import JsonResponse


class SessionDeadlineMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            now = time.time()
            started = request.session.get('started_at', 0)
            touched = request.session.get('active_at', 0)
            idle = request.session.get('idle_limit', 300)
            absolute = request.session.get('absolute_limit', 8 * 3600)
            # "Cerrar sesión en todos los dispositivos" bumps the account's version; older sessions end here.
            revoked = request.session.get('session_version') != request.user.session_version
            if revoked or now - started >= absolute or now - touched >= idle:
                logout(request)
                return JsonResponse({'detail': 'La sesión venció. Inicia sesión de nuevo.'}, status=401)
            # Background polling must not keep the session alive.
        response = self.get_response(request)
        if request.user.is_authenticated and request.method not in {'GET', 'HEAD', 'OPTIONS'} and response.status_code < 400:
            request.session['active_at'] = time.time()
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store'
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
        return response
