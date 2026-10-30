from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.models import User, Role, RoleGrant, AuditEvent


class Command(BaseCommand):
    help = ('Asigna Administración a la primera cuenta, o confirma la segunda cuando solo queda una. '
            'Funciona únicamente mientras haya menos de dos personas de administración confirmadas.')
    def add_arguments(self, parser):
        parser.add_argument('username')
    def handle(self, *args, username, **options):
        with transaction.atomic():
            admins = RoleGrant.objects.select_for_update().filter(role=Role.ADMINISTRACION, revoked_at__isnull=True)
            confirmed = admins.filter(confirmed_by__isnull=False)
            if confirmed.count() >= 2:
                raise CommandError('Ya hay dos personas de administración; las confirmaciones se hacen desde la app.')
            user = User.objects.filter(username=username, is_active=True).first()
            if user is None:
                raise CommandError('No existe una cuenta activa con ese nombre.')
            if not confirmed.exists():
                # The only self-confirmed grant; every later privileged grant needs a second person.
                grant = RoleGrant.objects.create(user=user, role=Role.ADMINISTRACION, granted_by=user, confirmed_by=user)
                done = 'Administración asignada. Asígnale Administración a una segunda persona en la app y confirma con este comando.'
            else:
                # One administrator cannot confirm the profile they granted, so whoever runs this on the server is the
                # second person. The grant itself must already come from the app, made by that administrator.
                grant = admins.filter(user=user, confirmed_by__isnull=True).first()
                if grant is None:
                    raise CommandError('Esa cuenta no tiene Administración por confirmar. Asígnasela desde la app y vuelve a ejecutar el comando.')
                grant.confirmed_by = user
                grant.save(update_fields=['confirmed_by'])
                done = 'Segunda persona de administración confirmada. Las demás confirmaciones se hacen desde la app.'
            AuditEvent.objects.create(actor=user, action='role.bootstrap', target_id=grant.id)
        self.stdout.write(done)
