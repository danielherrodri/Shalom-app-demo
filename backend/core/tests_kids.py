"""Coordinación Kids: permissions, rules, audit and reminders. Fictitious adults only."""
import json
import secrets
import time
from datetime import time as clock, timedelta
from django.core import mail
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from .models import (AuditEvent, DayLead, EmailIdentity, Enrollment, EventItem, Family, Group, Lesson, Person, Role, RoleGrant,
                     RosterEntry, Service, Swap, User)


def next_weekday(weekday, after=0):
    day = timezone.localdate() + timedelta(days=after)
    return day + timedelta(days=(weekday - day.weekday()) % 7)


class KidsBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = cls.account('admin-kids', [Role.ADMINISTRACION])
        cls.coordinator = cls.account('coordinacion-kids', [Role.COORDINACION_KIDS])
        cls.teacher = cls.account('docente-a', [Role.DOCENTE])
        cls.other_teacher = cls.account('docente-b', [Role.DOCENTE])
        cls.volunteer = cls.account('voluntario-a', [Role.VOLUNTARIO])
        cls.outsider = cls.account('sin-perfil', [])
        cls.group = Group.objects.create(name='Tesoros del Rey (ficticio)', min_age=4, max_age=6)
        cls.first = Service.objects.create(name='1er servicio', weekday=6, starts_at=clock(9), ends_at=clock(10, 30))
        cls.second = Service.objects.create(name='2° servicio', weekday=6, starts_at=clock(11), ends_at=clock(12, 30))
        cls.sunday = next_weekday(6, after=7)

    @classmethod
    def account(cls, username, roles):
        user = User.objects.create_user(username=username, password=secrets.token_urlsafe(24))
        for role in roles:
            RoleGrant.objects.create(user=user, role=role, granted_by=user, confirmed_by=user)
        return user

    def client_for(self, user, mfa=True):
        client = Client()
        client.force_login(user)
        session = client.session
        now = time.time()
        session.update({'started_at': now, 'active_at': now, 'idle_limit': 1800, 'absolute_limit': 3600,
                        'session_version': user.session_version, **({'mfa_verified_at': now} if mfa else {})})
        session.save()
        return client

    def call(self, user, method, url, data=None, **options):
        client = self.client_for(user, **options)
        return getattr(client, method)(f'/api/v1/kids/{url}', json.dumps(data) if data is not None else None, content_type='application/json')

    def roster(self, teacher=None, service=None, day=None, user=None):
        return self.call(user or self.coordinator, 'post', 'roster/', {
            'date': (day or self.sunday).isoformat(), 'service': str((service or self.first).id),
            'group': str(self.group.id), 'teacher': str((teacher or self.teacher).id)})


