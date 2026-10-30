import json
import secrets
import time
from io import StringIO
from datetime import timedelta
from django.conf import settings
from django.test import TestCase, TransactionTestCase, Client, override_settings
from django.utils import timezone
from .models import User, Family, Person, Group, Assignment, Enrollment, Meeting, Attendance, AuditEvent


class SecurityFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = secrets.token_urlsafe(24)
        cls.user = User.objects.create_user(username='operador-ficticio', password=cls.password)
        cls.family = Family.objects.create(label='Familia sintética')
        cls.group = Group.objects.create(name='Grupo sintético A')
        cls.other = Group.objects.create(name='Grupo sintético B')
        cls.person = Person.objects.create(display_name="Ejemplo D'Ávila", family=cls.family)
        cls.hidden = Person.objects.create(display_name='Persona fuera de alcance', family=cls.family)
        Assignment.objects.create(user=cls.user, group=cls.group)
        Enrollment.objects.create(person=cls.person, group=cls.group)
        Enrollment.objects.create(person=cls.hidden, group=cls.other)
        cls.meeting = Meeting.objects.create(group=cls.group, starts_at=timezone.now())
        cls.other_meeting = Meeting.objects.create(group=cls.other, starts_at=timezone.now())

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.token = self.client.get('/api/v1/auth/csrf/').json()['csrfToken']

    def post(self, url, data):
        return self.client.post(url, data, content_type='application/json', HTTP_X_CSRFTOKEN=self.token)

    def sign_in(self):
        response = self.post('/api/v1/auth/login/', {'username': self.user.username, 'password': self.password})
        self.assertEqual(response.status_code, 200)
        self.token = self.client.get('/api/v1/auth/csrf/').json()['csrfToken']

    def entry(self, **extra):
        return self.post('/api/v1/attendance/', {'meeting': str(self.meeting.id), 'person': str(self.person.id), **extra})

    def test_login_requires_csrf(self):
        self.assertEqual(self.client.post('/api/v1/auth/login/', {}, content_type='application/json').status_code, 403)

    def test_anonymous_cannot_read_groups(self):
        self.assertEqual(self.client.get('/api/v1/groups/').status_code, 403)

    def test_group_list_and_count_are_scoped(self):
        self.sign_in()
        data = self.client.get('/api/v1/groups/').json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['id'], str(self.group.id))

    def test_hidden_group_cannot_be_read_by_id(self):
        self.sign_in()
        self.assertEqual(self.client.get(f'/api/v1/groups/{self.other.id}/people/').status_code, 404)

    def test_people_do_not_expose_family_or_contacts(self):
        self.sign_in()
        data = self.client.get(f'/api/v1/groups/{self.group.id}/people/').json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(set(data['results'][0]), {'id', 'display_name'})

    def test_attendance_is_idempotent_and_audited_once(self):
        self.sign_in()
        self.assertEqual(self.entry().status_code, 201)
        self.assertEqual(self.entry().status_code, 200)
        self.assertEqual(Attendance.objects.count(), 1)
        self.assertEqual(AuditEvent.objects.count(), 1)

    def test_cannot_write_other_group_or_person(self):
        self.sign_in()
        self.assertEqual(self.entry(person=str(self.hidden.id)).status_code, 404)
        self.assertEqual(self.entry(meeting=str(self.other_meeting.id)).status_code, 404)
        self.assertEqual(Attendance.objects.count(), 0)

    def test_cannot_override_actor(self):
        self.sign_in()
        self.assertEqual(self.entry(actor=str(self.user.id)).status_code, 400)

    def test_invalid_input_and_sql_like_payload_rejected(self):
        self.sign_in()
        self.assertEqual(self.entry(person="' OR 1=1 --").status_code, 400)
        self.assertEqual(self.entry(person='<script>alert(1)</script>').status_code, 400)
        self.assertEqual(Person.objects.count(), 2)

    def test_csrf_mutation_rejected_after_login(self):
        self.sign_in()
        self.assertEqual(self.client.post('/api/v1/attendance/', {}, content_type='application/json').status_code, 403)

    def test_origin_mismatch_rejected(self):
        self.assertEqual(self.client.post('/api/v1/auth/login/', {}, content_type='application/json', HTTP_X_CSRFTOKEN=self.token, HTTP_ORIGIN='https://untrusted.invalid').status_code, 403)

    def test_revoked_assignment_blocks_write(self):
        self.sign_in()
        Assignment.objects.filter(user=self.user).update(active=False)
        self.assertEqual(self.entry().status_code, 404)

    def test_closed_meeting_blocks_write(self):
        self.sign_in()
        Meeting.objects.filter(pk=self.meeting.pk).update(open=False)
        self.assertEqual(self.entry().status_code, 404)

    def test_expired_idle_rejected_even_from_direct_client(self):
        self.sign_in()
        session = self.client.session
        session['active_at'] = time.time() - 301
        session.save()
        self.assertEqual(self.entry().status_code, 401)
        self.assertEqual(Attendance.objects.count(), 0)

    def test_absolute_timeout_not_extended_by_activity(self):
        self.sign_in()
        session = self.client.session
        session['started_at'] = time.time() - 28801
        session.save()
        self.assertEqual(self.post('/api/v1/auth/continue/', {}).status_code, 401)

    def test_polling_does_not_refresh_activity(self):
        self.sign_in()
        before = self.client.session['active_at']
        self.client.get('/api/v1/auth/me/')
        self.assertEqual(self.client.session['active_at'], before)

    def test_rejected_request_does_not_refresh_activity(self):
        self.sign_in()
        before = self.client.session['active_at']
        self.entry(person='not-a-uuid')
        self.assertEqual(self.client.session['active_at'], before)

    def test_audit_failure_rolls_back_attendance(self):
        from unittest.mock import patch
        self.sign_in()
        with patch('core.views.AuditEvent.objects.create', side_effect=RuntimeError('synthetic failure')):
            with self.assertRaises(RuntimeError):
                self.entry()
        self.assertEqual(Attendance.objects.count(), 0)

    def test_continuation_refreshes_idle_without_resetting_absolute(self):
        self.sign_in()
        before = self.client.session['started_at']
        self.assertEqual(self.post('/api/v1/auth/continue/', {}).status_code, 200)
        self.assertEqual(self.client.session['started_at'], before)

    def test_logout_revokes_session(self):
        self.sign_in()
        self.assertEqual(self.post('/api/v1/auth/logout/', {}).status_code, 200)
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 401)

    @override_settings(LOCAL_PASSWORD_LOGIN=False)
    def test_production_adapter_disabled(self):
        self.assertEqual(self.post('/api/v1/auth/login/', {'username': self.user.username, 'password': self.password}).status_code, 403)

    def test_private_response_not_cached(self):
        self.sign_in()
        response = self.client.get('/api/v1/groups/')
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.assertEqual(response['X-Frame-Options'], 'DENY')


class AdministrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from .models import Role, RoleGrant
        cls.password = secrets.token_urlsafe(24)
        cls.admin = User.objects.create_user(username='admin-ficticio', password=cls.password)
        cls.second = User.objects.create_user(username='admin-ficticio-2', password=cls.password)
        cls.member = User.objects.create_user(username='persona-ficticia', password=cls.password)
        RoleGrant.objects.create(user=cls.admin, role=Role.ADMINISTRACION, granted_by=cls.admin, confirmed_by=cls.admin)
        cls.family = Family.objects.create(label='Familia sintética')
        cls.person = Person.objects.create(display_name='Tutor de ejemplo', family=cls.family)

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

    def sign_in(self, user):
        self.client = Client(enforce_csrf_checks=True)
        token = self.client.get('/api/v1/auth/csrf/').json()['csrfToken']
        self.client.post('/api/v1/auth/login/', {'username': user.username, 'password': self.password}, content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.token = self.client.get('/api/v1/auth/csrf/').json()['csrfToken']

    def post(self, url, data=None):
        return self.client.post(url, data or {}, content_type='application/json', HTTP_X_CSRFTOKEN=self.token)

    def invite(self, **data):
        from django.core import mail
        with self.captureOnCommitCallbacks(execute=True):
            response = self.post('/api/v1/admin/invitations/', {'email': 'Invitada@Example.invalid', **data})
        token = mail.outbox[-1].body.split('/invitacion#')[1].split()[0] if response.status_code == 201 else None
        return response, token

    def grant(self, user, role):
        return self.post('/api/v1/admin/grants/', {'user': str(user.id), 'role': role})

    def test_non_admin_cannot_use_admin_api(self):
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 403)
        self.assertEqual(self.grant(self.member, 'voluntario').status_code, 403)
        self.assertEqual(self.invite()[0].status_code, 403)

    @override_settings(ADMIN_MFA_REQUIRED=True)
    def test_admin_api_closed_without_second_factor(self):
        self.sign_in(self.admin)
        self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 403)

    def test_account_list_shows_display_name_only(self):
        from .models import AccountProfile
        AccountProfile.objects.create(user=self.member, display_name='Nombre de ejemplo', adult_declared_at=timezone.now())
        self.sign_in(self.admin)
        rows = {row['username']: row for row in self.client.get('/api/v1/admin/accounts/').json()['results']}
        self.assertEqual(rows[self.member.username], {'id': str(self.member.id), 'username': self.member.username, 'displayName': 'Nombre de ejemplo', 'roles': []})

    def test_admin_cannot_grant_to_self(self):
        self.sign_in(self.admin)
        self.assertEqual(self.grant(self.admin, 'finanzas').status_code, 400)

    def test_joven_needs_tutor_consent(self):
        self.sign_in(self.admin)
        self.assertEqual(self.grant(self.member, 'joven').status_code, 400)
        self.assertEqual(self.invite(roles=['joven'])[0].status_code, 400)

    def test_grant_is_idempotent_and_audited(self):
        self.sign_in(self.admin)
        self.assertEqual(self.grant(self.member, 'docente').status_code, 201)
        self.assertEqual(self.grant(self.member, 'docente').status_code, 200)
        self.assertEqual(AuditEvent.objects.filter(action='role.grant').count(), 1)
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], ['docente'])

    def test_privileged_role_needs_second_admin(self):
        self.sign_in(self.admin)
        self.grant(self.second, 'administracion')
        grant = self.grant(self.member, 'coordinacion_kids').json()
        self.assertFalse(grant['confirmed'])
        self.assertEqual(self.post(f"/api/v1/admin/grants/{grant['id']}/confirm/").status_code, 400)
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], [])
        # The pending admin grant gives no admin access yet.
        self.sign_in(self.second)
        self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 403)

    def test_second_admin_confirms(self):
        from .models import RoleGrant
        RoleGrant.objects.create(user=self.second, role='administracion', granted_by=self.admin, confirmed_by=self.member)
        self.sign_in(self.admin)
        grant = self.grant(self.member, 'finanzas').json()
        self.sign_in(self.second)
        response = self.post(f"/api/v1/admin/grants/{grant['id']}/confirm/")
        self.assertTrue(response.json()['confirmed'])
        self.assertEqual(AuditEvent.objects.filter(action='role.confirm').count(), 1)

    def test_last_admin_cannot_be_revoked(self):
        from .models import RoleGrant
        self.sign_in(self.admin)
        grant = RoleGrant.objects.get(user=self.admin)
        self.assertEqual(self.post(f'/api/v1/admin/grants/{grant.id}/revoke/').status_code, 400)

    def test_revoked_role_disappears(self):
        self.sign_in(self.admin)
        grant = self.grant(self.member, 'caja').json()
        self.assertEqual(self.post(f"/api/v1/admin/grants/{grant['id']}/revoke/").status_code, 204)
        self.assertEqual(self.client.get(f'/api/v1/admin/grants/?user={self.member.id}').json()['count'], 0)

    def test_invitation_stores_only_verifier_and_logs_no_body(self):
        from .models import Invitation, OutboundEmail
        self.sign_in(self.admin)
        response, token = self.invite(roles=['voluntario'])
        self.assertEqual(response.status_code, 201)
        self.assertNotIn('token', response.json())
        invitation = Invitation.objects.get()
        self.assertEqual(invitation.email, 'invitada@example.invalid')
        self.assertNotEqual(invitation.verifier, token)
        self.assertNotIn(token, str(Invitation.objects.values().get()))
        self.assertIsNotNone(OutboundEmail.objects.get().sent_at)

    def test_accept_links_person_and_grants_roles_once(self):
        from .models import EmailIdentity
        EmailIdentity.objects.create(user=self.member, email='invitada@example.invalid', verified_at=timezone.now())
        self.sign_in(self.admin)
        _, token = self.invite(roles=['familia', 'voluntario'], person=str(self.person.id))
        self.sign_in(self.member)
        response = self.post('/api/v1/invitations/accept/', {'token': token})
        self.assertEqual(response.json()['roles'], ['familia', 'voluntario'])
        self.person.refresh_from_db()
        self.assertEqual(self.person.account, self.member)
        self.assertEqual(self.post('/api/v1/invitations/accept/', {'token': token}).status_code, 400)

    def test_invalid_invitations_share_one_message(self):
        from .models import Invitation
        self.sign_in(self.admin)
        _, expired = self.invite()
        Invitation.objects.update(expires_at=timezone.now())
        _, revoked = self.invite()
        self.post(f'/api/v1/admin/invitations/{Invitation.objects.latest("created_at").id}/revoke/')
        _, own = self.invite()
        own_answer = self.post('/api/v1/invitations/accept/', {'token': own}).json()
        self.sign_in(self.member)
        answers = [self.post('/api/v1/invitations/accept/', {'token': t}).json() for t in (expired, revoked, 'desconocido')]
        self.assertTrue(all(a == own_answer for a in answers))
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], [])

    def test_invitation_cannot_take_linked_person(self):
        self.person.account = self.second
        self.person.save()
        self.sign_in(self.admin)
        self.assertEqual(self.invite(person=str(self.person.id))[0].status_code, 404)

    def test_failed_delivery_is_recorded_without_breaking(self):
        from unittest.mock import patch
        from .models import OutboundEmail
        self.sign_in(self.admin)
        with patch('core.emails.send_mail', side_effect=OSError('synthetic failure')):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.post('/api/v1/admin/invitations/', {'email': 'otra@example.invalid'})
        self.assertEqual(response.status_code, 201)
        record = OutboundEmail.objects.get()
        self.assertEqual((record.failed, record.attempts), (False, 1))
        self.assertIsNotNone(record.next_attempt_at)

    def test_revoking_invitation_cancels_its_pending_email(self):
        from unittest.mock import patch
        from .emails import drain
        from .models import Invitation, OutboundEmail
        self.sign_in(self.admin)
        with patch('core.emails.send_mail', side_effect=OSError('synthetic failure')):
            with self.captureOnCommitCallbacks(execute=True):
                self.post('/api/v1/admin/invitations/', {'email': 'otra@example.invalid'})
        self.post(f'/api/v1/admin/invitations/{Invitation.objects.get().id}/revoke/')
        OutboundEmail.objects.update(next_attempt_at=timezone.now())
        record = OutboundEmail.objects.get()
        self.assertEqual((record.failed, record.sealed_body), (True, ''))
        self.assertEqual(drain()['due'], 0)

    def test_extra_fields_rejected(self):
        self.sign_in(self.admin)
        self.assertEqual(self.post('/api/v1/admin/grants/', {'user': str(self.member.id), 'role': 'caja', 'confirmed_by': str(self.admin.id)}).status_code, 400)

    def test_deactivation_ends_profiles_sessions_and_sign_in(self):
        from .models import Invitation, RoleGrant
        self.sign_in(self.admin)
        self.grant(self.member, 'docente')
        self.grant(self.second, 'administracion')
        RoleGrant.objects.filter(user=self.second).update(confirmed_by=self.admin)
        self.sign_in(self.second)
        with self.captureOnCommitCallbacks(execute=True):
            self.post('/api/v1/admin/invitations/', {'email': 'pendiente@example.invalid'})
        member = Client(enforce_csrf_checks=True)
        member.force_login(self.member)
        self.sign_in(self.admin)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/').json(), {'upcomingClasses': 0, 'oneAdministratorLeft': False})
        # Without the second administrator nobody can confirm privileged profiles, and the caller is told.
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.second.id}/deactivate/').json(), {'upcomingClasses': 0, 'oneAdministratorLeft': True})
        self.assertFalse(RoleGrant.objects.filter(user__in=[self.member, self.second], revoked_at__isnull=True).exists())
        self.assertIsNotNone(Invitation.objects.get().revoked_at)
        self.assertNotEqual(member.get('/api/v1/auth/me/').status_code, 200)
        self.sign_in(self.member)
        self.assertNotEqual(self.client.get('/api/v1/auth/me/').status_code, 200)
        self.sign_in(self.admin)
        listed = lambda query='': {row['username'] for row in self.client.get(f'/api/v1/admin/accounts/{query}').json()['results']}
        self.assertEqual(listed(), {self.admin.username})
        self.assertEqual(listed('?status=inactive'), {self.member.username, self.second.username})
        self.assertEqual(AuditEvent.objects.filter(action='account.deactivate').count(), 2)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/').status_code, 404)

    def test_nobody_deactivates_themselves_and_members_cannot_deactivate(self):
        self.sign_in(self.admin)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.admin.id}/deactivate/').status_code, 400)
        self.sign_in(self.member)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.second.id}/deactivate/').status_code, 403)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.second.id}/reactivate/').status_code, 403)
        self.assertTrue(User.objects.get(pk=self.second.pk).is_active)

    def test_reactivation_returns_access_without_profiles(self):
        self.sign_in(self.admin)
        self.grant(self.member, 'docente')
        self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/')
        response = self.post(f'/api/v1/admin/accounts/{self.member.id}/reactivate/')
        self.assertEqual(response.json(), {'roles': [], 'pendingRoles': [], 'notified': False, 'upcomingClasses': 0})
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.member.id}/reactivate/').status_code, 404)
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], [])

    def test_deactivated_accounts_show_when_who_and_former_profiles(self):
        from .models import AccountProfile
        AccountProfile.objects.create(user=self.admin, display_name='Administración de ejemplo', adult_declared_at=timezone.now())
        self.sign_in(self.admin)
        self.grant(self.member, 'voluntario')
        self.grant(self.member, 'docente')
        # A profile removed earlier is not one the deactivation took away.
        self.post(f"/api/v1/admin/grants/{self.grant(self.member, 'caja').json()['id']}/revoke/")
        self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/')
        row = self.client.get('/api/v1/admin/accounts/?status=inactive').json()['results'][0]
        self.assertEqual({k: row[k] for k in ('roles', 'formerRoles', 'deactivatedBy', 'upcomingClasses')},
                         {'roles': [], 'formerRoles': ['docente', 'voluntario'], 'deactivatedBy': 'Administración de ejemplo', 'upcomingClasses': 0})
        self.assertIsNotNone(row['deactivatedAt'])
        self.assertNotIn('formerRoles', self.client.get('/api/v1/admin/accounts/').json()['results'][0])
        # Reactivating clears the record, so a later deactivation shows only what it took.
        self.post(f'/api/v1/admin/accounts/{self.member.id}/reactivate/', {'roles': ['voluntario']})
        self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/')
        self.assertEqual(self.client.get('/api/v1/admin/accounts/?status=inactive').json()['results'][0]['formerRoles'], ['voluntario'])

    def test_reactivation_grants_chosen_profiles_and_privileged_ones_wait(self):
        from django.core import mail
        from .models import EmailIdentity, RoleGrant
        EmailIdentity.objects.create(user=self.member, email='reactivada@example.invalid', verified_at=timezone.now())
        self.sign_in(self.admin)
        self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/')
        url = f'/api/v1/admin/accounts/{self.member.id}/reactivate/'
        self.assertEqual(self.post(url, {'roles': ['joven']}).status_code, 400)
        self.assertEqual(self.post(url, {'roles': ['docente'], 'confirmed_by': str(self.admin.id)}).status_code, 400)
        self.assertFalse(User.objects.get(pk=self.member.pk).is_active)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.post(url, {'roles': ['docente', 'coordinacion_kids']})
        self.assertEqual(response.json(), {'roles': ['docente'], 'pendingRoles': ['coordinacion_kids'], 'notified': True, 'upcomingClasses': 0})
        pending = RoleGrant.objects.get(user=self.member, role='coordinacion_kids', revoked_at__isnull=True)
        self.assertEqual((pending.granted_by, pending.confirmed_by), (self.admin, None))
        self.assertEqual(AuditEvent.objects.filter(action='role.grant', actor=self.admin).count(), 2)
        message = mail.outbox[-1]
        self.assertEqual((message.to, message.subject), (['reactivada@example.invalid'], 'Tu acceso a Shalom está activo de nuevo'))
        # The notice says nothing about which profiles were granted.
        self.assertNotIn('Docente', message.body)
        self.assertNotIn('Coordinación', message.body)
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], ['docente'])

    def test_invitation_is_taken_only_by_the_invited_address(self):
        from .models import EmailIdentity
        EmailIdentity.objects.create(user=self.member, email='otra-direccion@example.invalid', verified_at=timezone.now())
        self.sign_in(self.admin)
        _, token = self.invite(roles=['voluntario'])
        self.sign_in(self.member)
        answer = self.post('/api/v1/invitations/accept/', {'token': token})
        self.assertEqual(answer.status_code, 400)
        self.assertIn('otro correo', answer.json()['detail'])
        self.assertNotIn('invitada', answer.json()['detail'])
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], [])
        # Still pending: the right account can take it.
        EmailIdentity.objects.create(user=self.second, email='invitada@example.invalid', verified_at=timezone.now())
        self.sign_in(self.second)
        self.assertEqual(self.post('/api/v1/invitations/accept/', {'token': token}).json()['roles'], ['voluntario'])

    def test_reactivated_account_gets_back_no_group_second_factor_or_invitation(self):
        from .models import Assignment, EmailIdentity, Group, Invitation, TotpDevice
        group = Group.objects.create(name='Grupo sintético')
        Assignment.objects.create(user=self.member, group=group)
        TotpDevice.objects.create(user=self.member, sealed_secret='sintético', confirmed_at=timezone.now())
        EmailIdentity.objects.create(user=self.member, email='invitada@example.invalid', verified_at=timezone.now())
        self.sign_in(self.admin)
        _, sent_to_them = self.invite(roles=['voluntario'])
        _, to_someone_else = self.invite(email='otra@example.invalid')
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/groups/').json()['count'], 1)
        self.sign_in(self.admin)
        self.post(f'/api/v1/admin/accounts/{self.member.id}/deactivate/')
        self.assertFalse(TotpDevice.objects.filter(user=self.member).exists())
        self.assertIsNotNone(Invitation.objects.get(email='invitada@example.invalid').revoked_at)
        self.assertIsNone(Invitation.objects.get(email='otra@example.invalid').revoked_at)
        self.post(f'/api/v1/admin/accounts/{self.member.id}/reactivate/')
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/groups/').json()['count'], 0)
        self.assertEqual(self.post('/api/v1/invitations/accept/', {'token': sent_to_them}).status_code, 400)
        self.assertEqual(self.client.get('/api/v1/auth/me/').json()['roles'], [])
        self.assertTrue(AuditEvent.objects.filter(action='invitation.revoke', actor=self.admin).exists())

    def test_bootstrap_gives_the_first_admin_without_another_person(self):
        from django.core.management import call_command
        from .models import RoleGrant
        RoleGrant.objects.update(revoked_at=timezone.now())
        call_command('bootstrap_admin', self.member.username, stdout=StringIO())
        grant = RoleGrant.objects.get(user=self.member, revoked_at__isnull=True)
        self.assertEqual((grant.role, grant.confirmed_by_id), ('administracion', self.member.id))

    def test_bootstrap_confirms_a_second_admin_only_while_one_is_missing(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError
        from .models import RoleGrant
        self.sign_in(self.admin)
        grant = self.grant(self.second, 'administracion').json()
        # Nobody else can confirm it in the app: the only administrator granted it.
        self.assertEqual(self.post(f"/api/v1/admin/grants/{grant['id']}/confirm/").status_code, 400)
        with self.assertRaises(CommandError):
            call_command('bootstrap_admin', self.member.username, stdout=StringIO())
        call_command('bootstrap_admin', self.second.username, stdout=StringIO())
        self.assertIsNotNone(RoleGrant.objects.get(pk=grant['id']).confirmed_by_id)
        self.assertTrue(AuditEvent.objects.filter(action='role.bootstrap', target_id=grant['id']).exists())
        self.sign_in(self.second)
        self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 200)
        # With two administrators every further confirmation happens in the app.
        self.grant(self.member, 'administracion')
        with self.assertRaises(CommandError):
            call_command('bootstrap_admin', self.member.username, stdout=StringIO())
        self.assertIsNone(RoleGrant.objects.get(user=self.member).confirmed_by_id)

    def test_admin_audit_lists_account_changes_only(self):
        self.sign_in(self.admin)
        self.grant(self.member, 'docente')
        self.invite()
        self.post(f'/api/v1/admin/accounts/{self.second.id}/deactivate/')
        AuditEvent.objects.create(actor=self.admin, action='kids.group.create', target_id=self.family.id)
        AuditEvent.objects.create(actor=self.admin, action='attendance.enter', target_id=self.person.id)
        rows = self.client.get('/api/v1/admin/audit/').json()['results']
        self.assertEqual([(r['action'], r['target']) for r in rows], [
            ('account.deactivate', self.second.username), ('invitation.create', 'invitada@example.invalid'), ('role.grant', f'Docente · {self.member.username}')])
        self.assertEqual({r['actorName'] for r in rows}, {self.admin.username})
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/admin/audit/').status_code, 403)

    def test_bootstrap_only_without_admin(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            call_command('bootstrap_admin', self.member.username)


class AccessTests(TestCase):
    """Phase 2: email links, profile completion, consents, TOTP and session revocation."""
    @classmethod
    def setUpTestData(cls):
        from .models import ConsentText, Role, RoleGrant
        cls.password = secrets.token_urlsafe(24)
        cls.admin = User.objects.create_user(username='admin-ficticio', password=cls.password)
        cls.second = User.objects.create_user(username='admin-ficticio-2', password=cls.password)
        cls.member = User.objects.create_user(username='persona-ficticia', password=cls.password)
        RoleGrant.objects.create(user=cls.admin, role=Role.ADMINISTRACION, granted_by=cls.admin, confirmed_by=cls.admin)
        RoleGrant.objects.create(user=cls.second, role=Role.ADMINISTRACION, granted_by=cls.admin, confirmed_by=cls.member)
        cls.aviso = ConsentText.objects.create(kind='aviso', version='demo-1', body='Aviso ficticio de prueba.')
        cls.sensible = ConsentText.objects.create(kind='dato_sensible', version='demo-1', body='Texto ficticio de prueba.')

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.fresh()

    def fresh(self):
        self.client = Client(enforce_csrf_checks=True)
        self.refresh_csrf()

    def refresh_csrf(self):
        self.token = self.client.get('/api/v1/auth/csrf/').json()['csrfToken']

    def post(self, url, data=None, **extra):
        return self.client.post(url, data or {}, content_type='application/json', HTTP_X_CSRFTOKEN=self.token, **extra)

    def sign_in(self, user):
        self.fresh()
        self.assertEqual(self.post('/api/v1/auth/login/', {'username': user.username, 'password': self.password}).status_code, 200)
        self.refresh_csrf()

    def ask_link(self, email='nueva@example.invalid', **extra):
        from django.core import mail
        sent = len(mail.outbox)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.post('/api/v1/auth/link/', {'email': email}, **extra)
        token = mail.outbox[-1].body.split('/entrar#')[1].split()[0] if len(mail.outbox) > sent else None
        return response, token

    def consume(self, token):
        response = self.post('/api/v1/auth/link/consume/', {'token': token})
        self.refresh_csrf()
        return response

    def profile(self, **changes):
        data = {'display_name': 'Persona de ejemplo', 'birth_date': '1990-05-01', 'privacy_version': 'demo-1',
                'sensitive_version': 'demo-1', 'accept_privacy': True, 'accept_sensitive': True, **changes}
        response = self.post('/api/v1/auth/profile/', data)
        self.refresh_csrf()
        return response

    def sign_up(self, email='nueva@example.invalid'):
        _, token = self.ask_link(email)
        self.assertEqual(self.consume(token).json()['status'], 'complete_profile')
        self.assertEqual(self.profile().status_code, 201)
        from .models import EmailIdentity
        return EmailIdentity.objects.get(email=email).user

    def code(self, secret, offset=0):
        import pyotp
        return pyotp.TOTP(secret).at(time.time() + offset)

    def enroll(self):
        secret = self.post('/api/v1/auth/mfa/setup/').json()['secret']
        self.assertEqual(self.post('/api/v1/auth/mfa/confirm/', {'code': self.code(secret)}).status_code, 200)
        self.refresh_csrf()
        return secret

    # Email link

    def test_link_stores_only_verifier_and_same_answer_for_unknown(self):
        from .models import LoginLink, OutboundEmail
        response, token = self.ask_link('Nueva@Example.invalid')
        self.assertEqual(response.status_code, 202)
        self.assertNotIn(token, str(LoginLink.objects.values().get()))
        self.assertEqual(LoginLink.objects.get().email, 'nueva@example.invalid')
        self.assertEqual(OutboundEmail.objects.get().kind, 'login_link')
        self.assertNotIn(token, str(OutboundEmail.objects.values().get()))

    def test_link_requires_csrf(self):
        self.assertEqual(self.client.post('/api/v1/auth/link/', {'email': 'x@example.invalid'}, content_type='application/json').status_code, 403)

    def test_link_rejects_extra_fields(self):
        self.assertEqual(self.post('/api/v1/auth/link/', {'email': 'x@example.invalid', 'user': str(self.admin.id)}).status_code, 400)

    def test_link_is_single_use(self):
        _, token = self.ask_link()
        self.assertEqual(self.consume(token).status_code, 200)
        self.fresh()
        self.assertEqual(self.consume(token).status_code, 400)

    def test_link_expires_after_15_minutes(self):
        from datetime import timedelta
        from .models import LoginLink
        _, token = self.ask_link()
        LoginLink.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.consume(token).json()['detail'], self.consume('desconocido').json()['detail'])

    def test_per_email_limit_keeps_same_answer(self):
        from .models import LoginLink
        answers = [self.ask_link('limite@example.invalid')[0] for _ in range(4)]
        self.assertTrue(all(a.status_code == 202 and a.json() == answers[0].json() for a in answers))
        self.assertEqual(LoginLink.objects.count(), 3)

    @override_settings(CLIENT_IP_HEADER='HTTP_X_FORWARDED_FOR', TRUSTED_PROXY_COUNT=2)
    def test_per_origin_limit_uses_balancer_address(self):
        for i in range(10):
            self.ask_link(f'balanceo{i}@example.invalid', HTTP_X_FORWARDED_FOR=f'10.9.9.{i}, 203.0.113.5, 192.0.2.1')
        # A different forged left-most value is still the same client for the balancer.
        self.assertEqual(self.ask_link('x@example.invalid', HTTP_X_FORWARDED_FOR='10.1.1.1, 203.0.113.5, 192.0.2.1')[0].status_code, 429)
        self.assertEqual(self.ask_link('y@example.invalid', HTTP_X_FORWARDED_FOR='203.0.113.6, 192.0.2.1')[0].status_code, 202)

    def test_forged_forwarded_header_ignored_without_configuration(self):
        statuses = [self.ask_link(f'falso{i}@example.invalid', HTTP_X_FORWARDED_FOR=f'198.51.100.{i}')[0].status_code for i in range(11)]
        self.assertEqual(statuses[10], 429)

    def test_per_origin_limit(self):
        statuses = [self.ask_link(f'origen{i}@example.invalid')[0].status_code for i in range(11)]
        self.assertEqual(statuses[:10], [202] * 10)
        self.assertEqual(statuses[10], 429)
        self.assertEqual(self.ask_link('otro@example.invalid', REMOTE_ADDR='198.51.100.7')[0].status_code, 202)

    def test_existing_identity_signs_in_with_personal_policy(self):
        from .models import EmailIdentity
        EmailIdentity.objects.create(user=self.member, email='miembro@example.invalid', verified_at=timezone.now())
        _, token = self.ask_link('miembro@example.invalid')
        self.assertEqual(self.consume(token).json(), {'status': 'signed_in', 'mfaRequired': False})
        me = self.client.get('/api/v1/auth/me/').json()
        self.assertEqual((me['username'], me['idleSeconds'], me['absoluteSeconds']), (self.member.username, 1800, 12 * 3600))

    def test_privileged_identity_is_told_to_verify(self):
        from .models import EmailIdentity
        EmailIdentity.objects.create(user=self.admin, email='admin@example.invalid', verified_at=timezone.now())
        _, token = self.ask_link('admin@example.invalid')
        self.assertTrue(self.consume(token).json()['mfaRequired'])
        self.assertTrue(self.client.get('/api/v1/auth/me/').json()['mfaPending'])

    def test_inactive_account_cannot_sign_in(self):
        from .models import EmailIdentity
        inactive = User.objects.create_user(username='inactiva-ficticia', is_active=False)
        EmailIdentity.objects.create(user=inactive, email='inactiva@example.invalid', verified_at=timezone.now())
        _, token = self.ask_link('inactiva@example.invalid')
        self.assertEqual(self.consume(token).status_code, 403)
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 401)

    # Profile and consents

    def test_consent_texts_published_by_command(self):
        import tempfile
        from django.core.management import call_command
        from django.core.management.base import CommandError
        with tempfile.NamedTemporaryFile('w', suffix='.txt', encoding='utf-8', delete=False) as handle:
            handle.write('Aviso ficticio, versión 2.')
        call_command('publish_consent_text', 'aviso', 'demo-2', handle.name)
        self.assertEqual(self.client.get('/api/v1/auth/consents/').json()['aviso'], {'version': 'demo-2', 'body': 'Aviso ficticio, versión 2.'})
        with self.assertRaises(CommandError):
            call_command('publish_consent_text', 'aviso', 'demo-2', handle.name)

    def test_registration_closed_without_texts(self):
        from .models import ConsentText
        ConsentText.objects.filter(kind='dato_sensible').delete()
        self.assertEqual(self.client.get('/api/v1/auth/consents/').status_code, 503)

    def test_complete_profile_records_consents_without_birth_date(self):
        from .models import AccountProfile, ConsentRecord
        user = self.sign_up()
        self.assertEqual(set(ConsentRecord.objects.filter(user=user).values_list('text__kind', flat=True)), {'aviso', 'dato_sensible'})
        profile = AccountProfile.objects.get(user=user)
        # The random UUID key may contain these digits; only the other columns must not.
        stored = AccountProfile.objects.values().get()
        stored.pop('user_id')
        self.assertNotIn('1990', str(stored))
        self.assertEqual(profile.display_name, 'Persona de ejemplo')
        me = self.client.get('/api/v1/auth/me/').json()
        self.assertEqual((me['displayName'], me['roles'], me['mfaPending']), ('Persona de ejemplo', [], False))
        self.assertFalse(user.has_usable_password())
        self.assertEqual(self.profile().status_code, 400)

    def test_minor_stores_nothing(self):
        from .models import AccountProfile, EmailIdentity
        _, token = self.ask_link()
        self.consume(token)
        birth = timezone.localdate().replace(year=timezone.localdate().year - 17)
        self.assertEqual(self.profile(birth_date=birth.isoformat()).status_code, 403)
        self.assertEqual((User.objects.count(), EmailIdentity.objects.count(), AccountProfile.objects.count()), (3, 0, 0))
        self.assertEqual(self.profile().status_code, 400)

    def test_both_consents_required(self):
        _, token = self.ask_link()
        self.consume(token)
        self.assertEqual(self.profile(accept_sensitive=False).status_code, 400)
        self.assertEqual(self.profile(accept_privacy=False).status_code, 400)
        self.assertEqual(User.objects.count(), 3)

    def test_outdated_consent_version_rejected(self):
        _, token = self.ask_link()
        self.consume(token)
        self.assertEqual(self.profile(privacy_version='demo-0').status_code, 409)

    def test_signup_window_expires(self):
        _, token = self.ask_link()
        self.consume(token)
        session = self.client.session
        session['signup']['at'] = time.time() - 31 * 60
        session.save()
        self.assertEqual(self.profile().status_code, 400)

    def test_profile_without_link_rejected(self):
        self.assertEqual(self.profile().status_code, 400)

    def test_profile_rejects_extra_fields(self):
        _, token = self.ask_link()
        self.consume(token)
        self.assertEqual(self.profile(roles=['administracion']).status_code, 400)

    # TOTP

    def test_admin_api_opens_only_after_mfa(self):
        with self.settings(ADMIN_MFA_REQUIRED=True):
            self.sign_in(self.admin)
            self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 403)
            self.enroll()
            self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 200)
            self.assertFalse(self.client.get('/api/v1/auth/me/').json()['mfaPending'])
            # A new session must verify again.
            self.sign_in(self.admin)
            self.assertEqual(self.client.get('/api/v1/admin/accounts/').status_code, 403)

    def test_verify_in_new_session(self):
        from .models import TotpDevice
        self.sign_in(self.admin)
        secret = self.enroll()
        self.sign_in(self.admin)
        TotpDevice.objects.update(last_step=0)
        before = self.client.session.session_key
        self.assertEqual(self.post('/api/v1/auth/mfa/verify/', {'code': self.code(secret)}).status_code, 200)
        self.assertNotEqual(self.client.session.session_key, before)
        self.assertIn('mfa_verified_at', self.client.session)

    def test_secret_sealed_at_rest(self):
        from .models import TotpDevice
        self.sign_in(self.admin)
        secret = self.enroll()
        self.assertNotIn(secret, TotpDevice.objects.get().sealed_secret)
        self.assertEqual(AuditEvent.objects.filter(action='mfa.enroll').count(), 1)

    def test_code_cannot_be_reused(self):
        self.sign_in(self.admin)
        secret = self.enroll()
        self.assertEqual(self.post('/api/v1/auth/mfa/verify/', {'code': self.code(secret)}).status_code, 400)

    def test_cannot_setup_twice(self):
        self.sign_in(self.admin)
        self.enroll()
        self.assertEqual(self.post('/api/v1/auth/mfa/setup/').status_code, 400)

    def test_setup_includes_qr_of_the_same_key(self):
        from urllib.parse import unquote
        self.sign_in(self.admin)
        response = self.post('/api/v1/auth/mfa/setup/')
        data = response.json()
        self.assertTrue(data['qr'].startswith('data:image/svg+xml'))
        svg = unquote(data['qr'].split(',', 1)[1])
        self.assertIn('<svg', svg)
        self.assertNotIn('<script', svg.lower())
        self.assertNotIn('href', svg)
        self.assertIn(data['secret'], data['uri'])
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_verify_without_device(self):
        self.sign_in(self.admin)
        self.assertEqual(self.post('/api/v1/auth/mfa/verify/', {'code': '123456'}).status_code, 400)

    def test_lockout_after_five_failures(self):
        from .models import TotpDevice
        self.sign_in(self.admin)
        secret = self.enroll()
        self.sign_in(self.admin)
        TotpDevice.objects.update(last_step=0)
        wrong = '000000' if self.code(secret) != '000000' else '111111'
        for _ in range(5):
            self.assertEqual(self.post('/api/v1/auth/mfa/verify/', {'code': wrong}).status_code, 400)
        self.assertEqual(self.post('/api/v1/auth/mfa/verify/', {'code': self.code(secret)}).status_code, 429)
        self.assertNotIn('mfa_verified_at', self.client.session)

    def test_malformed_code_rejected(self):
        self.sign_in(self.admin)
        self.post('/api/v1/auth/mfa/setup/')
        self.assertEqual(self.post('/api/v1/auth/mfa/confirm/', {'code': "1' OR '1"}).status_code, 400)

    def test_anonymous_cannot_use_mfa(self):
        self.assertEqual(self.post('/api/v1/auth/mfa/setup/').status_code, 403)

    def test_admin_resets_other_persons_mfa_and_closes_sessions(self):
        from .models import TotpDevice
        self.sign_in(self.second)
        self.enroll()
        target = self.client
        self.sign_in(self.admin)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.second.id}/mfa-reset/').status_code, 204)
        self.assertFalse(TotpDevice.objects.filter(user=self.second).exists())
        self.assertEqual(target.get('/api/v1/auth/me/').status_code, 401)
        self.assertEqual(AuditEvent.objects.filter(action='mfa.reset', actor=self.admin).count(), 1)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.admin.id}/mfa-reset/').status_code, 400)

    def test_non_admin_cannot_reset_mfa(self):
        self.sign_in(self.member)
        self.assertEqual(self.post(f'/api/v1/admin/accounts/{self.admin.id}/mfa-reset/').status_code, 403)

    # Sessions

    def test_logout_everywhere_closes_other_sessions(self):
        self.sign_in(self.member)
        other = self.client
        self.sign_in(self.member)
        self.assertEqual(self.post('/api/v1/auth/logout-everywhere/').status_code, 204)
        self.assertEqual(other.get('/api/v1/auth/me/').status_code, 401)
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 401)
        self.sign_in(self.member)
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 200)

    def test_session_without_version_is_closed(self):
        self.sign_in(self.member)
        session = self.client.session
        del session['session_version']
        session.save()
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 401)

    def test_shared_device_policy_for_local_login(self):
        self.sign_in(self.member)
        me = self.client.get('/api/v1/auth/me/').json()
        self.assertEqual((me['idleSeconds'], me['absoluteSeconds']), (300, 8 * 3600))

    def test_google_is_off(self):
        self.assertEqual(self.client.get('/api/v1/auth/providers/').json(), {'emailLink': True, 'google': False, 'localPassword': True})


