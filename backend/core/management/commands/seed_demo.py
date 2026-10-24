import getpass
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from core.models import User, Family, Person, Group, Assignment, Enrollment, Meeting


class Command(BaseCommand):
    help = 'Crea únicamente ejemplos sintéticos; solicita contraseña sin mostrarla.'
    def handle(self, *args, **options):
        if not settings.DEVELOPMENT:
            raise CommandError('Semilla deshabilitada fuera de desarrollo/pruebas.')
        if User.objects.filter(username='operador-demo').exists():
            raise CommandError('El operador ficticio ya existe. No se cambia su contraseña.')
        password = getpass.getpass('Contraseña local para operador-demo (mínimo 12 caracteres): ')
        try:
            validate_password(password)
        except Exception as exc:
            raise CommandError('La contraseña no cumple los requisitos.') from exc
        with transaction.atomic():
            user = User.objects.create_user(username='operador-demo', password=password)
            family = Family.objects.create(label='Familia de ejemplo ficticia')
            group = Group.objects.create(name='Kids · grupo ficticio')
            Assignment.objects.create(user=user, group=group)
            person = Person.objects.create(display_name='Integrante de ejemplo', family=family)
            Enrollment.objects.create(person=person, group=group)
            Meeting.objects.create(group=group, starts_at=timezone.now())
        self.stdout.write('Ejemplos creados; usuario operador-demo. Nunca introducir datos reales.')
