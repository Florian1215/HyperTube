from typing import Literal

import requests
import xmltodict
from rest_framework.exceptions import NotFound

from config.errors import MEDIA_NOT_FOUND
from config.settings import C411_BASE_URL, C411_API_KEY


class C411Client:
    @staticmethod
    def search_medias(type: Literal['movies', 'series'], tmdbId, season_number=None):
        url = f'{C411_BASE_URL}/torznab?'
        params = {
            't': 'tvsearch' if type == 'series' else 'movie',
            'apikey': C411_API_KEY,
            'tmdbid': tmdbId,
            'limit': 100,
        }
        if season_number is not None:
            params['season'] = season_number
        response = requests.get(url, params=params, headers={'Accept': 'application/json'})
        response.raise_for_status()
        data = xmltodict.parse(response.text)

        if 'item' in data['rss']['channel']:
            items = data['rss']['channel']['item']
            # xmltodict gives a dict instead of a list when there is a single result
            if isinstance(items, dict):
                items = [items]
            for obj in items:
                for i in obj['torznab:attr']:
                    obj[i['@name']] = i['@value']
            return items
        raise NotFound(MEDIA_NOT_FOUND.format(type=type))
