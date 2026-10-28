from cryptography.fernet import Fernet
from django.conf import settings


def seal(text):
    return Fernet(settings.FIELD_ENCRYPTION_KEY).encrypt(text.encode()).decode()


def unseal(token):
    return Fernet(settings.FIELD_ENCRYPTION_KEY).decrypt(token.encode()).decode()
