import requests
import xmltodict
from rest_framework.exceptions import NotFound

from config.errors import TORRENT_NOT_FOUND
from config.settings import C411_BASE_URL, C411_API_KEY


class C411Client:
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
        response = requests.get(url, params=params, headers={'Accept': 'application/json'}, timeout=30)
        response.raise_for_status()
        data = xmltodict.parse(response.text)
        channel = data['rss']['channel'] or {}
        if 'item' in channel:
            items = channel['item']
            if isinstance(items, dict):
                items = [items]
            for obj in items:
                for i in obj['torznab:attr']:
                    obj[i['@name']] = i['@value']
            return items
        raise NotFound(TORRENT_NOT_FOUND)
