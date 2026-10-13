from django.db import models

from medias.models import Media
from users.models import User


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.edited and self.pk:
            old = Comment.objects.get(pk=self.pk)
            if old.content != self.content:
                self.edited = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.username} - {self.media.original_title}'