class ClientOriginTests(TestCase):
    """Client address behind the load balancer and the counters shared by every instance."""
    def request(self, remote='192.0.2.10', forwarded=None):
        from django.test import RequestFactory
        extra = {'REMOTE_ADDR': remote}
        if forwarded is not None:
            extra['HTTP_X_FORWARDED_FOR'] = forwarded
        return RequestFactory().get('/', **extra)

    def test_remote_addr_without_configuration(self):
        from .limits import client_ip
        self.assertEqual(client_ip(self.request(forwarded='198.51.100.1')), '192.0.2.10')

    @override_settings(CLIENT_IP_HEADER='HTTP_X_FORWARDED_FOR', TRUSTED_PROXY_COUNT=1)
    def test_one_proxy_takes_right_most(self):
        from .limits import client_ip
        self.assertEqual(client_ip(self.request(forwarded='10.0.0.1, 203.0.113.9')), '203.0.113.9')

    @override_settings(CLIENT_IP_HEADER='HTTP_X_FORWARDED_FOR', TRUSTED_PROXY_COUNT=2)
    def test_two_proxies_skip_the_last_hop(self):
        from .limits import client_ip
        self.assertEqual(client_ip(self.request(forwarded='10.0.0.1,203.0.113.9 ,192.0.2.1')), '203.0.113.9')

    @override_settings(CLIENT_IP_HEADER='HTTP_X_FORWARDED_FOR', TRUSTED_PROXY_COUNT=2)
    def test_missing_or_short_header_falls_back_to_remote(self):
        from .limits import client_ip
        self.assertEqual(client_ip(self.request()), '192.0.2.10')
        self.assertEqual(client_ip(self.request(forwarded='203.0.113.9')), '192.0.2.10')

    @override_settings(CLIENT_IP_HEADER='HTTP_X_FORWARDED_FOR', TRUSTED_PROXY_COUNT=1)
    def test_origin_key_hashes_and_groups(self):
        from .limits import origin_key
        key = origin_key(self.request(forwarded='203.0.113.9'))
        self.assertEqual(len(key), 64)
        self.assertNotIn('203.0.113.9', key)
        self.assertEqual(origin_key(self.request(forwarded='2001:db8:1:2::a')), origin_key(self.request(forwarded='2001:db8:1:2:ffff::b')))
        self.assertNotEqual(origin_key(self.request(forwarded='2001:db8:1:2::a')), origin_key(self.request(forwarded='2001:db8:1:3::a')))
        self.assertEqual(origin_key(self.request(forwarded='::ffff:203.0.113.9')), key)
        self.assertEqual(origin_key(self.request(forwarded='basura')), origin_key(self.request(forwarded='otra-basura')))

    def test_counter_window_and_purge(self):
        from datetime import timedelta
        from .limits import over_limit, purge_expired
        from .models import RateCounter
        window = timedelta(minutes=15)
        self.assertEqual([over_limit('prueba:a', 2, window) for _ in range(3)], [False, False, True])
        self.assertFalse(over_limit('prueba:b', 2, window))
        RateCounter.objects.filter(key='prueba:a').update(window_start=timezone.now() - window)
        self.assertFalse(over_limit('prueba:a', 2, window))
        self.assertEqual(RateCounter.objects.get(key='prueba:a').hits, 1)
        RateCounter.objects.filter(key='prueba:b').update(window_start=timezone.now() - window - timedelta(seconds=1))
        self.assertEqual(purge_expired(), 1)
        self.assertEqual(list(RateCounter.objects.values_list('key', flat=True)), ['prueba:a'])