class KidsPermissionTests(KidsBase):
    COORDINATION_ONLY = ['roster/', 'leads/', 'team/', 'events/', 'audit/']
    TEAM = ['groups/', 'services/', 'lessons/', 'agenda/', 'swaps/']

    def test_people_without_kids_profiles_get_nothing(self):
        for url in self.TEAM + self.COORDINATION_ONLY:
            with self.subTest(url=url):
                self.assertEqual(self.call(self.outsider, 'get', url).status_code, 403)
                self.assertEqual(self.call(self.admin, 'get', url).status_code, 403)

    def test_team_reads_configuration_but_not_coordination(self):
        for user in (self.teacher, self.volunteer):
            for url in self.TEAM:
                with self.subTest(user=user.username, url=url):
                    self.assertEqual(self.call(user, 'get', url).status_code, 200)
            for url in self.COORDINATION_ONLY:
                with self.subTest(user=user.username, url=url):
                    self.assertEqual(self.call(user, 'get', url).status_code, 403)
        self.assertEqual(self.call(self.teacher, 'post', 'groups/', {'name': 'Grupo nuevo'}).status_code, 403)
        self.assertEqual(self.call(self.teacher, 'patch', f'groups/{self.group.id}/', {'name': 'Cambiado'}).status_code, 403)
        self.assertEqual(self.roster(user=self.teacher).status_code, 403)

    def test_coordination_reads_everything(self):
        for url in self.TEAM + self.COORDINATION_ONLY:
            with self.subTest(url=url):
                self.assertEqual(self.call(self.coordinator, 'get', url).status_code, 200)

    @override_settings(ADMIN_MFA_REQUIRED=True)
    def test_coordination_needs_second_factor(self):
        self.assertEqual(self.call(self.coordinator, 'get', 'roster/', mfa=False).status_code, 403)
        self.assertEqual(self.call(self.coordinator, 'get', 'groups/', mfa=False).status_code, 403)
        self.assertEqual(self.call(self.coordinator, 'get', 'roster/').status_code, 200)
        # Teachers are not privileged profiles and need no second factor.
        self.assertEqual(self.call(self.teacher, 'get', 'agenda/', mfa=False).status_code, 200)

    def test_unconfirmed_coordination_grant_does_nothing(self):
        pending = User.objects.create_user(username='coordinacion-pendiente')
        RoleGrant.objects.create(user=pending, role=Role.COORDINACION_KIDS, granted_by=self.admin)
        self.assertEqual(self.call(pending, 'get', 'roster/').status_code, 403)

    def test_revoked_teacher_loses_access(self):
        RoleGrant.objects.filter(user=self.teacher).update(revoked_at=timezone.now())
        self.assertEqual(self.call(self.teacher, 'get', 'agenda/').status_code, 403)

    def test_no_child_ever_appears(self):
        child = Person.objects.create(display_name='Niña Ficticia Zeta', family=Family.objects.create(label='Familia ficticia'))
        Enrollment.objects.create(person=child, group=self.group)
        self.roster()
        for url in self.TEAM + self.COORDINATION_ONLY:
            with self.subTest(url=url):
                self.assertNotIn('Zeta', self.call(self.coordinator, 'get', url).content.decode())


class KidsConfigurationTests(KidsBase):
    def test_group_rules_and_audit(self):
        response = self.call(self.coordinator, 'post', 'groups/', {'name': 'Primarios (ficticio)', 'min_age': 7, 'max_age': 12})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AuditEvent.objects.filter(action='kids.group.create', actor=self.coordinator, target_id=response.json()['id']).exists())
        self.assertEqual(self.call(self.coordinator, 'post', 'groups/', {'name': 'Al revés', 'min_age': 9, 'max_age': 3}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'post', 'groups/', {'name': 'Adultos', 'min_age': 18}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'post', 'groups/', {'name': 'Extra', 'children': []}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'patch', f'groups/{self.group.id}/', {'max_age': 3}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'patch', f'groups/{self.group.id}/', {'active': False}).json()['active'], False)
        self.assertTrue(AuditEvent.objects.filter(action='kids.group.update', target_id=self.group.id).exists())

    def test_service_must_end_after_start(self):
        bad = {'name': 'Tarde', 'weekday': 6, 'starts_at': '13:00', 'ends_at': '12:00'}
        self.assertEqual(self.call(self.coordinator, 'post', 'services/', bad).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'post', 'services/', {**bad, 'ends_at': '14:30'}).status_code, 201)
        self.assertEqual(self.call(self.coordinator, 'patch', f'services/{self.first.id}/', {'ends_at': '08:00'}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'post', 'services/', {**bad, 'weekday': 7, 'ends_at': '14:30'}).status_code, 400)

    def test_no_delete_for_configuration(self):
        self.assertEqual(self.call(self.coordinator, 'delete', f'groups/{self.group.id}/').status_code, 405)


