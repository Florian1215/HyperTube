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
    name = models.CharField()

    def __str__(self):
        return self.name


class Movie(models.Model):
    title = models.CharField()
    original_title = models.CharField()
    year = models.CharField(max_length=4)
    poster_url = models.URLField()
    backdrop_url = models.URLField()
    note = models.FloatField()
    vote_count = models.IntegerField()
    runtime = models.IntegerField()
    summary = models.CharField()
    status = models.CharField()
    genres = models.ManyToManyField(Genre, related_name="movies", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.title} - {self.year}'