class SharedCounterConcurrencyTests(TransactionTestCase):
    def test_parallel_hits_are_all_counted(self):
        from concurrent.futures import ThreadPoolExecutor
        from datetime import timedelta
        from django.db import connection
        from .limits import over_limit
        from .models import RateCounter

        def hit(_):
            try:
                return over_limit('prueba:paralelo', 10, timedelta(minutes=15))
            finally:
                connection.close()
        # Each thread has its own database connection, as separate Cloud Run instances would.
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(hit, range(24)))
        self.assertEqual(RateCounter.objects.get(key='prueba:paralelo').hits, 24)
        self.assertEqual(results.count(False), 10)


class EnvironmentSettingsTests(TestCase):
    def test_trusted_origins(self):
        from config.env import trusted_origins
        self.assertEqual(trusted_origins(' https://pruebas.example.invalid , https://kids.example.invalid:8443/'),
                         ['https://pruebas.example.invalid', 'https://kids.example.invalid:8443'])
        self.assertEqual(trusted_origins(''), [])
        self.assertEqual(trusted_origins('http://localhost:5173', allow_http=True), ['http://localhost:5173'])

    def test_rejects_unsafe_origins(self):
        from django.core.exceptions import ImproperlyConfigured
        from config.env import trusted_origins
        for value in ['http://pruebas.example.invalid', 'https://*.example.invalid', 'pruebas.example.invalid',
                      'https://pruebas.example.invalid/ruta', 'https://persona@pruebas.example.invalid',
                      'https://pruebas.example.invalid?x=1', 'https://pruebas.example.invalid:puerto', 'javascript:alert(1)']:
            with self.subTest(value=value), self.assertRaises(ImproperlyConfigured):
                trusted_origins(value)

    def test_client_ip_settings(self):
        from django.core.exceptions import ImproperlyConfigured
        from config.env import client_ip_settings
        self.assertEqual(client_ip_settings('', ''), ('', 0))
        self.assertEqual(client_ip_settings('X-Forwarded-For', '2'), ('HTTP_X_FORWARDED_FOR', 2))
        for header, count in [('X-Forwarded-For', ''), ('', '1'), ('X-Forwarded-For', '-1'), ('X-Forwarded-For', 'dos'), ('X Forwarded', '1')]:
            with self.subTest(header=header, count=count), self.assertRaises(ImproperlyConfigured):
                client_ip_settings(header, count)

    @override_settings(CSRF_TRUSTED_ORIGINS=['https://pruebas.example.invalid'])
    def test_trusted_origin_passes_csrf_from_public_domain(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get('/api/v1/auth/csrf/').json()['csrfToken']
        def ask(origin):
            return client.post('/api/v1/auth/link/', {'email': 'origen@example.invalid'}, content_type='application/json',
                               HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN=origin, secure=True).status_code
        self.assertEqual(ask('https://pruebas.example.invalid'), 202)
        self.assertEqual(ask('https://otro.example.invalid'), 403)


class EmailQueueTests(TestCase):
    """Invitations retry from a sealed body; login links never store one."""
    def queue(self, kind='invitation', retry=True, token='token-sintetico-123'):
        from .emails import INVITATION, send_after_commit
        with self.captureOnCommitCallbacks(execute=True):
            send_after_commit(kind, 'cola@example.invalid', INVITATION, retry=retry, link=f'{settings.PUBLIC_APP_URL}/invitacion#{token}')
        from .models import OutboundEmail
        return OutboundEmail.objects.get()

    def make_due(self):
        from .models import OutboundEmail
        OutboundEmail.objects.update(next_attempt_at=timezone.now() - timedelta(seconds=1))

    def failing(self):
        from unittest.mock import patch
        return patch('core.emails.send_mail', side_effect=OSError('synthetic failure'))

    def test_delivered_message_keeps_no_body(self):
        from django.core import mail
        record = self.queue()
        self.assertEqual(len(mail.outbox), 1)
        self.assertIsNotNone(record.sent_at)
        self.assertEqual((record.sealed_body, record.next_attempt_at, record.attempts), ('', None, 1))

    def test_failed_login_link_is_final_and_stores_no_token(self):
        with self.failing():
            record = self.queue(kind='login_link', retry=False)
        self.assertEqual((record.failed, record.sealed_body, record.next_attempt_at), (True, '', None))
        self.assertNotIn('token-sintetico-123', str(type(record).objects.values().get()))

    def test_pending_body_is_sealed(self):
        from .crypto import unseal
        with self.failing():
            record = self.queue()
        self.assertNotIn('token-sintetico-123', str(type(record).objects.values().get()))
        self.assertIn('token-sintetico-123', unseal(record.sealed_body))

    def test_message_carries_the_design_and_its_text(self):
        from django.core import mail
        self.queue()
        message = mail.outbox[-1]
        html, kind = message.alternatives[0]
        self.assertEqual(kind, 'text/html')
        link = f'{settings.PUBLIC_APP_URL}/invitacion#token-sintetico-123'
        self.assertIn(link, message.body)
        self.assertIn(f'href="{link}"', html)
        self.assertIn(f'{settings.PUBLIC_APP_URL}/correo/shalom-logo.png', html)
        self.assertIn('max-width:600px', html)
        self.assertIn('v:roundrect', html)
        # The draft wording for the invitation is kept as written.
        self.assertIn('Crear tu cuenta es voluntario.', message.body)
        self.assertNotIn('<script', html)

    def test_body_queued_before_the_design_is_still_sent_as_text(self):
        from django.core import mail
        from .crypto import seal
        from .emails import drain
        from .models import OutboundEmail
        due = timezone.now() - timedelta(seconds=1)
        OutboundEmail.objects.create(kind='invitation', recipient='cola@example.invalid', subject='Prueba', sealed_body=seal('cuerpo sintético'),
                                     next_attempt_at=due, retry_until=due + timedelta(hours=1))
        self.assertEqual(drain()['sent'], 1)
        self.assertEqual((mail.outbox[-1].body, mail.outbox[-1].alternatives), ('cuerpo sintético', []))

    def test_links_outside_the_app_are_refused(self):
        from .emails import INVITATION, send_after_commit
        with self.assertRaises(ValueError):
            send_after_commit('invitation', 'cola@example.invalid', INVITATION, link='https://otro.example.invalid/invitacion#x')
        with self.assertRaises(ValueError):
            send_after_commit('invitation', 'cola@example.invalid', INVITATION, link=f'{settings.PUBLIC_APP_URL}.otro.example.invalid/x')

    def test_values_are_escaped_in_the_html(self):
        from .email_layout import render
        from .kids import REMINDER
        subject, text, html = render(REMINDER, name='<b>Ficticia</b>', classes='• 01/11/2026 · <i>grupo</i>', app=f'{settings.PUBLIC_APP_URL}/')
        self.assertIn('&lt;b&gt;Ficticia&lt;/b&gt;', html)
        self.assertNotIn('<b>Ficticia', html)
        self.assertIn('<b>Ficticia</b>', text)

    def test_retry_waits_then_delivers_and_erases_body(self):
        from django.core import mail
        from .emails import drain
        with self.failing():
            record = self.queue()
        wait = record.next_attempt_at - timezone.now()
        self.assertTrue(timedelta(minutes=4) < wait <= timedelta(minutes=5))
        self.assertEqual(drain()['due'], 0)
        self.make_due()
        self.assertEqual(drain(), {'due': 1, 'sent': 1, 'expired': 0})
        record.refresh_from_db()
        self.assertEqual((record.attempts, record.sealed_body), (2, ''))
        self.assertIsNotNone(record.sent_at)
        self.assertIn('token-sintetico-123', mail.outbox[-1].body)

    def test_backoff_doubles_and_gives_up_after_five_attempts(self):
        from .emails import drain
        with self.failing():
            record = self.queue()
            waits = []
            for _ in range(4):
                record.refresh_from_db()
                waits.append(round((record.next_attempt_at - timezone.now()).total_seconds() / 60))
                self.make_due()
                drain()
        record.refresh_from_db()
        self.assertEqual(waits, [5, 10, 20, 40])
        self.assertEqual((record.attempts, record.failed, record.sealed_body, record.next_attempt_at), (5, True, '', None))

    def test_window_expiry_erases_body(self):
        from .emails import drain
        with self.failing():
            record = self.queue()
        type(record).objects.update(retry_until=timezone.now())
        self.make_due()
        self.assertEqual(drain(), {'due': 0, 'sent': 0, 'expired': 1})
        record.refresh_from_db()
        self.assertEqual((record.failed, record.sealed_body), (True, ''))

    def test_unattempted_message_is_picked_up_after_claim(self):
        from django.core import mail
        from .emails import INVITATION, drain, send_after_commit
        # The instance died before the on-commit attempt ran.
        record = send_after_commit('invitation', 'cola@example.invalid', INVITATION, retry=True, link=f'{settings.PUBLIC_APP_URL}/x')
        self.assertEqual(drain()['due'], 0)
        self.make_due()
        self.assertEqual(drain()['sent'], 1)
        self.assertEqual(len(mail.outbox), 1)
        record.refresh_from_db()
        self.assertEqual(record.attempts, 1)

    def test_body_sealed_with_old_key_is_dropped(self):
        from cryptography.fernet import Fernet
        from .emails import drain
        with self.failing():
            record = self.queue()
        self.make_due()
        with override_settings(FIELD_ENCRYPTION_KEY=Fernet.generate_key().decode()):
            self.assertEqual(drain()['sent'], 0)
        record.refresh_from_db()
        self.assertEqual((record.failed, record.sealed_body), (True, ''))


class EmailQueueConcurrencyTests(TransactionTestCase):
    def test_parallel_drains_send_each_message_once(self):
        import threading
        from unittest.mock import patch
        from django.db import connection
        from .crypto import seal
        from .emails import drain
        from .models import OutboundEmail
        due = timezone.now() - timedelta(seconds=1)
        for number in range(6):
            OutboundEmail.objects.create(kind='invitation', recipient=f'cola{number}@example.invalid', subject='Prueba',
                                         sealed_body=seal('cuerpo sintético'), next_attempt_at=due, retry_until=due + timedelta(hours=1))
        sent, lock = [], threading.Lock()
        def slow_send(subject, body, sender, recipients, **options):
            time.sleep(0.05)
            with lock:
                sent.extend(recipients)
        def run():
            try:
                drain()
            finally:
                connection.close()
        with patch('core.emails.send_mail', side_effect=slow_send):
            threads = [threading.Thread(target=run) for _ in range(3)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()
        self.assertEqual(sorted(sent), sorted(f'cola{n}@example.invalid' for n in range(6)))
        self.assertEqual(OutboundEmail.objects.filter(sent_at__isnull=False, sealed_body='').count(), 6)


SCHEDULER = 'programador@proyecto-ficticio.iam.gserviceaccount.com'
AUDIENCE = 'https://api-ficticia.example.invalid'


@override_settings(SCHEDULER_SERVICE_ACCOUNT=SCHEDULER, SCHEDULER_AUDIENCE=AUDIENCE)
class SchedulerEndpointTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from cryptography.hazmat.primitives.asymmetric import rsa
        cls.private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.stranger = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def setUp(self):
        from unittest.mock import patch
        public = self.private.public_key()
        patcher = patch('core.internal.google_keys.get', side_effect=lambda kid: public if kid == 'llave-1' else None)
        patcher.start()
        self.addCleanup(patcher.stop)

    def token(self, key=None, kid='llave-1', algorithm='RS256', **changes):
        import jwt
        now = int(time.time())
        claims = {'iss': 'https://accounts.google.com', 'aud': AUDIENCE, 'email': SCHEDULER, 'email_verified': True,
                  'sub': '1234567890', 'iat': now, 'exp': now + 3600, **changes}
        claims = {name: value for name, value in claims.items() if value is not None}
        return jwt.encode(claims, key or self.private, algorithm=algorithm, headers={'kid': kid})

    def forged(self, algorithm, secret=None):
        # Key-confusion and unsigned tokens, built by hand because PyJWT refuses to create them.
        import base64
        import hashlib
        import hmac
        def part(data):
            return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b'=').decode()
        now = int(time.time())
        body = f"{part({'alg': algorithm, 'kid': 'llave-1', 'typ': 'JWT'})}.{part({'iss': 'https://accounts.google.com', 'aud': AUDIENCE, 'email': SCHEDULER, 'email_verified': True, 'iat': now, 'exp': now + 3600})}"
        signature = base64.urlsafe_b64encode(hmac.new(secret, body.encode(), hashlib.sha256).digest()).rstrip(b'=').decode() if secret else ''
        return f'{body}.{signature}'

    def call(self, token=None, path='/internal/email/drain/', **extra):
        if token is not None:
            extra['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        return Client(enforce_csrf_checks=True).post(path, **extra)

    def test_valid_token_runs_the_queue(self):
        response = self.call(self.token())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'due': 0, 'sent': 0, 'expired': 0})
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_daily_purges_counters_and_expired_bodies(self):
        from .limits import over_limit
        from .models import RateCounter
        over_limit('prueba-diaria', 5, timedelta(minutes=1))
        RateCounter.objects.update(window_start=timezone.now() - timedelta(hours=1))
        response = self.call(self.token(), path='/internal/daily/')
        self.assertEqual(response.json(), {'counters': 1, 'expired_email': 0, 'reminded': 0, 'without_email': 0})

    def test_rejected_tokens(self):
        from cryptography.hazmat.primitives import serialization
        public_pem = self.private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        cases = {
            'other audience': self.token(aud='https://otra.example.invalid'),
            'other account': self.token(email='otra@proyecto-ficticio.iam.gserviceaccount.com'),
            'unverified email': self.token(email_verified=False),
            'missing email': self.token(email=None),
            'expired': self.token(iat=int(time.time()) - 7200, exp=int(time.time()) - 3600),
            'other issuer': self.token(iss='https://emisor.example.invalid'),
            'unknown key id': self.token(kid='llave-2'),
            'signed by another key': self.token(key=self.stranger),
            'hmac with public key': self.forged('HS256', public_pem),
            'unsigned': self.forged('none'),
            'garbage': 'no-es-un-token',
        }
        for case, token in cases.items():
            with self.subTest(case):
                self.assertEqual(self.call(token).status_code, 403)
        self.assertEqual(self.call().status_code, 403)
        self.assertEqual(Client().post('/internal/email/drain/', HTTP_AUTHORIZATION=f'Basic {self.token()}').status_code, 403)

    def test_only_post(self):
        self.assertEqual(Client().get('/internal/email/drain/', HTTP_AUTHORIZATION=f'Bearer {self.token()}').status_code, 405)

    @override_settings(SCHEDULER_SERVICE_ACCOUNT='')
    def test_disabled_without_configuration(self):
        self.assertEqual(self.call(self.token()).status_code, 403)

    def test_administrator_session_is_not_enough(self):
        from .models import Role, RoleGrant
        admin = User.objects.create_user(username='admin-interno', password=secrets.token_urlsafe(24))
        RoleGrant.objects.create(user=admin, role=Role.ADMINISTRACION, granted_by=admin, confirmed_by=admin)
        client = Client()
        client.force_login(admin)
        session = client.session
        session.update({'started_at': time.time(), 'active_at': time.time(), 'idle_limit': 300, 'absolute_limit': 3600, 'session_version': admin.session_version})
        session.save()
        self.assertEqual(client.get('/api/v1/auth/me/').status_code, 200)
        self.assertEqual(client.post('/internal/email/drain/').status_code, 403)


