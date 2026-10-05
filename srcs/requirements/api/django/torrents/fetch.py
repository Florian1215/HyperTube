import re
from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework.exceptions import NotFound

from config.errors import TORRENT_NOT_FOUND
from medias.fetch import get_or_fetch_media
from torrents.parsing import EPISODE_MATCH, match_episode
from torrents.services.c411 import C411Client
from torrents.models import Torrent

# a season without torrent for the requested episode is searched again after this delay (new episodes get released)
SEARCH_VALIDITY = timedelta(hours=1)


def fetch_torrents(media, season_number=None):
    c411 = C411Client()
    torrents_data = c411.search_medias(media.type, media.tmdb_id, season_number)

    def get_language(obj):
        res = re.findall('MULTI|TRUEFRENCH|FRENCH|VOSTFR|VFF|VF2|VF|VO', obj['title'])
        return res[0] if res else ''

    def get_quality(obj):
        res = re.findall('2160p|1080p|720p|480p', obj['title'])
        return res[0] if res else ''

    def get_size(obj):
        try:
            return int(obj['size']) / 1073741824
        except ValueError:
            return 0

    print(torrents_data, flush=True)
    for t in torrents_data:
        # a torrent already known keeps its download state
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
                'media': media
            }
        )


def get_episode_torrents(media, season_number, episode_number):
    """
    Torrents to stream an episode, the most precise ones only:
    the torrents of the episode alone, else the packs of its season, else the packs of the whole series.
    """
    matches = {}
    for torrent in media.torrents.order_by('-seeders'):
        match = match_episode(torrent.title, season_number, episode_number)
        if match is not None:
            matches.setdefault(match, []).append(torrent)
    return matches[min(matches)] if matches else []


def search_season_torrents(media, season_number):
    search = media.torrent_searches.filter(season_number=season_number).first()
    if search is not None and search.searched_at > timezone.now() - SEARCH_VALIDITY:
        return
    try:
        fetch_torrents(media, season_number)
    except NotFound:
        pass
    media.torrent_searches.update_or_create(season_number=season_number, defaults={'searched_at': timezone.now()})


def get_or_fetch_torrent(request, media_id, type, season_number=None, episode_number=None):
    media = get_or_fetch_media(request, media_id, type)
    try:
        if media.type != 'series':
            if not media.torrents.exists():
                fetch_torrents(media)
            torrents = media.torrents.order_by('-seeders')
        else:
            torrents = get_episode_torrents(media, season_number, episode_number)
            if not torrents or match_episode(torrents[0].title, season_number, episode_number) != EPISODE_MATCH:
                search_season_torrents(media, season_number)
                torrents = get_episode_torrents(media, season_number, episode_number)
    except Exception as e:
        print('ERROR', e, flush=True)
        raise NotFound(TORRENT_NOT_FOUND)
    if not torrents:
        raise NotFound(TORRENT_NOT_FOUND)
    return torrents
