import hmac
import json
import secrets
import time
import uuid
from datetime import date, timedelta
import pyotp
import segno
from django.conf import settings
from django.contrib.auth import login, logout
from django.db import IntegrityError, transaction
from django.db.models import F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST
from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, Throttled
from .admin_api import IsAdministrator, Strict, audit, display_name, effective_grants, roles_of, verifier
from .crypto import seal, unseal
from .emails import LOGIN_LINK, send_after_commit
from .limits import origin_key, over_limit
from .models import (User, PRIVILEGED_ROLES, EmailIdentity, AccountProfile, LoginLink, ConsentKind,
                     ConsentText, ConsentRecord, TotpDevice)

LINK_TTL = timedelta(minutes=15)
SIGNUP_TTL = 30 * 60
LINKS_PER_EMAIL = 3
LINKS_PER_ORIGIN = 10
MFA_ATTEMPTS = 5
MFA_LOCK = timedelta(minutes=15)
# Provisional personal-device policy; shared Kids equipment keeps the stricter one.
PERSONAL_IDLE, PERSONAL_ABSOLUTE = 1800, 12 * 3600
SHARED_IDLE, SHARED_ABSOLUTE = 300, 8 * 3600
INVALID_LINK = 'Este enlace ya no es válido. Pide uno nuevo.'
UNDER_18 = 'Para crear tu cuenta, tu mamá, papá o tutor debe solicitarla a administración de Shalom.'


def start_session(request, user, idle=PERSONAL_IDLE, absolute=PERSONAL_ABSOLUTE):
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    now = time.time()
    request.session.update({'started_at': now, 'active_at': now, 'idle_limit': idle, 'absolute_limit': absolute, 'session_version': user.session_version})


def needs_mfa(user):
    return effective_grants().filter(user=user, role__in=PRIVILEGED_ROLES).exists()


def read_json(request, serializer_class):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        data = None
    serializer = serializer_class(data=data)
    if not serializer.is_valid():
        return None
    return serializer.validated_data


def current_texts():
    texts = {}
    for kind in ConsentKind.values:
        text = ConsentText.objects.filter(kind=kind).order_by('-published_at').first()
        if text is None:
            return None
        texts[kind] = text
    return texts


@require_GET
@never_cache
def consent_texts(request):
    texts = current_texts()
    if texts is None:
        return JsonResponse({'detail': 'El registro todavía no está disponible.'}, status=503)
    return JsonResponse({kind: {'version': t.version, 'body': t.body} for kind, t in texts.items()})


class LinkInput(Strict):
    email = serializers.EmailField(max_length=254)


@require_POST
@csrf_protect
def request_link(request):
    data = read_json(request, LinkInput)
    if data is None:
        return JsonResponse({'detail': 'Solicitud no válida.'}, status=400)
    email = data['email'].lower()
    answer = JsonResponse({'detail': 'Si el correo es válido, te enviamos un enlace. Revisa tu bandeja.'}, status=202)
    if over_limit(f'link-origin:{origin_key(request)}', LINKS_PER_ORIGIN, LINK_TTL):
        return JsonResponse({'detail': 'Demasiados intentos. Espera unos minutos.'}, status=429)
    # Same answer whether or not the address has an account or hit its own limit.
    if LoginLink.objects.filter(email=email, created_at__gt=timezone.now() - LINK_TTL).count() >= LINKS_PER_EMAIL:
        return answer
    token = secrets.token_urlsafe(32)
    with transaction.atomic():
        LoginLink.objects.create(email=email, verifier=verifier(token), expires_at=timezone.now() + LINK_TTL)
        send_after_commit('login_link', email, LOGIN_LINK, link=f'{settings.PUBLIC_APP_URL}/entrar#{token}')
    return answer


class TokenInput(Strict):
    token = serializers.CharField(max_length=128)


