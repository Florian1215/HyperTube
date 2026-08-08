import random

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class ProfileColor(models.TextChoices):
        YELLOW = "yellow", "Yellow"
        PINK = "pink", "Pink"
        GREEN = "green", "Green"
        PURPLE = "purple", "Purple"
        BLUE = "blue", "Blue"
        RED = "red", "Red"

    color = models.CharField(max_length=10, choices=ProfileColor.choices, blank=True)
    profile_picture = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.color:
            self.color = random.choice([choice[0] for choice in self.ProfileColor.choices])

        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
