import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)


class Identified(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Meta:
        abstract = True


class Family(Identified):
    label = models.CharField(max_length=100)


class Person(Identified):
    display_name = models.CharField(max_length=120)
    family = models.ForeignKey(Family, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    # Linked only through an admin invitation, never by matching email.
    account = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL)


class Group(Identified):
    name = models.CharField(max_length=80)
    active = models.BooleanField(default=True)


class Assignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'group'], name='unique_group_assignment')]


class Enrollment(models.Model):
    person = models.ForeignKey(Person, on_delete=models.PROTECT)
    group = models.ForeignKey(Group, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['group', 'person'], name='unique_group_enrollment')]


class Meeting(Identified):
    group = models.ForeignKey(Group, on_delete=models.PROTECT)
    starts_at = models.DateTimeField()
    open = models.BooleanField(default=True)
    class Meta:
        indexes = [models.Index(fields=['group', 'starts_at'], name='meeting_group_date')]


class Attendance(Identified):
    meeting = models.ForeignKey(Meeting, on_delete=models.PROTECT)
    person = models.ForeignKey(Person, on_delete=models.PROTECT)
    entered_at = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['meeting', 'person'], name='one_entry_per_meeting')]
        indexes = [models.Index(fields=['person', 'entered_at'], name='attendance_person_date')]


class AuditEvent(Identified):
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    action = models.CharField(max_length=60)
    target_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)


class Role(models.TextChoices):
    JOVEN = 'joven', 'Joven'
    FAMILIA = 'familia', 'Familia / tutor'
    VOLUNTARIO = 'voluntario', 'Voluntario'
    CAJA = 'caja', 'Caja'
    PREPARACION = 'preparacion', 'Preparación'
    DOCENTE = 'docente', 'Docente'
    COORDINACION_KIDS = 'coordinacion_kids', 'Coordinación Kids'
    ADMINISTRACION = 'administracion', 'Administración'
    FINANZAS = 'finanzas', 'Finanzas'


# These need a second administrator's confirmation before they take effect.
PRIVILEGED_ROLES = {Role.COORDINACION_KIDS, Role.ADMINISTRACION, Role.FINANZAS}


class RoleGrant(Identified):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='role_grants')
    role = models.CharField(max_length=30, choices=Role.choices)
    granted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    confirmed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.PROTECT, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'role'], condition=models.Q(revoked_at__isnull=True), name='one_open_grant_per_role')]


class Invitation(Identified):
    email = models.EmailField()
    person = models.ForeignKey(Person, null=True, blank=True, on_delete=models.PROTECT)
    roles = models.JSONField(default=list)
    # SHA-256 of the emailed token; the token itself is never stored.
    verifier = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.PROTECT, related_name='+')
    revoked_at = models.DateTimeField(null=True, blank=True)


class OutboundEmail(Identified):
    # Delivery record only: no body, so emailed tokens are never persisted.
    kind = models.CharField(max_length=30)
    recipient = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    failed = models.BooleanField(default=False)
