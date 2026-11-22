import logging
import re
import unicodedata
from datetime import date, datetime

from rest_framework.exceptions import NotFound, ValidationError

from config.errors import TORRENT_NOT_FOUND, MEDIA_NOT_FOUND
from config.exceptions import external_service
from medias.fetch import get_or_fetch_media
from series.fetch import get_or_fetch_season
from torrents.services.c411 import C411Client
from torrents.models import FileDeletionError, Torrent

logger = logging.getLogger(__name__)

SEASON_EPISODE_RE = re.compile(r'(?<![A-Za-z0-9])(?:S|Saison[ .]?)(\d{1,2})(?:[ .]?E(\d{1,3})|(?!\d))', re.IGNORECASE)
SEASON_RANGE_RE = re.compile(r'(?<![A-Za-z0-9])S(\d{1,2})[ ._]?(?:-|à|a|to)[ ._]?S?(\d{1,2})(?!\d)', re.IGNORECASE)
COMPLETE_RE = re.compile(r'(?<![A-Za-z])(?:INT[EÉ]GRALE?|COMPLETE)(?![A-Za-z])', re.IGNORECASE)


def normalize(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()


def is_complete_pack(media, title):
    """A torrent of the whole series: 'INTEGRALE' / 'COMPLETE', or a season range covering every season.
    The search without season also returns unrelated torrents: the title has to start with the series name."""
    name = normalize(title)
    titles = {normalize(t) for t in [media.original_title, *media.languages.values_list('title', flat=True)] if t}
    if not any(t and name.startswith(t) for t in titles):
        return False
    seasons = SEASON_RANGE_RE.search(title)
    if seasons:
        return int(seasons.group(1)) <= 1 and int(seasons.group(2)) >= (media.number_of_seasons or 0)
    return COMPLETE_RE.search(title) is not None and SEASON_EPISODE_RE.search(title) is None


def get_season_episode(title):
    res = SEASON_EPISODE_RE.search(title)
    if res is None:
        return None, None
    return int(res.group(1)), int(res.group(2)) if res.group(2) else None


def get_language(obj):
    res = re.findall('MULTI|VOSTFR|VFF|VF2|VF|VO|FRENCH', obj['title'], re.IGNORECASE)
    return res[0].upper() if res else ''


def get_quality(obj):
    res = re.findall('2160p|1080p|720p|480p', obj['title'], re.IGNORECASE)
    return res[0].lower() if res else ''


def get_size(obj):
    try:
        return int(obj['size']) / 1073741824
    except ValueError:
        return 0


def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError()


def get_or_fetch_torrent(request, media_id, type, season_number=None, episode_number=None):
    media = get_or_fetch_media(request, media_id, type)
    if type != 'series':
        if media.release_date and media.release_date > date.today().isoformat():
            return []
        torrents = Torrent.objects.filter(media=media)
        if not torrents.exists():
            fetch_torrents(media)
        return list(torrents.all())

    season_number = to_int(season_number)
    season = get_or_fetch_season(request, media, season_number)
    release_date = season.release_date
    if episode_number is not None:
        episode_number = to_int(episode_number)
        episode = season.episodes.filter(episode_number=episode_number).first()
        if episode is None:
            raise NotFound(MEDIA_NOT_FOUND.format(type='episode'))
        release_date = episode.release_date
    # not released yet: a torrent found at this point can't contain it
    if release_date and release_date > date.today().isoformat():
        return []

    def get_season_torrents():
        """The episode's own torrents and the ones of the whole season."""
        return [t for t in Torrent.objects.filter(media=media, season_number=season_number)
                if t.episode_number is None or t.episode_number == episode_number]

    def get_complete_torrents():
        """The torrents of the whole series, published after the release: the older ones can't contain it."""
        torrents = Torrent.objects.filter(media=media, season_number=None)
        if release_date:
            torrents = torrents.filter(published_at__date__gte=release_date)
        return list(torrents)

    # the episode or its season first, the whole series only when neither is found
    torrents = get_season_torrents()
    if torrents:
        return torrents
    try:
        fetch_torrents(media, season_number)
    except NotFound:
        pass
    torrents = get_season_torrents() or get_complete_torrents()
    if torrents:
        return torrents
    fetch_torrents(media)
    return get_complete_torrents()


KEPT_STATUSES = ['downloading', 'transcoding', 'completed']


def fetch_torrents(media, season_number=None):
    """The torrents of a movie, of a season, or of the whole series when no season is given."""
    is_series = media.type == 'series'
    with external_service('C411', TORRENT_NOT_FOUND):
        torrents_data = C411Client.search_medias(media.tmdb_id, season_number, tv=is_series)
    found = []
    for t in torrents_data:
        torrent_episode = None
        if is_series and season_number is None:
            if not is_complete_pack(media, t['title']):
                continue
        elif is_series:
            torrent_season, torrent_episode = get_season_episode(t['title'])
            if torrent_season != season_number:
                continue
        found.append(t['guid'])
        with external_service('C411', TORRENT_NOT_FOUND):
            Torrent.objects.update_or_create(
                id=t['guid'],
                defaults={
                    'title': t['title'],
                    'url': t['enclosure']['@url'],
                    'size': get_size(t),
                    'seeders': t['seeders'],
                    'peers': t['peers'],
                    'quality': get_quality(t),
                    'language': get_language(t),
                    'published_at': datetime.strptime(t['pubDate'], '%a, %d %b %Y %H:%M:%S %z'),
                    'media': media,
                    'season_number': season_number,
                    'episode_number': torrent_episode,
                }
            )
    stale = Torrent.objects.filter(media=media, season_number=season_number).exclude(id__in=found).exclude(status__in=KEPT_STATUSES)
    for torrent in stale:
        try:
            torrent.delete()
        except FileDeletionError as exc:
            logger.error('Torrent %s: %s', torrent.id, exc)
