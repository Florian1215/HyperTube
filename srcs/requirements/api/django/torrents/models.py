from django.db import models

from movies.models import Movie


class Torrent(models.Model):
    id = models.CharField(primary_key=True)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='torrents')
    title = models.CharField()
    url = models.URLField()
    size = models.IntegerField()
    seeders = models.IntegerField()
    peers = models.IntegerField()
    quality = models.CharField()
    language = models.CharField()
    published_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    STATUS_CHOICES = [
        ('not-downloaded', 'Not downloaded'),
        ('downloading', 'Downloading'),
        ('transcoding', 'Transcoding'),
        ('completed', 'Completed'),
        ('error', 'Error'),
        ('cancelled', 'Cancelled')
    ]

    magnet = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not-downloaded')
    progress = models.FloatField(default=0)
    output_file = models.CharField(max_length=1000, blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    cancel_requested = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.id} - {self.title}'


class DownloadMovie(models.Model):
    id = models.CharField(primary_key=True)
    torrent = models.ForeignKey(Torrent, on_delete=models.CASCADE, related_name='downloaded')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.id} - {self.torrent.title}'
