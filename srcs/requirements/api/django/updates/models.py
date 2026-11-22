from datetime import timedelta

from django.db import models
from django.utils import timezone

# how long a new update is announced on the site
ANNOUNCE_DURATION = timedelta(days=7)
LANGUAGES = [('fr', 'Français'), ('en', 'English'), ('de', 'Deutsch')]
FALLBACK_LANGUAGE = 'en'


class UpdateQuerySet(models.QuerySet):
    def announced(self):
        now = timezone.now()
        return self.filter(published_at__lte=now, published_at__gte=now - ANNOUNCE_DURATION).order_by('-published_at')


class Update(models.Model):
    version = models.CharField(max_length=50, unique=True)
    published_at = models.DateTimeField(default=timezone.now, help_text='Announced on the site for 7 days from this date.')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UpdateQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return self.version

    def get_content(self, lang):
        """The notes in the asked language, else in English, else in any language written."""
        translations = {t.lang: t.content for t in self.translations.all()}
        return translations.get(lang) or translations.get(FALLBACK_LANGUAGE) or next(iter(translations.values()), '')


class UpdateTranslation(models.Model):
    update = models.ForeignKey(Update, on_delete=models.CASCADE, related_name='translations')
    lang = models.CharField(max_length=2, choices=LANGUAGES)
    content = models.TextField(help_text='Markdown: images and GIFs can be dropped or pasted in the editor.')

    class Meta:
        constraints = [models.UniqueConstraint(fields=['update', 'lang'], name='unique_update_language')]

    def __str__(self):
        return f'{self.update} - {self.lang}'