class GoogleKeysTests(TestCase):
    def keys(self, results):
        from unittest.mock import MagicMock
        from .internal import GoogleKeys
        keys = GoogleKeys()
        keys.fetch = MagicMock(side_effect=results)
        return keys

    def test_unknown_key_refetches_at_most_every_five_minutes(self):
        from unittest.mock import patch
        keys = self.keys([{'a': 'llave-a'}, {'a': 'llave-a', 'b': 'llave-b'}])
        with patch('core.internal.time.monotonic', return_value=1000.0):
            self.assertEqual(keys.get('a'), 'llave-a')
            self.assertIsNone(keys.get('b'))
        self.assertEqual(keys.fetch.call_count, 1)
        with patch('core.internal.time.monotonic', return_value=1301.0):
            self.assertEqual(keys.get('b'), 'llave-b')
        self.assertEqual(keys.fetch.call_count, 2)

    def test_failed_fetch_keeps_old_keys_and_waits(self):
        from unittest.mock import patch
        keys = self.keys([{'a': 'llave-a'}, OSError('sin red'), {'b': 'llave-b'}])
        with patch('core.internal.time.monotonic', return_value=0.0):
            keys.get('a')
        with patch('core.internal.time.monotonic', return_value=4000.0):
            self.assertEqual(keys.get('a'), 'llave-a')
            self.assertIsNone(keys.get('b'))
        self.assertEqual(keys.fetch.call_count, 2)


