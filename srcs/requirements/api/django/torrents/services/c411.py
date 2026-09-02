import requests
import xmltodict
from rest_framework.exceptions import NotFound

from config.errors import MOVIE_NOT_FOUND
from config.settings import C411_BASE_URL, C411_API_KEY


class C411Client:
    @staticmethod
    def search_movies(tmdbId):
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
        raise NotFound(MOVIE_NOT_FOUND)
