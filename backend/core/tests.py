import secrets
import time
from django.test import TestCase, Client, override_settings
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
        self.assertTrue(OutboundEmail.objects.get().failed)

    def test_extra_fields_rejected(self):
        self.sign_in(self.admin)
        self.assertEqual(self.post('/api/v1/admin/grants/', {'user': str(self.member.id), 'role': 'caja', 'confirmed_by': str(self.admin.id)}).status_code, 400)

    def test_bootstrap_only_without_admin(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            call_command('bootstrap_admin', self.member.username)
