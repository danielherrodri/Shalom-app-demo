import hashlib
import secrets
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .email_layout import app_url
from .emails import INVITATION, REACTIVATED, cancel, send_after_commit
from .models import (User, Person, Role, PRIVILEGED_ROLES, RoleGrant, Invitation, AuditEvent, RosterEntry, DayLead, Swap,
                     Assignment, EmailIdentity, TotpDevice)

INVITATION_TTL = timedelta(days=7)
INVALID_INVITATION = 'Esta invitación ya no es válida. Pide una nueva a administración.'
OTHER_ADDRESS = 'Esta invitación se envió a otro correo. Cierra sesión y entra con el correo en el que la recibiste.'


def verifier(token):
    return hashlib.sha256(token.encode()).hexdigest()


def open_grants():
    return RoleGrant.objects.filter(revoked_at__isnull=True)


def effective_grants():
    return open_grants().filter(Q(confirmed_by__isnull=False) | ~Q(role__in=PRIVILEGED_ROLES))


def roles_of(user):
    return sorted(effective_grants().filter(user=user).values_list('role', flat=True))


def display_name(user):
    profile = getattr(user, 'profile', None)
    return profile.display_name if profile else user.username


def audit(actor, action, target):
    AuditEvent.objects.create(actor=actor, action=action, target_id=target.id)


def address_of(user_id):
    """Verified address of an account, or None. Only notices about the account's own access and classes use it."""
    return EmailIdentity.objects.filter(user_id=user_id).order_by('-verified_at').values_list('email', flat=True).first()


def upcoming_classes(user):
    today = timezone.localdate()
    return RosterEntry.objects.filter(teacher=user, date__gte=today).count() + DayLead.objects.filter(lead=user, date__gte=today).count()


class IsAdministrator(BasePermission):
    message = 'No tienes permiso para esta acción.'
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Admin APIs need a second factor verified in this session (development skips it with synthetic data).
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


class RolesInput(Strict):
    roles = serializers.ListField(child=serializers.ChoiceField(choices=Role.choices), max_length=len(Role.choices), required=False, default=list)
    def validate_roles(self, value):
        return sorted({assignable(role) for role in value})


def former_roles(user):
    """Profiles the last deactivation revoked: it closed them at the very instant it recorded."""
    if user.deactivated_at is None:
        return []
    return sorted(RoleGrant.objects.filter(user=user, revoked_at=user.deactivated_at).exclude(role=Role.JOVEN).values_list('role', flat=True))


class AccountList(generics.ListAPIView):
    """Active accounts, or with ?status=inactive the deactivated ones with what reactivating them needs to know."""
    permission_classes = [IsAdministrator]
    def inactive(self):
        return self.request.query_params.get('status') == 'inactive'
    def get_queryset(self):
        if self.inactive():
            return (User.objects.filter(is_active=False).select_related('profile', 'deactivated_by__profile')
                    .order_by(F('deactivated_at').desc(nulls_last=True), 'username', 'id'))
        return User.objects.filter(is_active=True).select_related('profile').order_by('username', 'id')
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        rows = []
        for u in page:
            row = {'id': str(u.id), 'username': u.username, 'displayName': display_name(u), 'roles': roles_of(u)}
            if self.inactive():
                row.update({'deactivatedAt': u.deactivated_at.isoformat() if u.deactivated_at else None,
                            'deactivatedBy': display_name(u.deactivated_by) if u.deactivated_by_id else '',
                            'formerRoles': former_roles(u), 'upcomingClasses': upcoming_classes(u)})
            rows.append(row)
        return self.get_paginated_response(rows)


