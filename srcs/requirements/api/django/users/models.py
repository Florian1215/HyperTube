import random

from django.contrib.auth.models import AbstractUser, Permission
from django.db import models


class User(AbstractUser):
    COLOR_CHOICES = [
        ('yellow', 'Yellow'),
        ('pink', 'Pink'),
        ('green', 'Green'),
        ('purple', 'Purple'),
        ('blue', 'Blue'),
        ('red', 'Red')
    ]

    PREFERRED_LANGUAGE_CHOICES = [
        ('vo', 'Original version'),
        ('vf', 'French version')
    ]

    color = models.CharField(max_length=10, choices=COLOR_CHOICES, blank=True)
    profile_picture = models.URLField(null=True, blank=True)
    preferred_language = models.CharField(max_length=2, choices=PREFERRED_LANGUAGE_CHOICES, default='vo')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.color:
            self.color = random.choice([choice[0] for choice in self.COLOR_CHOICES])
        super().save(*args, **kwargs)

    @property
    def perm(self):
        """'admin', or the permissions of the user ('app_label.codename') separated by a comma."""
        if not self.is_active:
            return ''
        permissions = self.get_all_permissions()
        if self.is_superuser or len(permissions) == Permission.objects.count():
            return 'admin'
        return ','.join(sorted(permissions))

    def __str__(self):
        return self.username


class UserFollow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['follower', 'followed'], name='unique_user_follow')
        ]

    def __str__(self):
        return f'{self.follower} -> {self.followed}'


class UserHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='history')
    media = models.ForeignKey('medias.Media', on_delete=models.CASCADE, related_name='history')
    episode = models.ForeignKey('series.Episode', on_delete=models.CASCADE, related_name='history', null=True, blank=True)
    progress = models.IntegerField(default=0)
    complete = models.BooleanField(default=False)
    pourcent = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    watched_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.user} - {self.media}[{self.pourcent}%]'
