from typing import Literal

import requests
import xmltodict
from rest_framework.exceptions import NotFound

from config.errors import MEDIA_NOT_FOUND
from config.settings import C411_BASE_URL, C411_API_KEY


class C411Client:
    @staticmethod
    def search_medias(type: Literal['movie', 'tv'], tmdbId, seasonNumber=None):
        url = f'{C411_BASE_URL}/torznab?'
        params = {
            't': 'movie' if seasonNumber is None else 'tvsearch',
            'apikey': C411_API_KEY,
            'tmdbid': tmdbId,
        }
        if seasonNumber is not None:
            params['season'] = seasonNumber
        response = requests.get(url, params=params, headers={'Accept': 'application/json'})
        response.raise_for_status()
        data = xmltodict.parse(response.text)
        print('RES', data, flush=True)
        if 'item' in data['rss']['channel']:
            items = data['rss']['channel']['item']
            if isinstance(items, dict):
                items = [items]
            for obj in items:
                for i in obj['torznab:attr']:
                    obj[i['@name']] = i['@value']
            return items
        raise NotFound(MEDIA_NOT_FOUND.format(type=type))
