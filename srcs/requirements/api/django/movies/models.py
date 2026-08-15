from django.db import models


# belongs_to_collection todo handle
class Cast(models.Model):
    movie = models.ForeignKey('movies.Movie', on_delete=models.CASCADE, related_name='cast')
    cast_id = models.IntegerField()
    name = models.CharField()
    picture = models.URLField()
    character = models.CharField(default=None, null=True)

    def __str__(self):
        return self.name


class Crew(models.Model):
    movie = models.ForeignKey('movies.Movie', on_delete=models.CASCADE, related_name='crew')
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
    movie = models.ForeignKey('movies.Movie', on_delete=models.CASCADE, related_name='backdrops_url')

    def __str__(self):
        return self.url


class Movie(models.Model):
    original_title = models.CharField()
    year = models.CharField(max_length=4)
    poster_url = models.URLField()
    backdrop_url = models.URLField()
    note = models.FloatField()
    vote_count = models.IntegerField()
    runtime = models.IntegerField()
    status = models.CharField()
    release_date = models.CharField()
    genres = models.ManyToManyField(Genre, related_name='movies', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    feature = models.BooleanField(default=False)
    feature_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        permissions = [
            ('can_recommend_movie', 'Can recommend movies'),
        ]

    def __str__(self):
        return f'{self.original_title} - {self.year}'


class MovieLanguage(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='languages')
    title = models.CharField()
    summary = models.CharField()
    lang = models.CharField(max_length=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['movie', 'lang'],
                name='unique_movie_language',
            )
        ]

    def __str__(self):
        return f'{self.title} - {self.lang}'
