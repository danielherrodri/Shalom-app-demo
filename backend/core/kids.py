"""Coordinación Kids: configuration, class roster, day leads, swaps, teachers, lessons, events and the teacher's agenda.

Only adults' data: accounts, groups as age ranges, services, lessons and event tasks. No child appears
here. Every permission is decided on the server for each request and record.
"""
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from .admin_api import Strict, address_of, audit, display_name, effective_grants
from .email_layout import Email, app_url
from .emails import send_after_commit
from .models import AuditEvent, DayLead, EventItem, Group, KidsEvent, Lesson, Role, RosterEntry, Service, Swap, User

# Profiles that work in Kids; Joven is never part of the team.
TEAM_ROLES = {Role.DOCENTE, Role.VOLUNTARIO, Role.PREPARACION, Role.COORDINACION_KIDS}
MAX_RANGE = timedelta(days=120)
AGENDA_DAYS = 56
REMINDER_DAYS = 2
DENIED = 'No tienes permiso para esta acción.'


def has_role(user, roles):
    return effective_grants().filter(user=user, role__in=roles).exists()


def mfa_ok(request):
    return not settings.ADMIN_MFA_REQUIRED or bool(request.session.get('mfa_verified_at'))


def is_coordinator(request):
    # Coordinación Kids is privileged: confirmed by a second administrator and used with the second factor.
    return request.user.is_authenticated and mfa_ok(request) and has_role(request.user, {Role.COORDINACION_KIDS})


class IsCoordinator(BasePermission):
    message = DENIED
    def has_permission(self, request, view):
        return is_coordinator(request)


class IsTeam(BasePermission):
    message = DENIED
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if has_role(request.user, {Role.COORDINACION_KIDS}) and not mfa_ok(request):
            return False
        return has_role(request.user, TEAM_ROLES)


class ReadTeamWriteCoordinator(BasePermission):
    message = DENIED
    def has_permission(self, request, view):
        if request.method in {'GET', 'HEAD', 'OPTIONS'}:
            return IsTeam().has_permission(request, view)
        return is_coordinator(request)


def team_members():
    return User.objects.filter(is_active=True, role_grants__in=effective_grants().filter(role__in=TEAM_ROLES)).distinct()


def teachers():
    return User.objects.filter(is_active=True, role_grants__in=effective_grants().filter(role=Role.DOCENTE)).distinct()


def today():
    return timezone.localdate()


def date_range(request):
    """from/to query parameters, defaulting to the next eight weeks and never wider than MAX_RANGE."""
    field = serializers.DateField()
    try:
        start = field.run_validation(request.query_params.get('from') or today().isoformat())
        end = field.run_validation(request.query_params.get('to') or (start + timedelta(days=AGENDA_DAYS)).isoformat())
    except ValidationError:
        raise ValidationError({'detail': 'Fechas no válidas.'})
    if end < start or end - start > MAX_RANGE:
        raise ValidationError({'detail': 'El periodo debe durar como máximo 120 días.'})
    return start, end


# ---------- Configuración ----------

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'min_age', 'max_age', 'teachers_per_class', 'active']
        extra_kwargs = {'min_age': {'min_value': 0, 'max_value': 17}, 'max_age': {'min_value': 0, 'max_value': 17},
                        'teachers_per_class': {'min_value': 1, 'max_value': 6}}
    def validate(self, data):
        low = data.get('min_age', getattr(self.instance, 'min_age', None))
        high = data.get('max_age', getattr(self.instance, 'max_age', None))
        if low is not None and high is not None and low > high:
            raise ValidationError({'detail': 'La edad mínima no puede ser mayor que la máxima.'})
        return data


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'weekday', 'starts_at', 'ends_at', 'active']
        extra_kwargs = {'weekday': {'min_value': 0, 'max_value': 6}}
    def validate(self, data):
        start = data.get('starts_at', getattr(self.instance, 'starts_at', None))
        end = data.get('ends_at', getattr(self.instance, 'ends_at', None))
        if start and end and start >= end:
            raise ValidationError({'detail': 'El servicio debe terminar después de empezar.'})
        return data


class StrictModelMixin:
    """Rejects unknown fields, like Strict does for plain serializers."""
    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - {name for name, field in self.fields.items() if not field.read_only}:
            raise ValidationError({'detail': 'Campos no permitidos.'})
        return super().to_internal_value(data)


class GroupInput(StrictModelMixin, GroupSerializer):
    pass


class ServiceInput(StrictModelMixin, ServiceSerializer):
    pass