class KidsRosterTests(KidsBase):
    def test_create_list_and_audit(self):
        response = self.roster()
        self.assertEqual(response.status_code, 201)
        row = response.json()
        self.assertEqual((row['teacherName'], row['reminded']), ('docente-a', False))
        listed = self.call(self.coordinator, 'get', f'roster/?from={self.sunday}&to={self.sunday}').json()['results']
        self.assertEqual([r['id'] for r in listed], [row['id']])
        self.assertTrue(AuditEvent.objects.filter(action='kids.roster.create', target_id=row['id']).exists())

    def test_rules(self):
        cases = {
            'wrong weekday': self.roster(day=self.sunday + timedelta(days=1)),
            'past date': self.roster(day=next_weekday(6) - timedelta(days=7)),
            'not a teacher': self.roster(teacher=self.volunteer),
        }
        for case, response in cases.items():
            with self.subTest(case):
                self.assertEqual(response.status_code, 400)
        self.assertEqual(self.roster().status_code, 201)
        self.assertEqual(self.roster().json()['detail'], 'Esa persona ya está en esa clase.')

    def test_overlapping_classes_rejected(self):
        overlapping = Service.objects.create(name='Servicio traslapado', weekday=6, starts_at=clock(10), ends_at=clock(11, 30))
        self.assertEqual(self.roster().status_code, 201)
        self.assertEqual(self.roster(service=overlapping).json()['detail'], 'Esa persona ya tiene una clase en ese horario.')
        self.assertEqual(self.roster(service=self.second).status_code, 201)

    def test_seats_per_class(self):
        third = self.account('docente-c', [Role.DOCENTE])
        self.assertEqual(self.roster().status_code, 201)
        self.assertEqual(self.roster(teacher=self.other_teacher).status_code, 201)
        self.assertEqual(self.roster(teacher=third).json()['detail'], 'Esa clase ya tiene 2 docentes.')

    def test_inactive_group_or_service(self):
        Service.objects.filter(pk=self.first.pk).update(active=False)
        self.assertEqual(self.roster().status_code, 400)

    def test_change_resets_reminder_and_delete_is_audited(self):
        entry_id = self.roster().json()['id']
        RosterEntry.objects.filter(pk=entry_id).update(reminded_at=timezone.now())
        moved = self.call(self.coordinator, 'patch', f'roster/{entry_id}/', {'teacher': str(self.other_teacher.id)})
        self.assertEqual(moved.status_code, 200)
        self.assertFalse(moved.json()['reminded'])
        self.assertEqual(self.call(self.coordinator, 'patch', f'roster/{entry_id}/', {'notes': 'x'}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'delete', f'roster/{entry_id}/').status_code, 204)
        self.assertTrue(AuditEvent.objects.filter(action='kids.roster.delete', target_id=entry_id).exists())

    def test_range_is_bounded(self):
        self.assertEqual(self.call(self.coordinator, 'get', 'roster/?from=2026-01-01&to=2027-01-01').status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'get', 'roster/?from=ayer').status_code, 400)

    def test_team_lists_upcoming_classes_without_contact_data(self):
        EmailIdentity.objects.create(user=self.teacher, email='docente-a@example.invalid', verified_at=timezone.now())
        self.roster()
        team = {r['displayName']: r for r in self.call(self.coordinator, 'get', 'team/').json()['results']}
        self.assertEqual(team['docente-a']['upcoming'], 1)
        self.assertEqual(team['docente-a']['groups'], [self.group.name])
        self.assertEqual(team['voluntario-a']['roles'], ['voluntario'])
        self.assertNotIn('sin-perfil', team)
        self.assertNotIn('admin-kids', team)
        self.assertNotIn('example.invalid', json.dumps(team))


