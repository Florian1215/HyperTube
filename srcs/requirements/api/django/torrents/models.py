from django.db import models

from medias.models import Media


class Torrent(models.Model):
    id = models.CharField(primary_key=True)
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='torrents')
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


class TorrentSearch(models.Model):
    """ Remembers when the torrents of a season were last searched, to avoid querying the tracker on each request. """
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='torrent_searches')
    season_number = models.IntegerField()
    searched_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['media', 'season_number'],
                name='unique_torrent_search',
            )
        ]

    def __str__(self):
        return f'{self.media.original_title} - S{self.season_number}'


class DownloadMedia(models.Model):
    id = models.CharField(primary_key=True)
    torrent = models.ForeignKey(Torrent, on_delete=models.CASCADE, related_name='downloaded')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.id} - {self.torrent.title}'