class AccountDeactivate(generics.GenericAPIView):
    """Someone stops serving: every profile, group and second factor ends, sessions close and the account can no longer sign in.

    Nothing comes back on reactivation, so each access is granted again on purpose.
    """
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        with transaction.atomic():
            user = get_object_or_404(User.objects.select_for_update(), pk=pk, is_active=True)
            # The caller stays as an administrator, so there is always one left.
            if user == request.user:
                raise ValidationError({'detail': 'Otra persona de administración debe hacerlo.'})
            was_admin = effective_grants().filter(user=user, role=Role.ADMINISTRACION).exists()
            now = timezone.now()
            for grant in open_grants().select_for_update().filter(user=user):
                grant.revoked_at = now
                grant.save(update_fields=['revoked_at'])
                audit(request.user, 'role.revoke', grant)
            # Attendance groups come from assignments, not profiles: without this a reactivated account would see them again.
            Assignment.objects.filter(user=user, active=True).update(active=False)
            # A new device is enrolled if a privileged profile is granted again.
            TotpDevice.objects.filter(user=user).delete()
            # Invitations they sent would still grant profiles in their name; those sent to them, on reactivation.
            addresses = EmailIdentity.objects.filter(user=user).values('email')
            for invitation in pending_invitations().select_for_update().filter(Q(created_by=user) | Q(email__in=addresses)):
                invitation.revoked_at = now
                invitation.save(update_fields=['revoked_at'])
                cancel(invitation.pk)
                audit(request.user, 'invitation.revoke', invitation)
            for swap in Swap.objects.select_for_update().filter(Q(from_teacher=user) | Q(to_teacher=user), status=Swap.Status.PENDIENTE):
                swap.status, swap.decided_by, swap.decided_at = Swap.Status.CANCELADA, request.user, now
                swap.save(update_fields=['status', 'decided_by', 'decided_at'])
                audit(request.user, 'kids.swap.cancelada', swap)
            User.objects.filter(pk=user.pk).update(is_active=False, deactivated_at=now, deactivated_by=request.user, session_version=F('session_version') + 1)
            audit(request.user, 'account.deactivate', user)
            # Classes stay in the roster so coordination sees the gap; the caller is told how many.
            upcoming = upcoming_classes(user)
            # With one administrator left nobody can confirm privileged profiles until bootstrap_admin confirms a second one.
            last_admin = was_admin and effective_grants().filter(role=Role.ADMINISTRACION).count() < 2
        return Response({'upcomingClasses': upcoming, 'oneAdministratorLeft': last_admin})


class AccountReactivate(generics.GenericAPIView):
    """Undoes a deactivation. Nothing comes back by itself: the caller chooses the profiles, usually the former ones.

    They are granted by the caller, so privileged ones wait for another administrator's confirmation. Attendance
    groups and the second factor stay off. The person is told by email that they can sign in again.
    """
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        data = RolesInput(data=request.data)
        data.is_valid(raise_exception=True)
        roles = data.validated_data['roles']
        with transaction.atomic():
            user = get_object_or_404(User.objects.select_for_update(), pk=pk, is_active=False)
            User.objects.filter(pk=user.pk).update(is_active=True, deactivated_at=None, deactivated_by=None, session_version=F('session_version') + 1)
            audit(request.user, 'account.reactivate', user)
            for role in roles:
                grant, created = open_grants().select_for_update().get_or_create(user=user, role=role, defaults={'granted_by': request.user})
                if created:
                    audit(request.user, 'role.grant', grant)
            address = address_of(user.id)
            if address:
                send_after_commit('account_reactivated', address, REACTIVATED, retry=True, name=display_name(user), app=app_url('/'))
            active = roles_of(user)
            upcoming = upcoming_classes(user)
        return Response({'roles': active, 'pendingRoles': [role for role in roles if role not in active],
                         'notified': address is not None, 'upcomingClasses': upcoming})


ADMIN_ACTIONS = ('account.', 'role.', 'invitation.', 'mfa.', 'session.')


class AuditLog(generics.GenericAPIView):
    """Last 200 changes to accounts, profiles and invitations. Kids and attendance have their own records."""
    permission_classes = [IsAdministrator]
    def get(self, request):
        actions = Q()
        for prefix in ADMIN_ACTIONS:
            actions |= Q(action__startswith=prefix)
        events = list(AuditEvent.objects.filter(actions).select_related('actor__profile').order_by('-created_at')[:200])
        ids = {e.target_id for e in events}
        targets = {g.id: f'{Role(g.role).label} · {display_name(g.user)}' for g in RoleGrant.objects.filter(pk__in=ids).select_related('user__profile')}
        targets.update(Invitation.objects.filter(pk__in=ids).values_list('id', 'email'))
        targets.update((u.id, display_name(u)) for u in User.objects.filter(pk__in=ids).select_related('profile'))
        return Response({'results': [{'id': str(e.id), 'action': e.action, 'actorName': display_name(e.actor), 'target': targets.get(e.target_id, ''),
                                      'created_at': e.created_at.isoformat()} for e in events]})


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


class InvitationInput(RolesInput):
    email = serializers.EmailField(max_length=254)
    person = serializers.UUIDField(required=False)


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
            # Retried from the queue: the invitee cannot ask for another one.
            send_after_commit('invitation', invitation.email, INVITATION, retry=True, reference=invitation.pk,
                              link=f'{settings.PUBLIC_APP_URL}/invitacion#{token}')
        return Response(InvitationSerializer(invitation).data, status=201)


class InvitationRevoke(generics.GenericAPIView):
    permission_classes = [IsAdministrator]
    def post(self, request, pk):
        with transaction.atomic():
            invitation = get_object_or_404(pending_invitations().select_for_update(), pk=pk)
            invitation.revoked_at = timezone.now()
            invitation.save(update_fields=['revoked_at'])
            cancel(invitation.pk)
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
            # Only the account that verified the invited address takes it: a forwarded or old link grants nothing.
            if not EmailIdentity.objects.filter(user=user, email=invitation.email).exists():
                raise ValidationError({'detail': OTHER_ADDRESS})
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