class KidsLeadTests(KidsBase):
    def lead(self, person=None, day=None, user=None):
        return self.call(user or self.coordinator, 'post', 'leads/', {
            'date': (day or self.sunday).isoformat(), 'group': str(self.group.id), 'lead': str((person or self.teacher).id)})

    def test_one_lead_per_group_and_day(self):
        self.assertEqual(self.lead(user=self.teacher).status_code, 403)
        created = self.lead()
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()['leadName'], 'docente-a')
        self.assertEqual(self.lead(person=self.other_teacher).json()['detail'], 'Ese grupo ya tiene encargado(a) ese día.')
        self.assertTrue(AuditEvent.objects.filter(action='kids.lead.create', target_id=created.json()['id']).exists())

    def test_rules(self):
        cases = {
            'not a teacher': self.lead(person=self.volunteer),
            'past date': self.lead(day=next_weekday(6) - timedelta(days=7)),
            'no service that day': self.lead(day=self.sunday + timedelta(days=1)),
        }
        for case, response in cases.items():
            with self.subTest(case):
                self.assertEqual(response.status_code, 400)

    def test_change_resets_reminder_and_agenda_shows_it(self):
        lead = self.lead().json()
        self.roster(teacher=self.other_teacher)
        DayLead.objects.filter(pk=lead['id']).update(reminded_at=timezone.now())
        agenda = self.call(self.teacher, 'get', 'agenda/').json()
        self.assertEqual([(l['date'], l['group']) for l in agenda['leads']], [(self.sunday.isoformat(), self.group.name)])
        self.assertEqual(self.call(self.other_teacher, 'get', 'agenda/').json()['classes'][0]['lead'], 'docente-a')
        moved = self.call(self.coordinator, 'patch', f"leads/{lead['id']}/", {'lead': str(self.other_teacher.id)})
        self.assertEqual((moved.json()['leadName'], moved.json()['reminded']), ('docente-b', False))
        self.assertEqual(self.call(self.teacher, 'get', 'agenda/').json()['leads'], [])
        self.assertEqual(self.call(self.coordinator, 'patch', f"leads/{lead['id']}/", {'date': '2030-01-01'}).status_code, 400)
        self.assertEqual(self.call(self.coordinator, 'delete', f"leads/{lead['id']}/").status_code, 204)
        self.assertTrue(AuditEvent.objects.filter(action='kids.lead.delete', target_id=lead['id']).exists())


