from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from core.models import ConsentKind, ConsentText


class Command(BaseCommand):
    help = 'Publica una versión nueva de un texto de consentimiento. Las versiones publicadas no se modifican.'
    def add_arguments(self, parser):
        parser.add_argument('kind', choices=ConsentKind.values)
        parser.add_argument('version')
        parser.add_argument('path', help='Archivo UTF-8 con el texto aprobado.')
    def handle(self, *args, kind, version, path, **options):
        if not version or len(version) > 20:
            raise CommandError('La versión debe tener entre 1 y 20 caracteres.')
        try:
            with open(path, encoding='utf-8') as handle:
                body = handle.read().strip()
        except (OSError, UnicodeDecodeError):
            raise CommandError('No se pudo leer el archivo como UTF-8.')
        if not body:
            raise CommandError('El texto está vacío.')
        try:
            with transaction.atomic():
                ConsentText.objects.create(kind=kind, version=version, body=body)
        except IntegrityError:
            raise CommandError('Esa versión ya existe; publica una versión nueva.')
        self.stdout.write(f'Publicado {kind} {version}. Las personas que se registren a partir de ahora lo aceptarán.')
