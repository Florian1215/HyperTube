from typing import Literal

import requests
import xmltodict
from rest_framework.exceptions import NotFound

from config.errors import MEDIA_NOT_FOUND
from config.settings import C411_BASE_URL, C411_API_KEY


class C411Client:
    @staticmethod
    def search_medias(type: Literal['movie', 'tv'], tmdbId):
        # todo handle serach type
        url = f'{C411_BASE_URL}/torznab?'
        params = {
            't': 'movie',
            'apikey': C411_API_KEY,
            'tmdbid': tmdbId,
        }
        response = requests.get(url, params=params, headers={'Accept': 'application/json'})
        response.raise_for_status()
        data = xmltodict.parse(response.text)

        if 'item' in data['rss']['channel']:
            for obj in data['rss']['channel']['item']:
                for i in obj['torznab:attr']:
                    obj[i['@name']] = i['@value']
            return data['rss']['channel']['item']
        raise NotFound(MEDIA_NOT_FOUND.format(type=type))
