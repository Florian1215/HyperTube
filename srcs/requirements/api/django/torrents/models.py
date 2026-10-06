import shutil

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone

from medias.models import Media


class Torrent(models.Model):
    id = models.CharField(primary_key=True)
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='torrents')
    season_number = models.IntegerField(default=None, null=True)
    episode_number = models.IntegerField(default=None, null=True)
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
    ]

    magnet = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not-downloaded')
    progress = models.FloatField(default=0)
    output_file = models.CharField(max_length=1000, blank=True, null=True)
    error = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.title

    @property
    def is_season_pack(self):
        return self.season_number is not None and self.episode_number is None

    def get_stream_id(self, episode_number=None):
        if self.is_season_pack:
            return f'{self.id}/e{episode_number}'
        return self.id


class DownloadMedia(models.Model):
    id = models.CharField(primary_key=True)  # stream id, see Torrent.get_stream_id
    torrent = models.ForeignKey(Torrent, on_delete=models.CASCADE, related_name='downloaded')
    language = models.CharField(max_length=2, default='')
    status = models.CharField(max_length=20, choices=Torrent.STATUS_CHOICES, default='downloading')
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_watched_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.torrent.title


@receiver(post_delete, sender=DownloadMedia)
def delete_download_files(sender, instance, **kwargs):
    stream_dir = settings.STREAM_DIR / instance.id
    shutil.rmtree(stream_dir, ignore_errors=True)
    if instance.id != instance.torrent_id:
        try:
            stream_dir.parent.rmdir()
        except OSError:
            pass
    if not DownloadMedia.objects.filter(torrent_id=instance.torrent_id).exists():
        shutil.rmtree(settings.TORRENT_DIR / instance.torrent_id, ignore_errors=True)
        Torrent.objects.filter(id=instance.torrent_id).update(status='not-downloaded', progress=0, error=None)