@require_POST
@csrf_protect
def consume_link(request):
    data = read_json(request, TokenInput)
    if data is None:
        return JsonResponse({'detail': 'Solicitud no válida.'}, status=400)
    with transaction.atomic():
        link = LoginLink.objects.select_for_update().filter(verifier=verifier(data['token']), used_at__isnull=True, expires_at__gt=timezone.now()).first()
        if link is None:
            return JsonResponse({'detail': INVALID_LINK}, status=400)
        link.used_at = timezone.now()
        link.save(update_fields=['used_at'])
        identity = EmailIdentity.objects.select_related('user').filter(email=link.email).first()
    logout(request)
    if identity is None:
        request.session['signup'] = {'email': link.email, 'at': time.time()}
        return JsonResponse({'status': 'complete_profile'})
    if not identity.user.is_active:
        return JsonResponse({'detail': 'Tu acceso está en revisión. Contacta a administración.'}, status=403)
    start_session(request, identity.user)
    return JsonResponse({'status': 'signed_in', 'mfaRequired': needs_mfa(identity.user)})


class ProfileInput(Strict):
    display_name = serializers.CharField(max_length=120)
    birth_date = serializers.DateField()
    privacy_version = serializers.CharField(max_length=20)
    sensitive_version = serializers.CharField(max_length=20)
    accept_privacy = serializers.BooleanField()
    accept_sensitive = serializers.BooleanField()


def age_on(birth, today):
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


@require_POST
@csrf_protect
def complete_profile(request):
    signup = request.session.get('signup')
    if not signup or time.time() - signup['at'] > SIGNUP_TTL:
        return JsonResponse({'detail': INVALID_LINK}, status=400)
    data = read_json(request, ProfileInput)
    today = timezone.localdate()
    if data is None or not data['display_name'] or not date(today.year - 120, 1, 1) <= data['birth_date'] <= today:
        return JsonResponse({'detail': 'Revisa los datos del formulario.'}, status=400)
    if age_on(data['birth_date'], today) < 18:
        # Nothing is stored for minors; their tutor requests the account in person.
        del request.session['signup']
        return JsonResponse({'detail': UNDER_18}, status=403)
    if not (data['accept_privacy'] and data['accept_sensitive']):
        return JsonResponse({'detail': 'Para crear tu cuenta necesitamos ambas autorizaciones.'}, status=400)
    texts = current_texts()
    if texts is None or (data['privacy_version'], data['sensitive_version']) != (texts[ConsentKind.AVISO].version, texts[ConsentKind.DATO_SENSIBLE].version):
        return JsonResponse({'detail': 'Los textos cambiaron. Revísalos de nuevo.'}, status=409)
    try:
        with transaction.atomic():
            # The unique email settles concurrent submissions from the same link.
            user = User.objects.create_user(username=f'cuenta-{uuid.uuid4().hex[:16]}')
            now = timezone.now()
            EmailIdentity.objects.create(user=user, email=signup['email'], verified_at=now)
            AccountProfile.objects.create(user=user, display_name=data['display_name'], adult_declared_at=now)
            for text in texts.values():
                ConsentRecord.objects.create(user=user, text=text, method='casilla en la app · enlace por correo')
            audit(user, 'account.create', user)
    except IntegrityError:
        return JsonResponse({'detail': INVALID_LINK}, status=400)
    del request.session['signup']
    start_session(request, user)
    return JsonResponse({'status': 'signed_in', 'mfaRequired': False}, status=201)


class LogoutEverywhere(generics.GenericAPIView):
    def post(self, request):
        user = request.user
        User.objects.filter(pk=user.pk).update(session_version=F('session_version') + 1)
        audit(user, 'session.revoke_all', user)
        logout(request)
        return Response(status=204)


class CodeInput(Strict):
    code = serializers.RegexField(r'^\d{6}$')


