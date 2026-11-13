import os

from celery import Celery
from celery.signals import worker_ready


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@worker_ready.connect
def reset_interrupted_downloads(**kwargs):
    """A download still in progress at startup was cut off by a worker restart: mark it as failed so it can be requested again."""
    from torrents.models import DownloadMedia, Torrent
    from torrents.tasks import IN_PROGRESS

    error = 'Interrupted by a worker restart'
    interrupted = DownloadMedia.objects.filter(status__in=IN_PROGRESS)
    Torrent.objects.filter(downloaded__in=interrupted).update(status='error', error=error)
    count = interrupted.update(status='error', error=error)
    if count:
        print(f'{count} interrupted download(s) marked as error', flush=True)