class AuditedList(generics.ListCreateAPIView):
    """List for the team, create for coordination, with an audit entry per change."""
    permission_classes = [ReadTeamWriteCoordinator]
    action = ''
    def perform_create(self, serializer):
        with transaction.atomic():
            audit(self.request.user, f'kids.{self.action}.create', serializer.save())


class AuditedDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [ReadTeamWriteCoordinator]
    http_method_names = ['get', 'patch', 'head', 'options']
    action = ''
    def perform_update(self, serializer):
        with transaction.atomic():
            audit(self.request.user, f'kids.{self.action}.update', serializer.save())


class GroupList(AuditedList):
    serializer_class = GroupInput
    action = 'group'
    def get_queryset(self):
        return Group.objects.order_by('-active', 'min_age', 'name', 'id')


class GroupDetail(AuditedDetail):
    serializer_class = GroupInput
    action = 'group'
    queryset = Group.objects.all()


class ServiceList(AuditedList):
    serializer_class = ServiceInput
    action = 'service'
    def get_queryset(self):
        return Service.objects.order_by('-active', 'weekday', 'starts_at', 'id')


class ServiceDetail(AuditedDetail):
    serializer_class = ServiceInput
    action = 'service'
    queryset = Service.objects.all()


# ---------- Rol de clases ----------

class RosterInput(Strict):
    date = serializers.DateField()
    service = serializers.UUIDField()
    group = serializers.UUIDField()
    teacher = serializers.UUIDField()


class RosterChange(Strict):
    date = serializers.DateField(required=False)
    service = serializers.UUIDField(required=False)
    group = serializers.UUIDField(required=False)
    teacher = serializers.UUIDField(required=False)


def roster_row(entry):
    return {'id': str(entry.id), 'date': entry.date.isoformat(), 'service': str(entry.service_id), 'group': str(entry.group_id),
            'teacher': str(entry.teacher_id), 'teacherName': display_name(entry.teacher), 'reminded': entry.reminded_at is not None}


def check_entry(entry):
    """Validates one roster entry inside a transaction that already locked its teacher and group."""
    service = Service.objects.filter(pk=entry.service_id, active=True).first()
    if service is None or not Group.objects.filter(pk=entry.group_id, active=True).exists():
        raise ValidationError({'detail': 'El grupo o el servicio no existe o está inactivo.'})
    if not teachers().filter(pk=entry.teacher_id).exists():
        raise ValidationError({'detail': 'La persona no tiene el perfil Docente.'})
    if entry.date < today():
        raise ValidationError({'detail': 'No se puede programar una fecha pasada.'})
    if entry.date.weekday() != service.weekday:
        raise ValidationError({'detail': 'Ese servicio no se celebra ese día de la semana.'})
    same_day = RosterEntry.objects.filter(teacher_id=entry.teacher_id, date=entry.date).exclude(pk=entry.pk).select_related('service')
    if any(other.service_id == entry.service_id and other.group_id == entry.group_id for other in same_day):
        raise ValidationError({'detail': 'Esa persona ya está en esa clase.'})
    if any(other.service.starts_at < service.ends_at and service.starts_at < other.service.ends_at for other in same_day):
        raise ValidationError({'detail': 'Esa persona ya tiene una clase en ese horario.'})
    seats = Group.objects.get(pk=entry.group_id).teachers_per_class
    if RosterEntry.objects.filter(date=entry.date, service_id=entry.service_id, group_id=entry.group_id).exclude(pk=entry.pk).count() >= seats:
        raise ValidationError({'detail': f'Esa clase ya tiene {seats} {"docente" if seats == 1 else "docentes"}.'})


def lock(entry):
    # Serializes concurrent edits for the same teacher and group so the checks above stay true.
    User.objects.select_for_update().filter(pk=entry.teacher_id).exists()
    Group.objects.select_for_update().filter(pk=entry.group_id).exists()


