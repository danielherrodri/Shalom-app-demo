import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)


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


class Group(Identified):
    name = models.CharField(max_length=80)
    active = models.BooleanField(default=True)


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
