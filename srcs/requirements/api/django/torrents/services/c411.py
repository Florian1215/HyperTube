import requests
import xmltodict
from rest_framework.exceptions import NotFound

from config.errors import TORRENT_NOT_FOUND
from config.settings import C411_BASE_URL, C411_API_KEY


class C411Client:
    # the maximum C411 accepts
    PAGE_SIZE = 100
    MAX_PAGES = 5

    @staticmethod
    def search_medias(tmdbId, seasonNumber=None):
        url = f'{C411_BASE_URL}/torznab?'
        params = {
            't': 'movie' if seasonNumber is None else 'tvsearch',
            'apikey': C411_API_KEY,
            'tmdbid': tmdbId,
        }
        if seasonNumber is not None:
            params['season'] = seasonNumber
        # C411 gives 25 results by default, in no useful order: every page is needed to get the last episodes
        params['limit'] = C411Client.PAGE_SIZE
        res = []
        for page in range(C411Client.MAX_PAGES):
            params['offset'] = page * C411Client.PAGE_SIZE
            response = requests.get(url, params=params, headers={'Accept': 'application/json'}, timeout=30)
            response.raise_for_status()
            data = xmltodict.parse(response.text)
            items = (data['rss']['channel'] or {}).get('item', [])
            if isinstance(items, dict):
                items = [items]
            for obj in items:
                for i in obj['torznab:attr']:
                    obj[i['@name']] = i['@value']
            res += items
            if len(items) < C411Client.PAGE_SIZE:
                break
        if not res:
            raise NotFound(TORRENT_NOT_FOUND)
        return res
