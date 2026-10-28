import logging
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from .models import OutboundEmail

logger = logging.getLogger(__name__)

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


def send_after_commit(kind, recipient, template, **values):
    """Queue one message to go out after the surrounding transaction commits.

    Only a delivery record is stored: the body may carry a single-use token.
    """
    record = OutboundEmail.objects.create(kind=kind, recipient=recipient)
    subject, body = template

    def deliver():
        try:
            send_mail(subject, body.format(**values), settings.DEFAULT_FROM_EMAIL, [recipient])
        except Exception:
            OutboundEmail.objects.filter(pk=record.pk).update(failed=True)
            logger.warning('email delivery failed', extra={'email_id': str(record.pk), 'kind': kind})
        else:
            OutboundEmail.objects.filter(pk=record.pk).update(sent_at=timezone.now())
    transaction.on_commit(deliver)
    return record