class RosterList(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def get(self, request):
        start, end = date_range(request)
        entries = RosterEntry.objects.filter(date__range=(start, end)).select_related('teacher__profile').order_by('date', 'service__starts_at', 'group__name', 'id')
        return Response({'results': [roster_row(e) for e in entries]})
    def post(self, request):
        data = RosterInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        entry = RosterEntry(date=values['date'], service_id=values['service'], group_id=values['group'], teacher_id=values['teacher'], created_by=request.user)
        with transaction.atomic():
            lock(entry)
            check_entry(entry)
            entry.save()
            audit(request.user, 'kids.roster.create', entry)
        return Response(roster_row(entry), status=201)


class RosterDetail(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def patch(self, request, pk):
        data = RosterChange(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            entry = get_object_or_404(RosterEntry.objects.select_for_update(), pk=pk)
            before = (entry.date, entry.teacher_id)
            for field, value in data.validated_data.items():
                setattr(entry, field if field == 'date' else f'{field}_id', value)
            lock(entry)
            check_entry(entry)
            if (entry.date, entry.teacher_id) != before:
                entry.reminded_at = None
            entry.save()
            audit(request.user, 'kids.roster.update', entry)
        return Response(roster_row(entry))
    def delete(self, request, pk):
        with transaction.atomic():
            entry = get_object_or_404(RosterEntry.objects.select_for_update(), pk=pk)
            audit(request.user, 'kids.roster.delete', entry)
            entry.delete()
        return Response(status=204)


# ---------- Encargado(a) del día ----------

class LeadInput(Strict):
    date = serializers.DateField()
    group = serializers.UUIDField()
    lead = serializers.UUIDField()


class LeadChange(Strict):
    lead = serializers.UUIDField()


def lead_row(lead):
    return {'id': str(lead.id), 'date': lead.date.isoformat(), 'group': str(lead.group_id), 'lead': str(lead.lead_id),
            'leadName': display_name(lead.lead), 'reminded': lead.reminded_at is not None}


def check_lead(lead):
    if not Group.objects.filter(pk=lead.group_id, active=True).exists():
        raise ValidationError({'detail': 'El grupo no existe o está inactivo.'})
    if not teachers().filter(pk=lead.lead_id).exists():
        raise ValidationError({'detail': 'La persona no tiene el perfil Docente.'})
    if lead.date < today():
        raise ValidationError({'detail': 'No se puede programar una fecha pasada.'})
    if not Service.objects.filter(active=True, weekday=lead.date.weekday()).exists():
        raise ValidationError({'detail': 'No hay servicios ese día.'})


class LeadList(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def get(self, request):
        start, end = date_range(request)
        leads = DayLead.objects.filter(date__range=(start, end)).select_related('lead__profile').order_by('date', 'group__min_age', 'id')
        return Response({'results': [lead_row(l) for l in leads]})
    def post(self, request):
        data = LeadInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        lead = DayLead(date=values['date'], group_id=values['group'], lead_id=values['lead'], created_by=request.user)
        with transaction.atomic():
            Group.objects.select_for_update().filter(pk=lead.group_id).exists()
            check_lead(lead)
            if DayLead.objects.filter(date=lead.date, group_id=lead.group_id).exists():
                raise ValidationError({'detail': 'Ese grupo ya tiene encargado(a) ese día.'})
            lead.save()
            audit(request.user, 'kids.lead.create', lead)
        return Response(lead_row(lead), status=201)


class LeadDetail(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def patch(self, request, pk):
        data = LeadChange(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            lead = get_object_or_404(DayLead.objects.select_for_update(), pk=pk)
            if lead.lead_id != data.validated_data['lead']:
                lead.lead_id = data.validated_data['lead']
                lead.reminded_at = None
            check_lead(lead)
            lead.save()
            audit(request.user, 'kids.lead.update', lead)
        return Response(lead_row(lead))
    def delete(self, request, pk):
        with transaction.atomic():
            lead = get_object_or_404(DayLead.objects.select_for_update(), pk=pk)
            audit(request.user, 'kids.lead.delete', lead)
            lead.delete()
        return Response(status=204)


# ---------- Permutas ----------

class SwapInput(Strict):
    entry = serializers.UUIDField()
    to_teacher = serializers.UUIDField()
    return_entry = serializers.UUIDField(required=False, allow_null=True)


def class_summary(entry):
    return {'id': str(entry.id), 'date': entry.date.isoformat(), 'service': entry.service.name,
            'starts_at': entry.service.starts_at.strftime('%H:%M'), 'group': entry.group.name}


def swap_row(swap):
    return {'id': str(swap.id), 'status': swap.status, 'entry': class_summary(swap.entry),
            'returnEntry': class_summary(swap.return_entry) if swap.return_entry_id else None,
            'from': str(swap.from_teacher_id), 'fromName': display_name(swap.from_teacher),
            'to': str(swap.to_teacher_id), 'toName': display_name(swap.to_teacher),
            'createdAt': swap.created_at.isoformat()}


SWAP_RELATED = ('entry__service', 'entry__group', 'return_entry__service', 'return_entry__group', 'from_teacher__profile', 'to_teacher__profile')


def apply_swap(swap):
    """Hands each class to the other teacher with every roster rule checked again under lock."""
    entry = RosterEntry.objects.select_for_update().get(pk=swap.entry_id)
    back = RosterEntry.objects.select_for_update().get(pk=swap.return_entry_id) if swap.return_entry_id else None
    if entry.teacher_id != swap.from_teacher_id or (back and back.teacher_id != swap.to_teacher_id):
        raise ValidationError({'detail': 'El rol cambió desde que se registró la permuta.'})
    for target, teacher_id in [(entry, swap.to_teacher_id)] + ([(back, swap.from_teacher_id)] if back else []):
        target.teacher_id = teacher_id
        target.reminded_at = None
        lock(target)
        check_entry(target)
        target.save(update_fields=['teacher', 'reminded_at'])


def check_swap(swap):
    if swap.to_teacher_id == swap.from_teacher_id:
        raise ValidationError({'detail': 'Elige a otra persona para cubrir la clase.'})
    if not teachers().filter(pk=swap.to_teacher_id).exists():
        raise ValidationError({'detail': 'La persona que cubre no tiene el perfil Docente.'})
    if swap.return_entry_id == swap.entry_id:
        raise ValidationError({'detail': 'La clase que se devuelve debe ser otra.'})
    if swap.return_entry_id and not RosterEntry.objects.filter(pk=swap.return_entry_id, teacher_id=swap.to_teacher_id).exists():
        raise ValidationError({'detail': 'La clase que se devuelve debe ser de quien cubre.'})
    if Swap.objects.filter(entry_id=swap.entry_id, status=Swap.Status.PENDIENTE).exists():
        raise ValidationError({'detail': 'Ya hay una permuta por confirmar para esa clase.'})


def may_swap(request):
    return is_coordinator(request) or has_role(request.user, {Role.DOCENTE})


class SwapList(generics.GenericAPIView):
    """Coordination sees every swap; a teacher only the ones that give or take one of their classes."""
    permission_classes = [IsTeam]
    def get(self, request):
        start, end = date_range(request)
        swaps = Swap.objects.filter(entry__date__range=(start, end)).select_related(*SWAP_RELATED).order_by('entry__date', 'entry__service__starts_at', 'created_at')
        if not is_coordinator(request):
            swaps = swaps.filter(Q(from_teacher=request.user) | Q(to_teacher=request.user))
        if request.query_params.get('status') in Swap.Status.values:
            swaps = swaps.filter(status=request.query_params['status'])
        return Response({'results': [swap_row(s) for s in swaps]})
    def post(self, request):
        if not may_swap(request):
            return Response({'detail': DENIED}, status=403)
        data = SwapInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        coordinator = is_coordinator(request)
        with transaction.atomic():
            entry = RosterEntry.objects.select_for_update().filter(pk=values['entry']).first()
            # A teacher only hands over their own classes; other people's classes are not disclosed.
            if entry is None or (not coordinator and entry.teacher_id != request.user.id):
                return Response({'detail': 'No encontrado.'}, status=404)
            swap = Swap(entry=entry, return_entry_id=values.get('return_entry'), from_teacher_id=entry.teacher_id,
                        to_teacher_id=values['to_teacher'], created_by=request.user)
            check_swap(swap)
            # Dry run: the same checks as the confirmation, rolled back, so problems show up now.
            with transaction.atomic():
                apply_swap(swap)
                if not coordinator:
                    transaction.set_rollback(True)
            if coordinator:
                swap.status, swap.decided_by, swap.decided_at = Swap.Status.CONFIRMADA, request.user, timezone.now()
            swap.save()
            audit(request.user, f'kids.swap.{"confirmada" if coordinator else "create"}', swap)
            swap = Swap.objects.select_related(*SWAP_RELATED).get(pk=swap.pk)
            notify_swap(swap)
        return Response(swap_row(swap), status=201)


class SwapDecision(generics.GenericAPIView):
    permission_classes = [IsTeam]
    target = ''
    def post(self, request, pk):
        coordinator = is_coordinator(request)
        with transaction.atomic():
            swap = get_object_or_404(Swap.objects.select_for_update(of=('self',)).select_related(*SWAP_RELATED), pk=pk)
            if self.target == Swap.Status.CANCELADA:
                # Either teacher can withdraw before coordination decides; nobody else learns it exists.
                if not coordinator and request.user.id not in (swap.from_teacher_id, swap.to_teacher_id):
                    return Response({'detail': 'No encontrado.'}, status=404)
            elif not coordinator:
                return Response({'detail': DENIED}, status=403)
            if swap.status != Swap.Status.PENDIENTE:
                raise ValidationError({'detail': 'La permuta ya no está por confirmar.'})
            if self.target == Swap.Status.CONFIRMADA:
                apply_swap(swap)
            swap.status, swap.decided_by, swap.decided_at = self.target, request.user, timezone.now()
            swap.save(update_fields=['status', 'decided_by', 'decided_at'])
            audit(request.user, f'kids.swap.{self.target}', swap)
            notify_swap(swap)
        return Response(swap_row(swap))


class SwapConfirm(SwapDecision):
    target = Swap.Status.CONFIRMADA


class SwapReject(SwapDecision):
    target = Swap.Status.RECHAZADA


class SwapCancel(SwapDecision):
    target = Swap.Status.CANCELADA


class SwapOptions(generics.GenericAPIView):
    """Who can cover a class and, for an exchange, that person's upcoming classes. Names and classes only."""
    permission_classes = [IsTeam]
    def get(self, request):
        if not may_swap(request):
            return Response({'detail': DENIED}, status=403)
        people = teachers().select_related('profile')
        result = {'teachers': sorted(({'id': str(t.id), 'displayName': display_name(t)} for t in people if t.id != request.user.id),
                                     key=lambda t: t['displayName'].casefold())}
        teacher = request.query_params.get('teacher')
        if teacher:
            try:
                teacher = serializers.UUIDField().run_validation(teacher)
            except ValidationError:
                raise ValidationError({'detail': 'Docente no válido.'})
            if not people.filter(pk=teacher).exists():
                raise ValidationError({'detail': 'La persona no tiene el perfil Docente.'})
            start = today()
            classes = RosterEntry.objects.filter(teacher_id=teacher, date__range=(start, start + timedelta(days=AGENDA_DAYS))).select_related('service', 'group').order_by('date', 'service__starts_at')
            result['classes'] = [class_summary(c) for c in classes]
        return Response(result)


# ---------- Maestros y equipo ----------

class TeamList(generics.GenericAPIView):
    """Kids team with their Kids profiles and upcoming classes. No phone numbers or emails in lists."""
    permission_classes = [IsCoordinator]
    def get(self, request):
        members = team_members().select_related('profile').order_by('username')
        grants = {}
        for user_id, role in effective_grants().filter(role__in=TEAM_ROLES, user__in=members).values_list('user_id', 'role'):
            grants.setdefault(user_id, []).append(role)
        upcoming = {}
        for entry in RosterEntry.objects.filter(date__gte=today()).order_by('date').values('teacher_id', 'date', 'group__name'):
            row = upcoming.setdefault(entry['teacher_id'], {'count': 0, 'next': None, 'groups': set()})
            row['count'] += 1
            row['next'] = row['next'] or entry['date'].isoformat()
            row['groups'].add(entry['group__name'])
        rows = []
        for user in members:
            row = upcoming.get(user.id, {'count': 0, 'next': None, 'groups': set()})
            rows.append({'id': str(user.id), 'displayName': display_name(user), 'roles': sorted(grants.get(user.id, [])),
                         'upcoming': row['count'], 'next': row['next'], 'groups': sorted(row['groups'])})
        return Response({'results': sorted(rows, key=lambda r: r['displayName'].casefold())})


# ---------- Lecciones ----------

class LessonInput(StrictModelMixin, serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'date', 'group', 'unit', 'title', 'manual_page', 'objective', 'materials']
        extra_kwargs = {'manual_page': {'min_value': 1, 'max_value': 2000}}
    def validate_group(self, group):
        if not group.active:
            raise ValidationError('El grupo está inactivo.')
        return group


class LessonList(AuditedList):
    serializer_class = LessonInput
    action = 'lesson'
    def get_queryset(self):
        start, end = date_range(self.request)
        return Lesson.objects.filter(date__range=(start, end)).order_by('date', 'group__min_age', 'group__name', 'id')


class LessonDetail(AuditedDetail):
    serializer_class = LessonInput
    action = 'lesson'
    queryset = Lesson.objects.all()
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    def delete(self, request, pk):
        if not is_coordinator(request):
            return Response({'detail': DENIED}, status=403)
        with transaction.atomic():
            lesson = get_object_or_404(Lesson.objects.select_for_update(), pk=pk)
            audit(request.user, 'kids.lesson.delete', lesson)
            lesson.delete()
        return Response(status=204)


# ---------- Eventos Kids ----------

class EventInput(StrictModelMixin, serializers.ModelSerializer):
    class Meta:
        model = KidsEvent
        fields = ['id', 'title', 'date', 'description', 'active']


class ItemInput(Strict):
    kind = serializers.ChoiceField(choices=EventItem.Kind.choices)
    title = serializers.CharField(max_length=120)
    assignee = serializers.UUIDField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    quantity = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=100000)
    def validate(self, data):
        if data['kind'] == EventItem.Kind.TAREA:
            data['quantity'] = None
        elif not data.get('quantity'):
            raise ValidationError({'detail': 'Indica la cantidad del material.'})
        return data


class ItemChange(Strict):
    title = serializers.CharField(max_length=120, required=False)
    assignee = serializers.UUIDField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    quantity = serializers.IntegerField(required=False, min_value=1, max_value=100000)
    received = serializers.IntegerField(required=False, min_value=0, max_value=100000)


def item_row(item):
    return {'id': str(item.id), 'event': str(item.event_id), 'kind': item.kind, 'title': item.title,
            'assignee': str(item.assignee_id) if item.assignee_id else None,
            'assigneeName': display_name(item.assignee) if item.assignee_id else None,
            'due_date': item.due_date.isoformat() if item.due_date else None, 'quantity': item.quantity,
            'received': item.received, 'status': item.status}


def event_row(event):
    return {'id': str(event.id), 'title': event.title, 'date': event.date.isoformat(), 'description': event.description,
            'active': event.active, 'items': [item_row(i) for i in event.items.all()]}


def eligible_assignee(user_id):
    if user_id is not None and not team_members().filter(pk=user_id).exists():
        raise ValidationError({'detail': 'Solo se asigna a personas del equipo Kids.'})
    return user_id


class EventList(generics.ListCreateAPIView):
    permission_classes = [IsCoordinator]
    serializer_class = EventInput
    def get_queryset(self):
        return KidsEvent.objects.prefetch_related('items__assignee__profile').order_by('-active', 'date', 'id')
    def list(self, request, *args, **kwargs):
        return Response({'results': [event_row(e) for e in self.get_queryset()]})
    def perform_create(self, serializer):
        with transaction.atomic():
            audit(self.request.user, 'kids.event.create', serializer.save())


class EventDetail(AuditedDetail):
    permission_classes = [IsCoordinator]
    serializer_class = EventInput
    action = 'event'
    queryset = KidsEvent.objects.all()


class ItemCreate(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def post(self, request, pk):
        data = ItemInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        with transaction.atomic():
            event = get_object_or_404(KidsEvent, pk=pk, active=True)
            item = EventItem.objects.create(event=event, kind=values['kind'], title=values['title'], assignee_id=eligible_assignee(values.get('assignee')),
                                            due_date=values.get('due_date'), quantity=values.get('quantity'))
            audit(request.user, 'kids.item.create', item)
        return Response(item_row(item), status=201)


class ItemDetail(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def patch(self, request, pk):
        data = ItemChange(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        with transaction.atomic():
            item = get_object_or_404(EventItem.objects.select_for_update(), pk=pk)
            if 'assignee' in values and values['assignee'] != item.assignee_id:
                item.assignee_id = eligible_assignee(values.pop('assignee'))
                # A new person has to accept it again.
                item.status = EventItem.Status.PENDIENTE
            values.pop('assignee', None)
            if item.kind == EventItem.Kind.TAREA and ({'quantity', 'received'} & set(values)):
                raise ValidationError({'detail': 'Las tareas no llevan cantidades.'})
            for field, value in values.items():
                setattr(item, field, value)
            if item.quantity is not None and item.received > item.quantity:
                raise ValidationError({'detail': 'Lo recibido no puede superar lo requerido.'})
            item.save()
            audit(request.user, 'kids.item.update', item)
        return Response(item_row(item))
    def delete(self, request, pk):
        with transaction.atomic():
            item = get_object_or_404(EventItem.objects.select_for_update(), pk=pk)
            audit(request.user, 'kids.item.delete', item)
            item.delete()
        return Response(status=204)


class ItemProgress(generics.GenericAPIView):
    """The assignee accepts and then completes their own item; coordination can also mark it."""
    permission_classes = [IsTeam]
    target = ''
    allowed_from = ()
    def post(self, request, pk):
        with transaction.atomic():
            item = get_object_or_404(EventItem.objects.select_for_update().select_related('event'), pk=pk, event__active=True)
            if item.assignee_id != request.user.id and not is_coordinator(request):
                # Same answer as a missing item: other people's assignments are not disclosed.
                return Response({'detail': 'No encontrado.'}, status=404)
            if item.status not in self.allowed_from:
                raise ValidationError({'detail': 'La tarea no está en un estado que permita este cambio.'})
            item.status = self.target
            item.save(update_fields=['status'])
            audit(request.user, f'kids.item.{self.target}', item)
        return Response(item_row(item))


class ItemAccept(ItemProgress):
    target = EventItem.Status.ACEPTADA
    allowed_from = (EventItem.Status.PENDIENTE,)


class ItemComplete(ItemProgress):
    target = EventItem.Status.COMPLETADA
    allowed_from = (EventItem.Status.ACEPTADA,)


# ---------- Mi agenda docente ----------

class Agenda(generics.GenericAPIView):
    """The signed-in person's own classes, with each class's lesson, and their own event items."""
    permission_classes = [IsTeam]
    def get(self, request):
        start = today()
        end = start + timedelta(days=AGENDA_DAYS)
        entries = list(RosterEntry.objects.filter(teacher=request.user, date__range=(start, end)).select_related('service', 'group').order_by('date', 'service__starts_at'))
        lessons = {(l.group_id, l.date): l for l in Lesson.objects.filter(date__range=(start, end), group__in={e.group_id for e in entries})}
        leads = {(l.group_id, l.date): l for l in DayLead.objects.filter(date__range=(start, end)).select_related('group', 'lead__profile')}
        pending = set(Swap.objects.filter(entry__in=entries, status=Swap.Status.PENDIENTE).values_list('entry_id', flat=True))
        classes = []
        for entry in entries:
            lesson = lessons.get((entry.group_id, entry.date))
            lead = leads.get((entry.group_id, entry.date))
            classes.append({
                'id': str(entry.id), 'date': entry.date.isoformat(), 'service': entry.service.name,
                'starts_at': entry.service.starts_at.strftime('%H:%M'), 'ends_at': entry.service.ends_at.strftime('%H:%M'),
                'group': entry.group.name, 'min_age': entry.group.min_age, 'max_age': entry.group.max_age,
                'lesson': {'unit': lesson.unit, 'title': lesson.title, 'manual_page': lesson.manual_page,
                           'objective': lesson.objective, 'materials': lesson.materials} if lesson else None,
                'lead': display_name(lead.lead) if lead else None, 'swapPending': entry.id in pending,
            })
        own_leads = [{'id': str(l.id), 'date': l.date.isoformat(), 'group': l.group.name}
                     for l in sorted(leads.values(), key=lambda l: (l.date, l.group.name)) if l.lead_id == request.user.id]
        items = EventItem.objects.filter(assignee=request.user, event__active=True).exclude(status=EventItem.Status.COMPLETADA).select_related('event').order_by('due_date', 'event__date')
        return Response({'classes': classes, 'leads': own_leads, 'items': [{**item_row(i), 'eventTitle': i.event.title, 'eventDate': i.event.date.isoformat()} for i in items]})


# ---------- Bitácora ----------

class AuditLog(generics.GenericAPIView):
    permission_classes = [IsCoordinator]
    def get(self, request):
        events = AuditEvent.objects.filter(action__startswith='kids.').select_related('actor__profile').order_by('-created_at')[:200]
        return Response({'results': [{'id': str(e.id), 'action': e.action, 'actorName': display_name(e.actor), 'target': str(e.target_id),
                                      'created_at': e.created_at.isoformat()} for e in events]})


# ---------- Recordatorio dos días antes ----------

REMINDER = Email(
    subject='Recordatorio: tienes clase en Shalom Kids', theme='kids', eyebrow='TU AGENDA · SHALOM KIDS', title='Nos preparamos para acompañar.',
    intro='¡Hola, {name}! Te recordamos tus próximos turnos en Shalom Kids.',
    blocks=(('Tus turnos', '{classes}'),
            ('Si no puedes asistir', 'Registra una permuta en «Mi agenda» o avisa a coordinación lo antes posible.')),
    cta='Abrir Mi agenda', cta_url='app',
    closing='¡Gracias por servir!\nEquipo de Shalom Kids',
    reason='Recibes este recordatorio porque tienes turnos asignados en el rol de Shalom Kids.',
)

SWAP_CONFIRMED = Email(
    subject='Cambio confirmado en tu rol de Shalom Kids', theme='kids', eyebrow='PERMUTA · SHALOM KIDS', title='Tu rol cambió.',
    intro='¡Hola, {name}! Coordinación confirmó la permuta con {other}.',
    blocks=(('Tus cambios', '{changes}'),
            ('Recordatorio', 'Recibirás el recordatorio de siempre 2 días antes de cada clase.')),
    cta='Abrir Mi agenda', cta_url='app',
    closing='¡Gracias por servir!\nEquipo de Shalom Kids',
    reason='Recibes este aviso porque participas en una permuta del rol de Shalom Kids.',
)

SWAP_REJECTED = Email(
    subject='Tu permuta no se confirmó', theme='kids', eyebrow='PERMUTA · SHALOM KIDS', title='Tu clase sigue igual.',
    intro='¡Hola, {name}! Coordinación no confirmó la permuta con {other}, así que la clase sigue a tu nombre.',
    blocks=(('Clase', '{changes}'),),
    cta='Abrir Mi agenda', cta_url='app',
    note='Si no puedes darla, habla con coordinación lo antes posible.',
    closing='Equipo de Shalom Kids',
    reason='Recibes este aviso porque registraste una permuta en el rol de Shalom Kids.',
)


def class_line(entry):
    return f'{entry.date.strftime("%d/%m/%Y")} · {entry.service.name} ({entry.service.starts_at.strftime("%H:%M")}) · {entry.group.name}'


def notify_swap(swap):
    """After a decision, tells each teacher what changed for them. Sent once the transaction commits."""
    given, back = class_line(swap.entry), class_line(swap.return_entry) if swap.return_entry_id else None
    if swap.status == Swap.Status.CONFIRMADA:
        notices = [(swap.from_teacher, swap.to_teacher, [f'• Ya no das: {given}'] + ([f'• Das a cambio: {back}'] if back else [])),
                   (swap.to_teacher, swap.from_teacher, [f'• Das: {given}'] + ([f'• Ya no das: {back}'] if back else []))]
        template = SWAP_CONFIRMED
    elif swap.status == Swap.Status.RECHAZADA:
        notices, template = [(swap.from_teacher, swap.to_teacher, [f'• {given}'])], SWAP_REJECTED
    else:
        return
    for person, other, changes in notices:
        address = address_of(person.id)
        if address:
            send_after_commit(f'swap_{swap.status}', address, template, retry=True, name=display_name(person),
                              other=display_name(other), changes='\n'.join(changes), app=app_url('/'))


def send_reminders():
    """Queue one email per teacher for classes and days in charge up to REMINDER_DAYS ahead with no reminder yet."""
    start = today()
    window = (start, start + timedelta(days=REMINDER_DAYS))
    with transaction.atomic():
        entries = list(RosterEntry.objects.select_for_update(skip_locked=True, of=('self',))
                       .filter(date__range=window, reminded_at__isnull=True, teacher__in=teachers())
                       .select_related('service', 'group', 'teacher__profile').order_by('date', 'service__starts_at'))
        leads = list(DayLead.objects.select_for_update(skip_locked=True, of=('self',))
                     .filter(date__range=window, reminded_at__isnull=True, lead__in=teachers())
                     .select_related('group', 'lead__profile').order_by('date', 'group__name'))
        by_teacher = {}
        for entry in entries:
            by_teacher.setdefault(entry.teacher_id, ([], []))[0].append(entry)
        for lead in leads:
            by_teacher.setdefault(lead.lead_id, ([], []))[1].append(lead)
        sent = skipped = 0
        for teacher_id, (own_entries, own_leads) in by_teacher.items():
            address = address_of(teacher_id)
            if not address:
                skipped += len(own_entries) + len(own_leads)
                continue
            lines = [f'• {e.date.strftime("%d/%m/%Y")} · {e.service.name} ({e.service.starts_at.strftime("%H:%M")}) · {e.group.name}' for e in own_entries]
            lines += [f'• {l.date.strftime("%d/%m/%Y")} · Encargado(a) del día · {l.group.name}' for l in own_leads]
            person = (own_entries[0].teacher if own_entries else own_leads[0].lead)
            send_after_commit('class_reminder', address, REMINDER, retry=True, name=display_name(person), classes='\n'.join(lines), app=app_url('/'))
            now = timezone.now()
            RosterEntry.objects.filter(pk__in=[e.pk for e in own_entries]).update(reminded_at=now)
            DayLead.objects.filter(pk__in=[l.pk for l in own_leads]).update(reminded_at=now)
            sent += len(own_entries) + len(own_leads)
    return {'reminded': sent, 'without_email': skipped}
