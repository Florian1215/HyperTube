import re
from datetime import datetime

from rest_framework.exceptions import NotFound

from config.errors import TORRENT_NOT_FOUND
from torrents.services.c411 import C411Client
from torrents.models import Torrent


def get_or_fetch_torrent(media_id, type):
    torrents = Torrent.objects.filter(media_id=media_id)
    if not torrents.exists():
        try:
            c411 = C411Client()
            torrents_data = c411.search_medias(type, media_id)
            torrents = []

            def get_language(obj):
                res = re.findall('MULTI|VFF|VF2|VF|VO|VOSTFR|FRENCH', obj['title'])
                return res[0] if res else None

            def get_quality(obj):
                res = re.findall('2160p|1080p|720p|480p', obj['title'])
                return res[0] if res else None

            def get_size(obj):
                try:
                    return int(obj['size']) / 1073741824
                except ValueError:
                    return 0

            print(torrents_data, flush=True)
            for t in torrents_data:
                torrents.append(
                    Torrent.objects.create(
                        id=t['guid'],
                        title=t['title'],
                        url=t['enclosure']['@url'],
                        size=get_size(t),
                        seeders=t['seeders'],
                        peers=t['peers'],
                        quality=get_quality(t),
                        language=get_language(t),
                        published_at=datetime.strptime(t['pubDate'], '%a, %d %b %Y %H:%M:%S %z'),
                        media_id=media_id
                    )
                )
        except Exception as e:
            print('ERROR', e, flush=True)
            raise NotFound(TORRENT_NOT_FOUND)
    return torrents
