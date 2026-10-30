import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Bumped by "cerrar sesión en todos los dispositivos"; each session keeps the value it started with.
    session_version = models.PositiveIntegerField(default=0)
    # Set by "dar de baja" to the same instant as the profiles it revoked, so reactivation can offer them again.
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='+')


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
    # Kids configuration: an age range, never a list of children.
    min_age = models.PositiveSmallIntegerField(null=True, blank=True)
    max_age = models.PositiveSmallIntegerField(null=True, blank=True)
    teachers_per_class = models.PositiveSmallIntegerField(default=2)


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
    # Delivery record. Login links keep no body at all. Retryable messages (invitations) keep theirs
    # sealed with the field key only while pending: it is erased on delivery, on giving up or at retry_until.
    kind = models.CharField(max_length=30)
    recipient = models.EmailField()
    subject = models.CharField(max_length=200, blank=True)
    sealed_body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    failed = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    retry_until = models.DateTimeField(null=True, blank=True)
    # Record the message delivers (an invitation); revoking it cancels pending retries.
    reference = models.UUIDField(null=True, blank=True)
    class Meta:
        indexes = [
            models.Index(fields=['next_attempt_at'], name='outbound_email_due'),
            models.Index(fields=['reference'], name='outbound_email_reference'),
        ]


class EmailIdentity(Identified):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='email_identities')
    email = models.EmailField(unique=True)
    verified_at = models.DateTimeField()


class AccountProfile(models.Model):
    user = models.OneToOneField(User, primary_key=True, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=120)
    # Minimization: adults keep only the declaration, never the birth date.
    adult_declared_at = models.DateTimeField()
    completed_at = models.DateTimeField(auto_now_add=True)


class LoginLink(Identified):
    email = models.EmailField()
    # SHA-256 of the emailed token; the token itself is never stored.
    verifier = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        indexes = [models.Index(fields=['email', 'created_at'], name='login_link_email_date')]


class ConsentKind(models.TextChoices):
    AVISO = 'aviso', 'Aviso de privacidad'
    DATO_SENSIBLE = 'dato_sensible', 'Consentimiento de dato sensible'


class ConsentText(Identified):
    kind = models.CharField(max_length=30, choices=ConsentKind.choices)
    version = models.CharField(max_length=20)
    body = models.TextField()
    published_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['kind', 'version'], name='one_text_per_version')]


class ConsentRecord(Identified):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='consents')
    text = models.ForeignKey(ConsentText, on_delete=models.PROTECT)
    method = models.CharField(max_length=60)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)


class TotpDevice(models.Model):
    user = models.OneToOneField(User, primary_key=True, on_delete=models.CASCADE, related_name='totp')
    sealed_secret = models.TextField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    # Highest accepted time step; a code is never accepted twice.
    last_step = models.BigIntegerField(default=0)
    failures = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)


class RateCounter(models.Model):
    # Fixed-window counter keyed by scope and a hash; never stores an address in clear.
    key = models.CharField(max_length=100, primary_key=True)
    window_start = models.DateTimeField()
    hits = models.PositiveIntegerField()


# ---------- Coordinación Kids: adults only (teachers, coordinators, volunteers) ----------

class Service(Identified):
    name = models.CharField(max_length=60)
    # Python weekday: Monday is 0, Sunday is 6.
    weekday = models.PositiveSmallIntegerField(default=6)
    starts_at = models.TimeField()
    ends_at = models.TimeField()
    active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(starts_at__lt=models.F('ends_at')), name='service_ends_after_start')]


class RosterEntry(Identified):
    """One teacher giving one group's class in one service on one date."""
    date = models.DateField()
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    group = models.ForeignKey(Group, on_delete=models.PROTECT)
    teacher = models.ForeignKey(User, on_delete=models.PROTECT, related_name='roster_entries')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    # Set once the reminder email is queued; cleared when the date or the teacher changes.
    reminded_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['date', 'service', 'group', 'teacher'], name='one_roster_entry_per_class')]
        indexes = [models.Index(fields=['teacher', 'date'], name='roster_teacher_date'), models.Index(fields=['date'], name='roster_date')]


class Lesson(Identified):
    date = models.DateField()
    group = models.ForeignKey(Group, on_delete=models.PROTECT)
    unit = models.CharField(max_length=60, blank=True)
    title = models.CharField(max_length=120)
    manual_page = models.PositiveSmallIntegerField(null=True, blank=True)
    objective = models.TextField(blank=True, max_length=1000)
    materials = models.TextField(blank=True, max_length=1000)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['group', 'date'], name='one_lesson_per_group_date')]


class KidsEvent(Identified):
    title = models.CharField(max_length=120)
    date = models.DateField()
    description = models.TextField(blank=True, max_length=1000)
    active = models.BooleanField(default=True)


class EventItem(Identified):
    """A task or a material for an event. Assigning does not mean accepting: the assignee accepts."""
    class Kind(models.TextChoices):
        TAREA = 'tarea', 'Tarea'
        MATERIAL = 'material', 'Material'
    class Status(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente de aceptar'
        ACEPTADA = 'aceptada', 'Aceptada'
        COMPLETADA = 'completada', 'Completada'
    event = models.ForeignKey(KidsEvent, on_delete=models.CASCADE, related_name='items')
    kind = models.CharField(max_length=10, choices=Kind.choices)
    title = models.CharField(max_length=120)
    assignee = models.ForeignKey(User, null=True, blank=True, on_delete=models.PROTECT, related_name='event_items')
    due_date = models.DateField(null=True, blank=True)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    received = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDIENTE)


class DayLead(Identified):
    """The teacher in charge of one group for a whole day (encargado o encargada del día)."""
    date = models.DateField()
    group = models.ForeignKey(Group, on_delete=models.PROTECT)
    lead = models.ForeignKey(User, on_delete=models.PROTECT, related_name='day_leads')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    # Same rule as the roster: set once the reminder is queued, cleared when the date or the person changes.
    reminded_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['group', 'date'], name='one_lead_per_group_date')]


class Swap(Identified):
    """A teacher hands one class to another teacher (permuta). An exchange also hands back a later class.

    Nothing changes in the roster until coordination confirms it. No free-text reason is stored, so health
    or other personal details never end up here.
    """
    class Status(models.TextChoices):
        PENDIENTE = 'pendiente', 'Por confirmar'
        CONFIRMADA = 'confirmada', 'Confirmada'
        RECHAZADA = 'rechazada', 'Rechazada'
        CANCELADA = 'cancelada', 'Cancelada'
    entry = models.ForeignKey(RosterEntry, on_delete=models.CASCADE, related_name='swaps')
    # The class the covering teacher hands back in an exchange.
    return_entry = models.ForeignKey(RosterEntry, null=True, blank=True, on_delete=models.CASCADE, related_name='return_swaps')
    from_teacher = models.ForeignKey(User, on_delete=models.PROTECT, related_name='swaps_given')
    to_teacher = models.ForeignKey(User, on_delete=models.PROTECT, related_name='swaps_taken')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDIENTE)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.PROTECT, related_name='+')
    decided_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['entry'], condition=models.Q(status='pendiente'), name='one_pending_swap_per_entry')]
