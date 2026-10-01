from django.db import models

from medias.models import Media


class Season(models.Model):
    serie = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='seasons')
    season_number = models.IntegerField()
    rating = models.FloatField()
    release_date = models.CharField()
    poster_url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['season_number']
        constraints = [
            models.UniqueConstraint(
                fields=['serie', 'season_number'],
                name='unique_serie_season',
            )
        ]

    def __str__(self):
        return f'{self.serie.original_title} - S{self.season_number}'


class SeasonLanguage(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='languages')
    name = models.CharField()
    overview = models.CharField()
    lang = models.CharField(max_length=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['season', 'lang'],
                name='unique_season_language',
            )
        ]

    def __str__(self):
        return f'{self.name} - {self.lang}'


class Episode(models.Model):
    serie = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='episodes')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='episodes')
    episode_number = models.IntegerField()
    episode_type = models.CharField(max_length=255)
    runtime = models.IntegerField()
    rating = models.FloatField()
    release_date = models.CharField(blank=True)
    poster_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['episode_number']
        constraints = [
            models.UniqueConstraint(
                fields=['season', 'episode_number'],
                name='unique_episode_season',
            )
        ]

    def __str__(self):
        return f'{self.serie.original_title} - S{self.season.season_number} - {self.episode_number}'


class EpisodeLanguage(models.Model):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, related_name='languages')
    name = models.CharField()
    overview = models.CharField()
    lang = models.CharField(max_length=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['episode', 'lang'],
                name='unique_episode_language',
            )
        ]

    def __str__(self):
        return f'{self.name} - {self.lang}'
