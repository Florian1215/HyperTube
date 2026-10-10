from django.db import models


class Cast(models.Model):
    media = models.ForeignKey('medias.Media', on_delete=models.CASCADE, related_name='cast')
    cast_id = models.IntegerField()
    name = models.CharField()
    picture = models.URLField()
    character = models.CharField(default=None, null=True)

    def __str__(self):
        return self.name


class Crew(models.Model):
    media = models.ForeignKey('medias.Media', on_delete=models.CASCADE, related_name='crew')
    crew_id = models.IntegerField()
    name = models.CharField()
    picture = models.URLField()
    job = models.CharField(default=None, null=True)

    def __str__(self):
        return self.name


class Genre(models.Model):
    genre_id = models.IntegerField()

    def __str__(self):
        return f'Genre: {self.genre_id}'


class BackdropUrl(models.Model):
    url = models.URLField()
    media = models.ForeignKey('medias.Media', on_delete=models.CASCADE, related_name='backdrops_url')

    def __str__(self):
        return self.url


class Media(models.Model):
    MEDIA_TYPE_CHOICE = (
        ('movie', 'Movie'),
        ('series', 'Series'),
    )

    tmdb_id = models.IntegerField()
    original_title = models.CharField()
    year = models.CharField(max_length=4)
    poster_url = models.URLField()
    backdrop_url = models.URLField()
    original_language = models.CharField(max_length=2)
    rating = models.FloatField()
    vote_count = models.IntegerField()
    status = models.CharField()
    release_date = models.CharField()
    genres = models.ManyToManyField(Genre, related_name='medias', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    feature = models.BooleanField(default=False)
    feature_at = models.DateTimeField(null=True, blank=True)
    fetched_at = models.DateTimeField(null=True, blank=True)
    backdrop_custom = models.BooleanField(default=False)
    type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICE)

    budget = models.BigIntegerField(default=None, null=True)
    revenue = models.BigIntegerField(default=None, null=True)
    production_countries = models.JSONField(default=list, blank=True)
    production_companies = models.JSONField(default=list, blank=True)

    runtime = models.IntegerField(default=None, null=True)
    collection_id = models.IntegerField(default=None, null=True)

    in_production = models.BooleanField(default=None, null=True)
    end_date = models.CharField(default=None, null=True)
    number_of_seasons = models.IntegerField(default=None, null=True)
    number_of_episodes = models.IntegerField(default=None, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['tmdb_id', 'type'],
                name='unique_media',
            )
        ]
        permissions = [
            ('can_recommend_medias', 'Can recommend movies or series'),
        ]

    def __str__(self):
        return f'{self.original_title} - {self.year}'


class MediaLanguage(models.Model):
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='languages')
    title = models.CharField()
    summary = models.CharField()
    lang = models.CharField(max_length=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['media', 'lang'],
                name='unique_media_language',
            )
        ]

    def __str__(self):
        return f'{self.title} - {self.lang}'
