import logging
from datetime import timedelta
from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from .crypto import seal, unseal
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

# Draft wording (docs/legal/textos-cuentas-borrador.md, text 6); pending legal review.
INVITATION = ('Tu invitación a Shalom', """¡Hola!

Te invitamos a formar parte de Shalom App, nuestro espacio digital para la comunidad de la iglesia. Con tu cuenta podrás acceder a las funciones disponibles para ti.

Para comenzar, utiliza este enlace: {link}

El enlace es de un solo uso y vence en 7 días.

Crear tu cuenta es voluntario. Antes de activarla, podrás consultar nuestro Aviso de Privacidad y decidir si otorgas tu consentimiento.

Si no solicitaste esta invitación, puedes ignorar el mensaje.

¡Bendiciones!
Equipo de Shalom
""")


def send_after_commit(kind, recipient, template, retry=False, reference=None, **values):
    """Try one message as soon as the surrounding transaction commits.

    Without retry, a failure is final and no body is stored. With retry, the body is kept sealed
    and the queue (drain) tries again until MAX_ATTEMPTS or RETRY_WINDOW.
    """
    subject, body = template
    text = body.format(**values)
    now = timezone.now()
    pending = {'sealed_body': seal(text), 'retry_until': now + RETRY_WINDOW, 'next_attempt_at': now + CLAIM} if retry else {}
    record = OutboundEmail.objects.create(kind=kind, recipient=recipient, subject=subject, reference=reference, **pending)
    transaction.on_commit(lambda: attempt(record, text))
    return record


def open_records():
    return OutboundEmail.objects.filter(sent_at__isnull=True, failed=False)


def close(record, **outcome):
    open_records().filter(pk=record.pk).update(attempts=record.attempts, sealed_body='', next_attempt_at=None, **outcome)


def attempt(record, text):
    record.attempts += 1
    try:
        send_mail(record.subject, text, settings.DEFAULT_FROM_EMAIL, [record.recipient])
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
            text = unseal(record.sealed_body)
        except InvalidToken:
            # Sealed with a key that is no longer configured: it can never be sent.
            close(record, failed=True)
            continue
        sent += attempt(record, text)
    return {'due': len(due), 'sent': sent, 'expired': expired}


LOGIN_LINK = ('Tu enlace para entrar a Shalom', """¡Hola!

Usa este enlace para entrar a Shalom: {link}

Es de un solo uso y vence en 15 minutos.

Si no lo pediste, puedes ignorar este mensaje: nadie puede entrar sin abrirlo.

Equipo de Shalom
""")