class KidsSwapTests(KidsBase):
    def setUp(self):
        self.third = self.account('docente-c', [Role.DOCENTE])
        self.entry = self.roster().json()['id']

    def swap(self, to=None, user=None, entry=None, **data):
        return self.call(user or self.teacher, 'post', 'swaps/', {'entry': entry or self.entry, 'to_teacher': str((to or self.other_teacher).id), **data})

    def teacher_of(self, entry_id):
        return RosterEntry.objects.get(pk=entry_id).teacher

    def test_teacher_registers_and_coordination_confirms(self):
        RosterEntry.objects.filter(pk=self.entry).update(reminded_at=timezone.now())
        swap = self.swap()
        self.assertEqual(swap.status_code, 201)
        swap = swap.json()
        self.assertEqual((swap['status'], swap['fromName'], swap['toName']), ('pendiente', 'docente-a', 'docente-b'))
        # Nothing changes until coordination confirms.
        self.assertEqual(self.teacher_of(self.entry), self.teacher)
        self.assertTrue(self.call(self.teacher, 'get', 'agenda/').json()['classes'][0]['swapPending'])
        self.assertEqual(self.swap(to=self.third).json()['detail'], 'Ya hay una permuta por confirmar para esa clase.')
        self.assertEqual(self.call(self.teacher, 'post', f"swaps/{swap['id']}/confirm/").status_code, 403)
        confirmed = self.call(self.coordinator, 'post', f"swaps/{swap['id']}/confirm/")
        self.assertEqual(confirmed.json()['status'], 'confirmada')
        entry = RosterEntry.objects.get(pk=self.entry)
        self.assertEqual((entry.teacher, entry.reminded_at), (self.other_teacher, None))
        self.assertEqual(self.call(self.teacher, 'get', 'agenda/').json()['classes'], [])
        self.assertEqual(len(self.call(self.other_teacher, 'get', 'agenda/').json()['classes']), 1)
        self.assertEqual(self.call(self.coordinator, 'post', f"swaps/{swap['id']}/reject/").status_code, 400)
        actions = set(AuditEvent.objects.filter(target_id=swap['id']).values_list('action', flat=True))
        self.assertEqual(actions, {'kids.swap.create', 'kids.swap.confirmada'})

    def test_decisions_are_emailed_to_each_teacher(self):
        for user, address in ((self.teacher, 'docente-a@example.invalid'), (self.other_teacher, 'docente-b@example.invalid')):
            EmailIdentity.objects.create(user=user, email=address, verified_at=timezone.now())
        later = self.roster(teacher=self.other_teacher, day=self.sunday + timedelta(days=7)).json()['id']
        swap = self.swap(return_entry=later).json()
        self.assertEqual(len(mail.outbox), 0)
        with self.captureOnCommitCallbacks(execute=True):
            self.call(self.coordinator, 'post', f"swaps/{swap['id']}/confirm/")
        sent = {m.to[0]: m for m in mail.outbox}
        self.assertEqual(set(sent), {'docente-a@example.invalid', 'docente-b@example.invalid'})
        self.assertIn('Ya no das: ' + self.sunday.strftime('%d/%m/%Y'), sent['docente-a@example.invalid'].body)
        self.assertIn('Das a cambio: ', sent['docente-a@example.invalid'].body)
        self.assertIn('Das: ' + self.sunday.strftime('%d/%m/%Y'), sent['docente-b@example.invalid'].body)
        self.assertIn('Tu rol cambió.', sent['docente-b@example.invalid'].alternatives[0][0])
        mail.outbox.clear()
        again = self.swap(entry=later, to=self.third).json()
        with self.captureOnCommitCallbacks(execute=True):
            self.call(self.coordinator, 'post', f"swaps/{again['id']}/reject/")
        self.assertEqual([m.to for m in mail.outbox], [['docente-a@example.invalid']])
        self.assertIn('no confirmó la permuta con docente-c', mail.outbox[0].body)
        mail.outbox.clear()
        third = self.swap(entry=later, to=self.third).json()
        with self.captureOnCommitCallbacks(execute=True):
            self.call(self.teacher, 'post', f"swaps/{third['id']}/cancel/")
        self.assertEqual(mail.outbox, [])

    def test_only_own_classes_and_only_teachers(self):
        self.assertEqual(self.swap(user=self.other_teacher, to=self.third).status_code, 404)
        self.assertEqual(self.swap(user=self.volunteer, to=self.third).status_code, 403)
        self.assertEqual(self.swap(to=self.teacher).status_code, 400)
        self.assertEqual(self.swap(to=self.volunteer).status_code, 400)
        self.assertEqual(self.call(self.teacher, 'post', 'swaps/', {'entry': self.entry, 'to_teacher': str(self.third.id), 'reason': 'x'}).status_code, 400)

    def test_cover_must_be_free(self):
        self.roster(teacher=self.other_teacher, service=Service.objects.create(name='Traslape', weekday=6, starts_at=clock(10), ends_at=clock(11)))
        self.assertEqual(self.swap().json()['detail'], 'Esa persona ya tiene una clase en ese horario.')
        self.assertFalse(Swap.objects.exists())
        self.assertEqual(self.teacher_of(self.entry), self.teacher)

    def test_exchange_hands_back_a_later_class(self):
        later = self.roster(teacher=self.other_teacher, day=self.sunday + timedelta(days=7)).json()['id']
        mine_later = self.roster(day=self.sunday + timedelta(days=14)).json()['id']
        self.assertEqual(self.swap(return_entry=mine_later).json()['detail'], 'La clase que se devuelve debe ser de quien cubre.')
        swap = self.swap(return_entry=later).json()
        self.assertEqual(swap['returnEntry']['date'], (self.sunday + timedelta(days=7)).isoformat())
        self.call(self.coordinator, 'post', f"swaps/{swap['id']}/confirm/")
        self.assertEqual((self.teacher_of(self.entry), self.teacher_of(later)), (self.other_teacher, self.teacher))

    def test_roster_changed_after_request(self):
        swap = self.swap().json()
        self.call(self.coordinator, 'patch', f'roster/{self.entry}/', {'teacher': str(self.third.id)})
        self.assertEqual(self.call(self.coordinator, 'post', f"swaps/{swap['id']}/confirm/").json()['detail'], 'El rol cambió desde que se registró la permuta.')
        self.assertEqual(Swap.objects.get(pk=swap['id']).status, 'pendiente')

    def test_cancel_and_reject(self):
        swap = self.swap().json()
        self.assertEqual(self.call(self.third, 'post', f"swaps/{swap['id']}/cancel/").status_code, 404)
        self.assertEqual(self.call(self.other_teacher, 'post', f"swaps/{swap['id']}/cancel/").json()['status'], 'cancelada')
        again = self.swap().json()
        self.assertEqual(self.call(self.coordinator, 'post', f"swaps/{again['id']}/reject/").json()['status'], 'rechazada')
        self.assertEqual(self.teacher_of(self.entry), self.teacher)

    def test_coordination_registration_applies_at_once(self):
        swap = self.swap(user=self.coordinator, to=self.third).json()
        self.assertEqual(swap['status'], 'confirmada')
        self.assertEqual(self.teacher_of(self.entry), self.third)

    def test_each_teacher_sees_only_their_swaps(self):
        self.swap()
        other = self.roster(teacher=self.third, service=self.second).json()['id']
        self.swap(user=self.third, entry=other, to=self.teacher)
        self.assertEqual(len(self.call(self.coordinator, 'get', 'swaps/').json()['results']), 2)
        self.assertEqual(len(self.call(self.teacher, 'get', 'swaps/').json()['results']), 2)
        self.assertEqual([s['fromName'] for s in self.call(self.other_teacher, 'get', 'swaps/').json()['results']], ['docente-a'])
        self.assertEqual(self.call(self.volunteer, 'get', 'swaps/').json()['results'], [])
        self.assertEqual(len(self.call(self.coordinator, 'get', 'swaps/?status=pendiente').json()['results']), 2)

    def test_options_list_teachers_and_their_classes_only(self):
        EmailIdentity.objects.create(user=self.other_teacher, email='docente-b@example.invalid', verified_at=timezone.now())
        self.roster(teacher=self.other_teacher, service=self.second)
        options = self.call(self.teacher, 'get', f'swaps/options/?teacher={self.other_teacher.id}').json()
        self.assertEqual([t['displayName'] for t in options['teachers']], ['docente-b', 'docente-c'])
        self.assertEqual([c['service'] for c in options['classes']], ['2° servicio'])
        self.assertNotIn('example.invalid', json.dumps(options))
        self.assertEqual(self.call(self.teacher, 'get', f'swaps/options/?teacher={self.volunteer.id}').status_code, 400)
        self.assertEqual(self.call(self.volunteer, 'get', 'swaps/options/').status_code, 403)


