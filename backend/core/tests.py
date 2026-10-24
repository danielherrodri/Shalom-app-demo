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
