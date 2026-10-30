import secrets
import time
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