def check_code(user, code):
    """Validate a TOTP code under a row lock: one use per step, lockout after repeated failures."""
    device = TotpDevice.objects.select_for_update().filter(user=user).first()
    if device is None:
        raise ValidationError({'detail': 'Primero configura la verificación en dos pasos.'})
    now = timezone.now()
    if device.locked_until and device.locked_until > now:
        raise Throttled(detail='Demasiados intentos. Espera unos minutos.')
    totp = pyotp.TOTP(unseal(device.sealed_secret))
    current = int(time.time()) // totp.interval
    for step in (current - 1, current, current + 1):
        if step > device.last_step and hmac.compare_digest(totp.at(step * totp.interval), code):
            device.last_step, device.failures, device.locked_until = step, 0, None
            device.save(update_fields=['last_step', 'failures', 'locked_until'])
            return device
    device.failures += 1
    if device.failures >= MFA_ATTEMPTS:
        device.failures, device.locked_until = 0, now + MFA_LOCK
    device.save(update_fields=['failures', 'locked_until'])
    return None


def mark_verified(request):
    # New session key when privileges rise, as with any login.
    request.session.cycle_key()
    request.session['mfa_verified_at'] = time.time()


class MfaSetup(generics.GenericAPIView):
    def post(self, request):
        user = request.user
        with transaction.atomic():
            device = TotpDevice.objects.select_for_update().filter(user=user).first()
            if device and device.confirmed_at:
                raise ValidationError({'detail': 'Ya tienes verificación en dos pasos.'})
            secret = pyotp.random_base32()
            TotpDevice.objects.update_or_create(user=user, defaults={'sealed_secret': seal(secret), 'confirmed_at': None, 'last_step': 0, 'failures': 0, 'locked_until': None})
        uri = pyotp.TOTP(secret).provisioning_uri(name=user.username, issuer_name='Shalom')
        # Shown once, to the account owner only; never logged or stored in clear. The QR is built
        # here so the key never goes to a third-party image service.
        qr = segno.make(uri, error='m').svg_data_uri(scale=6, border=4, dark='#000000', light='#ffffff')
        return Response({'secret': secret, 'uri': uri, 'qr': qr})


class MfaConfirm(generics.GenericAPIView):
    def post(self, request):
        data = CodeInput(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            if TotpDevice.objects.filter(user=request.user, confirmed_at__isnull=False).exists():
                raise ValidationError({'detail': 'Ya tienes verificación en dos pasos.'})
            device = check_code(request.user, data.validated_data['code'])
            if device is not None:
                device.confirmed_at = timezone.now()
                device.save(update_fields=['confirmed_at'])
                audit(request.user, 'mfa.enroll', request.user)
        if device is None:
            raise ValidationError({'detail': 'El código no es correcto.'})
        mark_verified(request)
        return Response({'detail': 'Verificación en dos pasos activada.'})


class MfaVerify(generics.GenericAPIView):
    def post(self, request):
        data = CodeInput(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            if not TotpDevice.objects.filter(user=request.user, confirmed_at__isnull=False).exists():
                raise ValidationError({'detail': 'Primero configura la verificación en dos pasos.'})
            device = check_code(request.user, data.validated_data['code'])
        if device is None:
            raise ValidationError({'detail': 'El código no es correcto.'})
        mark_verified(request)
        return Response({'detail': 'Verificado.'})


class MfaReset(generics.GenericAPIView):
    """In-person recovery: another administrator removes the device and closes the person's sessions."""
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            raise ValidationError({'detail': 'Otra persona de administración debe hacerlo.'})
        with transaction.atomic():
            TotpDevice.objects.filter(user=user).delete()
            User.objects.filter(pk=user.pk).update(session_version=F('session_version') + 1)
            audit(request.user, 'mfa.reset', user)
        return Response(status=204)


def account_summary(request):
    user = request.user
    return {
        'id': str(user.id),
        'displayName': display_name(user),
        'roles': roles_of(user),
        'mfaPending': needs_mfa(user) and not request.session.get('mfa_verified_at'),
        'mfaEnrolled': TotpDevice.objects.filter(user=user, confirmed_at__isnull=False).exists(),
    }


@require_GET
@never_cache
def providers(request):
    # Google OpenID Connect stays off until the church's Google Cloud project and credentials exist.
    return JsonResponse({'emailLink': True, 'google': settings.GOOGLE_OIDC_ENABLED, 'localPassword': settings.LOCAL_PASSWORD_LOGIN})
