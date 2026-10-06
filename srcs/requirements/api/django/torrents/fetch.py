import re
from datetime import date, datetime

from rest_framework.exceptions import NotFound, ValidationError

from config.errors import TORRENT_NOT_FOUND, MEDIA_NOT_FOUND
from medias.fetch import get_or_fetch_media
from series.fetch import get_or_fetch_season
from torrents.services.c411 import C411Client
from torrents.models import Torrent

SEASON_EPISODE_RE = re.compile(r'(?<![A-Za-z0-9])(?:S|Saison[ .]?)(\d{1,2})(?:[ .]?E(\d{1,3})|(?!\d))', re.IGNORECASE)


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
    torrents = Torrent.objects.filter(media=media)
    if type == 'series':
        season_number = to_int(season_number)
        season = get_or_fetch_season(request, media, season_number)
        if episode_number is not None:
            episode_number = to_int(episode_number)
            episode = season.episodes.filter(episode_number=episode_number).first()
            if episode is None:
                raise NotFound(MEDIA_NOT_FOUND.format(type='episode'))
            # not released yet: a season torrent found at this point can't contain it
            if episode.release_date and episode.release_date > date.today().isoformat():
                return []
        torrents = torrents.filter(season_number=season_number)
    else:
        season_number = None
    if not torrents.exists():
        try:
            c411 = C411Client()
            torrents_data = c411.search_medias(type, media_id, season_number)
            for t in torrents_data:
                torrent_episode = None
                if type == 'series':
                    torrent_season, torrent_episode = get_season_episode(t['title'])
                    if torrent_season != season_number:
                        continue
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
        except Exception as e:
            # todo refaire erreur en fonction de l'erreur
            print('ERROR', e, flush=True)
            raise NotFound(TORRENT_NOT_FOUND)
    if type == 'series':
        return [t for t in torrents if t.episode_number is None or t.episode_number == episode_number]
    return torrents