class KidsAgendaAndLessonTests(KidsBase):
    def test_agenda_shows_only_own_classes_with_lesson(self):
        self.roster()
        self.roster(teacher=self.other_teacher, service=self.second)
        lesson = {'date': self.sunday.isoformat(), 'group': str(self.group.id), 'unit': 'Unidad 3', 'title': 'Lección ficticia', 'manual_page': 12}
        self.assertEqual(self.call(self.teacher, 'post', 'lessons/', lesson).status_code, 403)
        self.assertEqual(self.call(self.coordinator, 'post', 'lessons/', lesson).status_code, 201)
        self.assertEqual(self.call(self.coordinator, 'post', 'lessons/', lesson).status_code, 400)
        agenda = self.call(self.teacher, 'get', 'agenda/').json()
        self.assertEqual(len(agenda['classes']), 1)
        self.assertEqual(agenda['classes'][0]['service'], '1er servicio')
        self.assertEqual(agenda['classes'][0]['lesson']['title'], 'Lección ficticia')
        self.assertEqual(self.call(self.volunteer, 'get', 'agenda/').json()['classes'], [])
        self.assertEqual(len(self.call(self.teacher, 'get', 'lessons/').json()['results']), 1)

    def test_lesson_delete_only_by_coordination(self):
        lesson = Lesson.objects.create(date=self.sunday, group=self.group, title='Para borrar')
        self.assertEqual(self.call(self.teacher, 'delete', f'lessons/{lesson.id}/').status_code, 403)
        self.assertEqual(self.call(self.coordinator, 'delete', f'lessons/{lesson.id}/').status_code, 204)
        self.assertTrue(AuditEvent.objects.filter(action='kids.lesson.delete', target_id=lesson.id).exists())


