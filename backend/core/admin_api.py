import hashlib
import secrets
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .emails import INVITATION, send_after_commit
from .models import User, Person, Role, PRIVILEGED_ROLES, RoleGrant, Invitation, AuditEvent

INVITATION_TTL = timedelta(days=7)
INVALID_INVITATION = 'Esta invitación ya no es válida. Pide una nueva a administración.'


def verifier(token):
    return hashlib.sha256(token.encode()).hexdigest()


def open_grants():
    return RoleGrant.objects.filter(revoked_at__isnull=True)


def effective_grants():
    return open_grants().filter(Q(confirmed_by__isnull=False) | ~Q(role__in=PRIVILEGED_ROLES))


def roles_of(user):
    return sorted(effective_grants().filter(user=user).values_list('role', flat=True))


def audit(actor, action, target):
    AuditEvent.objects.create(actor=actor, action=action, target_id=target.id)


class IsAdministrator(BasePermission):
    message = 'No tienes permiso para esta acción.'
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Second factor arrives in phase 2; until then admin APIs stay closed outside development.
        if settings.ADMIN_MFA_REQUIRED and not request.session.get('mfa_verified_at'):
            return False
        return effective_grants().filter(user=request.user, role=Role.ADMINISTRACION).exists()


class Strict(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - set(self.fields):
            raise ValidationError({'detail': 'Campos no permitidos.'})
        return super().to_internal_value(data)


def assignable(role):
    # Joven requires the tutor's recorded consent (phase 2), so it cannot be assigned yet.
    if role == Role.JOVEN:
        raise ValidationError({'detail': 'El perfil Joven requiere el consentimiento del tutor.'})
    return role


class AccountList(generics.ListAPIView):
    permission_classes = [IsAdministrator]
    def get_queryset(self):
        return User.objects.filter(is_active=True).order_by('username', 'id')
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response([{'id': str(u.id), 'username': u.username, 'roles': roles_of(u)} for u in page])


class GrantInput(Strict):
    user = serializers.UUIDField()
    role = serializers.ChoiceField(choices=Role.choices)
    def validate_role(self, value):
        return assignable(value)


class GrantSerializer(serializers.ModelSerializer):
    confirmed = serializers.SerializerMethodField()
    class Meta:
        model = RoleGrant
        fields = ['id', 'user', 'role', 'granted_by', 'confirmed', 'created_at']
    def get_confirmed(self, grant):
        return grant.role not in PRIVILEGED_ROLES or grant.confirmed_by_id is not None


class GrantList(generics.ListCreateAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = GrantSerializer
    def get_queryset(self):
        grants = open_grants().order_by('created_at', 'id')
        user = self.request.query_params.get('user')
        if user:
            grants = grants.filter(user=serializers.UUIDField().run_validation(user))
        return grants
    def create(self, request, *args, **kwargs):
        data = GrantInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=data.validated_data['user'], is_active=True)
        if user == request.user:
            raise ValidationError({'detail': 'Otra persona de administración debe asignar tus perfiles.'})
        with transaction.atomic():
            grant, created = open_grants().select_for_update().get_or_create(user=user, role=data.validated_data['role'], defaults={'granted_by': request.user})
            if created:
                audit(request.user, 'role.grant', grant)
        return Response(GrantSerializer(grant).data, status=201 if created else 200)


class GrantConfirm(generics.GenericAPIView):
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        with transaction.atomic():
            grant = get_object_or_404(open_grants().select_for_update(), pk=pk, role__in=PRIVILEGED_ROLES, confirmed_by__isnull=True)
            if request.user.id in {grant.granted_by_id, grant.user_id}:
                raise ValidationError({'detail': 'Debe confirmarlo otra persona de administración.'})
            grant.confirmed_by = request.user
            grant.save(update_fields=['confirmed_by'])
            audit(request.user, 'role.confirm', grant)
        return Response(GrantSerializer(grant).data)


class GrantRevoke(generics.GenericAPIView):
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        with transaction.atomic():
            grant = get_object_or_404(open_grants().select_for_update(), pk=pk)
            if grant.role == Role.ADMINISTRACION:
                admins = effective_grants().select_for_update().filter(role=Role.ADMINISTRACION).exclude(pk=grant.pk)
                if not admins.exists():
                    raise ValidationError({'detail': 'Debe quedar al menos una persona de administración.'})
            grant.revoked_at = timezone.now()
            grant.save(update_fields=['revoked_at'])
            audit(request.user, 'role.revoke', grant)
        return Response(status=204)


class InvitationInput(Strict):
    email = serializers.EmailField(max_length=254)
    roles = serializers.ListField(child=serializers.ChoiceField(choices=Role.choices), max_length=len(Role.choices), required=False, default=list)
    person = serializers.UUIDField(required=False)
    def validate_roles(self, value):
        return sorted({assignable(role) for role in value})


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['id', 'email', 'roles', 'person', 'expires_at']


def pending_invitations():
    return Invitation.objects.filter(used_at__isnull=True, revoked_at__isnull=True, expires_at__gt=timezone.now())


class InvitationList(generics.ListCreateAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = InvitationSerializer
    def get_queryset(self):
        return pending_invitations().order_by('expires_at', 'id')
    def create(self, request, *args, **kwargs):
        data = InvitationInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        token = secrets.token_urlsafe(32)
        with transaction.atomic():
            person = None
            if 'person' in values:
                person = get_object_or_404(Person, pk=values['person'], active=True, account__isnull=True)
            invitation = Invitation.objects.create(
                email=values['email'].lower(), person=person, roles=values['roles'], verifier=verifier(token),
                created_by=request.user, expires_at=timezone.now() + INVITATION_TTL)
            audit(request.user, 'invitation.create', invitation)
            # Fragment, not query string: the token stays out of server logs and Referer headers.
            send_after_commit('invitation', invitation.email, INVITATION, link=f'{settings.PUBLIC_APP_URL}/invitacion#{token}')
        return Response(InvitationSerializer(invitation).data, status=201)


class InvitationRevoke(generics.GenericAPIView):
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        with transaction.atomic():
            invitation = get_object_or_404(pending_invitations().select_for_update(), pk=pk)
            invitation.revoked_at = timezone.now()
            invitation.save(update_fields=['revoked_at'])
            audit(request.user, 'invitation.revoke', invitation)
        return Response(status=204)


class AcceptInput(Strict):
    token = serializers.CharField(max_length=128)


class InvitationAccept(generics.GenericAPIView):
    def post(self, request):
        data = AcceptInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = request.user
        with transaction.atomic():
            invitation = pending_invitations().select_for_update().filter(verifier=verifier(data.validated_data['token'])).first()
            # Same answer for unknown, used, revoked, expired or self-issued invitations.
            if invitation is None or invitation.created_by_id == user.id:
                raise ValidationError({'detail': INVALID_INVITATION})
            if invitation.person_id:
                person = Person.objects.select_for_update().get(pk=invitation.person_id)
                if not person.active or person.account_id not in {None, user.id} or Person.objects.filter(account=user).exclude(pk=person.pk).exists():
                    raise ValidationError({'detail': INVALID_INVITATION})
                person.account = user
                person.save(update_fields=['account'])
            for role in invitation.roles:
                grant, created = open_grants().get_or_create(user=user, role=role, defaults={'granted_by': invitation.created_by})
                if created:
                    audit(invitation.created_by, 'role.grant', grant)
            invitation.used_at = timezone.now()
            invitation.used_by = user
            invitation.save(update_fields=['used_at', 'used_by'])
            audit(user, 'invitation.accept', invitation)
        return Response({'roles': roles_of(user)})
