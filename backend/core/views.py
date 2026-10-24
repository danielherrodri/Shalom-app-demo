import json
import time
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST
from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Group, Person, Meeting, Enrollment, Assignment, Attendance, AuditEvent


@require_GET
@never_cache
def csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})


@require_POST
@csrf_protect
def login_view(request):
    if not settings.LOCAL_PASSWORD_LOGIN:
        return JsonResponse({'detail': 'Acceso local deshabilitado.'}, status=403)
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict) or set(data) - {'username', 'password'}:
            raise ValueError
        username, password = data.get('username'), data.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 150 or len(password) > 1024:
            raise ValueError
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'detail': 'Solicitud no válida.'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'detail': 'No fue posible iniciar sesión.'}, status=401)
    login(request, user)
    now = time.time()
    # This first workflow is for shared Kids equipment, with the strictest policy.
    request.session.update({'started_at': now, 'active_at': now, 'idle_limit': 300, 'absolute_limit': 28800})
    return JsonResponse({'username': user.username})


@require_POST
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({'detail': 'Sesión cerrada.'})


@require_GET
@never_cache
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Inicia sesión.'}, status=401)
    return JsonResponse({'username': request.user.username, 'activeAt': request.session['active_at'], 'startedAt': request.session['started_at'], 'idleSeconds': request.session['idle_limit'], 'absoluteSeconds': request.session['absolute_limit']})


@require_POST
@csrf_protect
def continue_session(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Inicia sesión.'}, status=401)
    request.session['active_at'] = time.time()
    return JsonResponse({'detail': 'Sesión extendida.'})


def permitted_groups(user):
    return Group.objects.filter(active=True, assignment__user=user, assignment__active=True)


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'display_name']


class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = ['id', 'group', 'starts_at']


class GroupList(generics.ListAPIView):
    serializer_class = GroupSerializer
    def get_queryset(self):
        return permitted_groups(self.request.user).order_by('name', 'id')


class GroupPeople(generics.ListAPIView):
    serializer_class = PersonSerializer
    def get_queryset(self):
        group = get_object_or_404(permitted_groups(self.request.user), pk=self.kwargs['pk'])
        return Person.objects.filter(active=True, enrollment__group=group, enrollment__active=True).order_by('display_name', 'id')


class SessionList(generics.ListAPIView):
    serializer_class = MeetingSerializer
    def get_queryset(self):
        return Meeting.objects.filter(group__in=permitted_groups(self.request.user), open=True).order_by('-starts_at', 'id')


class EntrySerializer(serializers.Serializer):
    meeting = serializers.UUIDField()
    person = serializers.UUIDField()
    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - set(self.fields):
            raise ValidationError({'detail': 'Campos no permitidos.'})
        return super().to_internal_value(data)


class AttendanceCreate(generics.GenericAPIView):
    serializer_class = EntrySerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            meeting = get_object_or_404(Meeting.objects.select_for_update(), pk=data['meeting'], open=True, group__in=permitted_groups(request.user))
            # Recheck current assignment inside the write transaction.
            get_object_or_404(Assignment.objects.select_for_update(), user=request.user, group=meeting.group, active=True)
            get_object_or_404(Enrollment.objects.select_for_update(), person_id=data['person'], person__active=True, group=meeting.group, active=True)
            entry, created = Attendance.objects.get_or_create(meeting=meeting, person_id=data['person'], defaults={'actor': request.user})
            if created:
                AuditEvent.objects.create(actor=request.user, action='attendance.enter', target_id=entry.id)
        return Response({'id': str(entry.id), 'created': created}, status=201 if created else 200)