class KidsEventTests(KidsBase):
    def setUp(self):
        self.event = self.call(self.coordinator, 'post', 'events/', {'title': 'Evento ficticio', 'date': self.sunday.isoformat()}).json()

    def item(self, **data):
        return self.call(self.coordinator, 'post', f"events/{self.event['id']}/items/", {'kind': 'tarea', 'title': 'Preparar dinámica', **data})

    def test_assignee_accepts_then_completes(self):
        item = self.item(assignee=str(self.teacher.id)).json()
        self.assertEqual(item['status'], 'pendiente')
        self.assertEqual(self.call(self.teacher, 'post', f"items/{item['id']}/complete/").status_code, 400)
        self.assertEqual(self.call(self.other_teacher, 'post', f"items/{item['id']}/accept/").status_code, 404)
        self.assertEqual(self.call(self.teacher, 'post', f"items/{item['id']}/accept/").json()['status'], 'aceptada')
        agenda_items = self.call(self.teacher, 'get', 'agenda/').json()['items']
        self.assertEqual([(i['title'], i['eventTitle']) for i in agenda_items], [('Preparar dinámica', 'Evento ficticio')])
        self.assertEqual(self.call(self.teacher, 'post', f"items/{item['id']}/complete/").json()['status'], 'completada')
        self.assertEqual(self.call(self.teacher, 'get', 'agenda/').json()['items'], [])
        actions = set(AuditEvent.objects.filter(target_id=item['id']).values_list('action', flat=True))
        self.assertEqual(actions, {'kids.item.create', 'kids.item.aceptada', 'kids.item.completada'})

    def test_only_team_can_be_assigned(self):
        self.assertEqual(self.item(assignee=str(self.outsider.id)).status_code, 400)
        self.assertEqual(self.item(assignee=str(self.admin.id)).status_code, 400)
        self.assertEqual(self.item(assignee=str(self.volunteer.id)).status_code, 201)

    def test_materials_need_quantity_and_received_is_bounded(self):
        self.assertEqual(self.item(kind='material', title='Vasos').status_code, 400)
        material = self.item(kind='material', title='Vasos', quantity=100).json()
        self.assertEqual(self.call(self.coordinator, 'patch', f"items/{material['id']}/", {'received': 60}).json()['received'], 60)
        self.assertEqual(self.call(self.coordinator, 'patch', f"items/{material['id']}/", {'received': 101}).status_code, 400)
        task = self.item().json()
        self.assertEqual(self.call(self.coordinator, 'patch', f"items/{task['id']}/", {'received': 1}).status_code, 400)

    def test_reassigning_needs_new_acceptance(self):
        item = self.item(assignee=str(self.teacher.id)).json()
        self.call(self.teacher, 'post', f"items/{item['id']}/accept/")
        moved = self.call(self.coordinator, 'patch', f"items/{item['id']}/", {'assignee': str(self.other_teacher.id)}).json()
        self.assertEqual((moved['assigneeName'], moved['status']), ('docente-b', 'pendiente'))

    def test_teachers_cannot_manage_events(self):
        self.assertEqual(self.call(self.teacher, 'post', 'events/', {'title': 'X', 'date': self.sunday.isoformat()}).status_code, 403)
        item = self.item().json()
        self.assertEqual(self.call(self.teacher, 'patch', f"items/{item['id']}/", {'title': 'Y'}).status_code, 403)
        self.assertEqual(self.call(self.teacher, 'delete', f"items/{item['id']}/").status_code, 403)

    def test_archived_event_freezes_items(self):
        item = self.item(assignee=str(self.teacher.id)).json()
        self.call(self.coordinator, 'patch', f"events/{self.event['id']}/", {'active': False})
        self.assertEqual(self.call(self.teacher, 'post', f"items/{item['id']}/accept/").status_code, 404)
        self.assertEqual(self.item().status_code, 404)


