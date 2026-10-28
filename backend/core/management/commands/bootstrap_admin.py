from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.models import User, Role, RoleGrant, AuditEvent


class Command(BaseCommand):
    help = 'Asigna Administración a la primera cuenta. Solo funciona mientras no exista ninguna.'
    def add_arguments(self, parser):
        parser.add_argument('username')
    def handle(self, *args, username, **options):
        with transaction.atomic():
            if RoleGrant.objects.select_for_update().filter(role=Role.ADMINISTRACION, revoked_at__isnull=True).exists():
                raise CommandError('Ya existe Administración; asigna perfiles desde la app.')
            user = User.objects.filter(username=username, is_active=True).first()
            if user is None:
                raise CommandError('No existe una cuenta activa con ese nombre.')
            # The only self-confirmed grant; every later privileged grant needs a second person.
            grant = RoleGrant.objects.create(user=user, role=Role.ADMINISTRACION, granted_by=user, confirmed_by=user)
            AuditEvent.objects.create(actor=user, action='role.bootstrap', target_id=grant.id)
        self.stdout.write('Administración asignada. Invita a una segunda persona de administración.')
