import json
import logging
from datetime import timedelta
from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from .crypto import seal, unseal
from .email_layout import Email, render
from .models import OutboundEmail

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
# Waits of 5, 10, 20 and 40 minutes, matching the five-minute Cloud Scheduler cadence.
RETRY_STEP = timedelta(minutes=5)
# Upper bound for a sealed body; retries normally end within the first hour and a half.
RETRY_WINDOW = timedelta(hours=24)
# A message being attempted is hidden from other runs this long, so two runs never send it twice;
# if the instance dies mid-attempt, the next run after this picks it up.
CLAIM = timedelta(minutes=2)

# Draft wording (docs/legal/textos-cuentas-borrador.md, text 6), unchanged inside the design; pending legal review.
INVITATION = Email(
    subject='Tu invitación a Shalom', theme='shalom', eyebrow='INVITACIÓN · SHALOM', title='¡Hola!',
    intro='Te invitamos a formar parte de Shalom App, nuestro espacio digital para la comunidad de la iglesia. Con tu cuenta podrás acceder a las funciones disponibles para ti.',
    blocks=(('Para comenzar', 'Utiliza el enlace de este correo. El enlace es de un solo uso y vence en 7 días.'),
            ('Es tu decisión', 'Crear tu cuenta es voluntario. Antes de activarla, podrás consultar nuestro Aviso de Privacidad y decidir si otorgas tu consentimiento.')),
    cta='Comenzar', cta_url='link', show_url=True,
    note='Si no solicitaste esta invitación, puedes ignorar el mensaje.',
    closing='¡Bendiciones!\nEquipo de Shalom',
    reason='Recibes este correo porque administración de Shalom envió una invitación a esta dirección.',
)


def send_after_commit(kind, recipient, template, retry=False, reference=None, **values):
    """Try one message as soon as the surrounding transaction commits.

    Without retry, a failure is final and no body is stored. With retry, the body is kept sealed
    and the queue (drain) tries again until MAX_ATTEMPTS or RETRY_WINDOW.
    """
    subject, text, html = render(template, **values)
    now = timezone.now()
    body = json.dumps({'text': text, 'html': html})
    pending = {'sealed_body': seal(body), 'retry_until': now + RETRY_WINDOW, 'next_attempt_at': now + CLAIM} if retry else {}
    record = OutboundEmail.objects.create(kind=kind, recipient=recipient, subject=subject, reference=reference, **pending)
    transaction.on_commit(lambda: attempt(record, text, html))
    return record


def unpack(sealed):
    """Text and HTML of a sealed body; bodies queued before the HTML design hold only text."""
    body = unseal(sealed)
    try:
        parts = json.loads(body)
    except ValueError:
        return body, None
    return (parts['text'], parts['html']) if isinstance(parts, dict) else (body, None)


def open_records():
    return OutboundEmail.objects.filter(sent_at__isnull=True, failed=False)


def close(record, **outcome):
    open_records().filter(pk=record.pk).update(attempts=record.attempts, sealed_body='', next_attempt_at=None, **outcome)


def attempt(record, text, html=None):
    record.attempts += 1
    try:
        # multipart/alternative: the text part first, the design's HTML as the preferred part.
        send_mail(record.subject, text, settings.DEFAULT_FROM_EMAIL, [record.recipient], html_message=html)
    except Exception:
        logger.warning('email delivery failed', extra={'email_id': str(record.pk), 'kind': record.kind, 'attempt': record.attempts})
        if record.sealed_body and record.attempts < MAX_ATTEMPTS:
            wait = RETRY_STEP * 2 ** (record.attempts - 1)
            open_records().filter(pk=record.pk).update(attempts=record.attempts, next_attempt_at=timezone.now() + wait)
        else:
            close(record, failed=True)
        return False
    close(record, sent_at=timezone.now())
    return True


def expire():
    """Give up on messages past their window and erase their bodies."""
    return open_records().filter(retry_until__lte=timezone.now()).update(failed=True, sealed_body='', next_attempt_at=None)


def cancel(reference):
    return open_records().filter(reference=reference).update(failed=True, sealed_body='', next_attempt_at=None)


def drain(limit=50):
    """Retry due messages; safe to run from several instances at once."""
    expired = expire()
    now = timezone.now()
    with transaction.atomic():
        due = list(open_records().select_for_update(skip_locked=True)
                   .filter(next_attempt_at__lte=now).exclude(sealed_body='').order_by('next_attempt_at')[:limit])
        OutboundEmail.objects.filter(pk__in=[record.pk for record in due]).update(next_attempt_at=now + CLAIM)
    sent = 0
    for record in due:
        try:
            text, html = unpack(record.sealed_body)
        except InvalidToken:
            # Sealed with a key that is no longer configured: it can never be sent.
            close(record, failed=True)
            continue
        sent += attempt(record, text, html)
    return {'due': len(due), 'sent': sent, 'expired': expired}


LOGIN_LINK = Email(
    subject='Tu enlace para entrar a Shalom', theme='shalom', eyebrow='ACCESO · SHALOM', title='Tu enlace para entrar.',
    intro='¡Hola! Usa el botón para entrar a Shalom.',
    blocks=(('Es de un solo uso', 'Vence en 15 minutos.'),),
    cta='Entrar a Shalom', cta_url='link', show_url=True,
    note='Si no lo pediste, puedes ignorar este mensaje: nadie puede entrar sin abrirlo.',
    closing='Equipo de Shalom',
    reason='Recibes este correo porque se pidió un enlace de acceso para esta dirección.',
)


REACTIVATED = Email(
    subject='Tu acceso a Shalom está activo de nuevo', theme='shalom', eyebrow='ACCESO · SHALOM', title='¡Qué gusto tenerte de vuelta!',
    intro='¡Hola, {name}! Administración de Shalom reactivó tu cuenta. Ya puedes entrar con este mismo correo.',
    blocks=(('Cómo entrar', 'Abre Shalom y pide tu enlace de acceso con este correo. Es de un solo uso y vence en 15 minutos.'),
            ('Tus perfiles', 'Administración te asigna los perfiles de las actividades en las que participas. Algunos necesitan la confirmación de una segunda persona y la verificación en dos pasos.')),
    cta='Abrir Shalom', cta_url='app',
    note='Si no esperabas este correo, avisa a administración de Shalom.',
    closing='¡Bendiciones!\nEquipo de Shalom',
    reason='Recibes este correo porque administración de Shalom reactivó la cuenta de esta dirección.',
)
