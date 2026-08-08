from django.db import models


class Genre(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Movie(models.Model):
    tmdb_id = models.CharField(max_length=20, unique=True, primary_key=True)
    title = models.CharField(max_length=255)
    year = models.CharField(max_length=10)
    poster_url = models.URLField(blank=True, null=True)
    backdrop_url = models.URLField(blank=True, null=True)
    genres = models.ManyToManyField(Genre, related_name="movies")
    note = models.FloatField(default=0)
    runtime_minutes = models.IntegerField(default=0)
    summary = models.TextField(blank=True)
    overview = models.TextField(blank=True)
    director = models.CharField(max_length=255, blank=True)
    cast = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
