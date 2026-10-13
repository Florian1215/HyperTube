import logging
import shutil
from datetime import timedelta

from django.utils import timezone

from config.errors import NOT_ENOUGH_DISK_SPACE
from config.exceptions import InsufficientStorage
from config.settings import DATA_DIR
from torrents.models import DownloadMedia

logger = logging.getLogger(__name__)

GB = 1024 ** 3
SIZE_FACTOR = 2
FREE_MARGIN = 5 * GB
WATCHING_DELAY = timedelta(hours=4)


def get_download_size(torrent, episode_number=None):
    size = torrent.size * GB
    if torrent.is_season_pack and episode_number is not None:
        season = torrent.media.seasons.filter(season_number=torrent.season_number).first()
        episodes = season.episodes.count() if season else 0
        if episodes:
            size /= episodes
    return size


def get_free_space():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return shutil.disk_usage(DATA_DIR).free


def ensure_disk_space(torrent, episode_number=None):
    needed = get_download_size(torrent, episode_number) * SIZE_FACTOR + FREE_MARGIN
    if get_free_space() >= needed:
        return
    deletable = DownloadMedia.objects.filter(
        status='completed', last_watched_at__lt=timezone.now() - WATCHING_DELAY
    ).order_by('last_watched_at')
    for download in deletable:
        logger.warning('Download %s: deleted to make room', download.id)
        download.delete()
        if get_free_space() >= needed:
            return
    raise InsufficientStorage(NOT_ENOUGH_DISK_SPACE)