class ProductionConfigTests(TestCase):
    """Production settings boot only from environment variables, all fictitious here."""
    def boot(self, code, **extra):
        import os
        import subprocess
        import sys
        from pathlib import Path
        from cryptography.fernet import Fernet
        env = {key: value for key, value in os.environ.items() if not key.startswith(('SHALOM_', 'DJANGO_'))}
        env.update({
            'SHALOM_ENV': 'production', 'DJANGO_SETTINGS_MODULE': 'config.settings',
            'DJANGO_SECRET_KEY': secrets.token_urlsafe(64), 'SHALOM_FIELD_KEY': Fernet.generate_key().decode(),
            'DJANGO_ALLOWED_HOSTS': 'api-ficticia.example.invalid', 'SHALOM_PUBLIC_APP_URL': 'https://pruebas.example.invalid',
            'PGHOST': '/cloudsql/proyecto-ficticio:us-central1:instancia', **extra})
        script = f'import django; django.setup(); from django.conf import settings as s; {code}'
        return subprocess.run([sys.executable, '-c', script], env=env, cwd=Path(__file__).resolve().parent.parent,
                              capture_output=True, text=True, timeout=60)

    def test_cloud_run_settings(self):
        result = self.boot("import json; print(json.dumps([s.SESSION_COOKIE_NAME, s.CSRF_USE_SESSIONS, s.SECURE_PROXY_SSL_HEADER, "
                           "s.DATABASES['default']['OPTIONS'], s.LOGGING['formatters']['json']['()'], s.SECURE_SSL_REDIRECT]))")
        self.assertEqual(result.returncode, 0, result.stderr[-500:])
        self.assertEqual(json.loads(result.stdout), ['__session', True, ['HTTP_X_FORWARDED_PROTO', 'https'], {}, 'config.logs.JsonFormatter', True])

    def test_tcp_database_requires_verified_tls(self):
        result = self.boot("print(s.DATABASES['default']['OPTIONS']['sslmode'])", PGHOST='10.0.0.5')
        self.assertEqual(result.stdout.strip(), 'verify-full')

    def test_scheduler_needs_https_audience(self):
        result = self.boot('pass', SHALOM_SCHEDULER_SERVICE_ACCOUNT=SCHEDULER, SHALOM_SCHEDULER_AUDIENCE='http://api.example.invalid')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('SHALOM_SCHEDULER_AUDIENCE', result.stderr)


class JsonLogTests(TestCase):
    def test_only_allowed_fields_and_no_exception_message(self):
        import logging
        from config.logs import JsonFormatter
        try:
            value = 'persona@example.invalid'
            raise ValueError(f'duplicado: {value}')
        except ValueError:
            import sys
            record = logging.LogRecord('core', logging.ERROR, __file__, 1, 'Internal Server Error: %s', ('/api/v1/x/',), sys.exc_info())
        record.request = 'cuerpo y cabeceras'
        record.email_id = 'abc'
        entry = json.loads(JsonFormatter().format(record))
        self.assertEqual(entry['severity'], 'ERROR')
        self.assertEqual(entry['message'], 'Internal Server Error: /api/v1/x/')
        self.assertEqual(entry['email_id'], 'abc')
        self.assertEqual(entry['error'], 'builtins.ValueError')
        self.assertNotIn('request', entry)
        self.assertNotIn('persona@example.invalid', json.dumps(entry))
        self.assertIn('test_only_allowed_fields_and_no_exception_message', entry['stack_trace'])