class KidsReminderTests(KidsBase):
    def setUp(self):
        EmailIdentity.objects.create(user=self.teacher, email='docente-a@example.invalid', verified_at=timezone.now())

    def remind(self):
        from .kids import send_reminders
        with self.captureOnCommitCallbacks(execute=True):
            return send_reminders()

    def entry(self, days, teacher=None):
        day = timezone.localdate() + timedelta(days=days)
        service = Service.objects.create(name=f'Servicio {days}', weekday=day.weekday(), starts_at=clock(9), ends_at=clock(10))
        return RosterEntry.objects.create(date=day, service=service, group=self.group, teacher=teacher or self.teacher, created_by=self.coordinator)

    def test_two_days_before_once(self):
        soon = self.entry(2)
        self.entry(3)
        self.assertEqual(self.remind(), {'reminded': 1, 'without_email': 0})
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['docente-a@example.invalid'])
        self.assertIn(soon.date.strftime('%d/%m/%Y'), mail.outbox[0].body)
        self.assertIn(self.group.name, mail.outbox[0].body)
        self.assertEqual(self.remind(), {'reminded': 0, 'without_email': 0})
        self.assertEqual(len(mail.outbox), 1)

    def test_late_assignment_still_reminded_and_grouped(self):
        self.entry(0)
        self.entry(1)
        self.assertEqual(self.remind()['reminded'], 2)
        self.assertEqual(len(mail.outbox), 1)

    def test_without_email_or_profile(self):
        self.entry(2, teacher=self.other_teacher)
        self.assertEqual(self.remind(), {'reminded': 0, 'without_email': 1})
        RoleGrant.objects.filter(user=self.teacher).update(revoked_at=timezone.now())
        self.entry(2)
        self.assertEqual(self.remind()['reminded'], 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_day_in_charge_goes_in_the_same_email(self):
        entry = self.entry(2)
        DayLead.objects.create(date=entry.date, group=self.group, lead=self.teacher, created_by=self.coordinator)
        self.assertEqual(self.remind(), {'reminded': 2, 'without_email': 0})
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Encargado(a) del día', mail.outbox[0].body)
        self.assertEqual(self.remind()['reminded'], 0)

    def test_changed_entry_is_reminded_again(self):
        entry = self.entry(2)
        self.remind()
        entry.refresh_from_db()
        self.assertIsNotNone(entry.reminded_at)
        RosterEntry.objects.filter(pk=entry.pk).update(reminded_at=None)
        self.assertEqual(self.remind()['reminded'], 1)


class KidsAuditLogTests(KidsBase):
    def test_lists_only_kids_actions(self):
        self.roster()
        AuditEvent.objects.create(actor=self.admin, action='role.grant', target_id=self.teacher.id)
        actions = [e['action'] for e in self.call(self.coordinator, 'get', 'audit/').json()['results']]
        self.assertEqual(actions, ['kids.roster.create'])


class KidsRosterConcurrencyTests(TransactionTestCase):
    def test_parallel_assignments_respect_seats(self):
        import threading
        from django.db import connection
        coordinator = KidsBase.account('coordinacion-hilos', [Role.COORDINACION_KIDS])
        teachers = [KidsBase.account(f'docente-hilo-{n}', [Role.DOCENTE]) for n in range(4)]
        group = Group.objects.create(name='Grupo concurrente', teachers_per_class=2)
        service = Service.objects.create(name='Servicio concurrente', weekday=6, starts_at=clock(9), ends_at=clock(10))
        day = next_weekday(6, after=7)
        clients = [KidsBase.client_for(self, coordinator) for _ in teachers]
        codes, barrier = [], threading.Barrier(len(teachers))
        def assign(client, teacher):
            try:
                barrier.wait()
                response = client.post('/api/v1/kids/roster/', json.dumps({'date': day.isoformat(), 'service': str(service.id), 'group': str(group.id), 'teacher': str(teacher.id)}), content_type='application/json')
                codes.append(response.status_code)
            finally:
                connection.close()
        threads = [threading.Thread(target=assign, args=pair) for pair in zip(clients, teachers)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(sorted(codes), [201, 201, 400, 400])
        self.assertEqual(RosterEntry.objects.filter(group=group).count(), 2)
