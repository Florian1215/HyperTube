from typing import Literal

import requests

from django.conf import settings


class TMDBService:
    DEFAULT_LANGUAGE = 'en'
    LANGUAGES_CODE = {
        'en': 'en-US',
        'de': 'de-DE',
        'fr': 'fr-FR'
    }

    # Talk, News, Reality
    EXCLUDED_TV_GENRES = [10767, 10763, 10764]

    def __init__(self, language):
        self.headers = {
            'Authorization': f'Bearer {settings.TMDB_API_KEY}',
            'accept': 'application/json',
        }
        self.lang2 = language
        if not self.lang2:
            self.lang2 = self.DEFAULT_LANGUAGE
        self.lang4 = self.LANGUAGES_CODE.get(self.lang2)

    @staticmethod
    def get_type(type: Literal['movies', 'series']):
        if type == 'series':
            return 'tv'
        return 'movie'

    @staticmethod
    def format_serie(media_data):
        media_data['title'] = media_data['name']
        media_data['original_title'] = media_data['original_name']
        media_data['release_date'] = media_data['first_air_date']
        return media_data

    def search_medias(self, type, query, page=1):
        type = TMDBService.get_type(type)
        params = {
            'language': self.lang4,
            'page': page,
        }

        if query == 'popular' and type == 'tv':
            endpoint = 'discover/tv'
            params['sort_by'] = 'popularity.desc'
            params['without_genres'] = ','.join(str(genre) for genre in self.EXCLUDED_TV_GENRES)
        elif query == 'popular':
            endpoint = f'{type}/popular'
        elif query == 'top_rated':
            endpoint = f'{type}/top_rated'
        else:
            params['query'] = query
            endpoint = f'search/{type}'

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/{endpoint}',
            headers=self.headers,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        res = response.json()
        if type == 'tv':
            for media_data in res['results']:
                TMDBService.format_serie(media_data)
        return res

    def get_media(self, type, tmdb_id, get_credits=True):
        type = TMDBService.get_type(type)
        params = {
            'language': self.lang4
        }
        if get_credits:
            params['append_to_response'] = 'credits'

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/{type}/{tmdb_id}',
            headers=self.headers,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        res = response.json()
        if type == 'tv':
            TMDBService.format_serie(res)
        return res

    def get_images_media(self, type, tmdb_id):
        type = TMDBService.get_type(type)
        params = {
            'include_image_language': 'null'
        }

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/{type}/{tmdb_id}/images',
            headers=self.headers,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def get_season(self, tmdb_id, season_number, get_images=True):
        params = {
            'language': self.lang4,
            'include_image_language': 'null'
        }
        if get_images:
            params['append_to_response'] = 'images'

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/tv/{tmdb_id}/season/{season_number}',
            headers=self.headers,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def get_collection(self, collection_id):
        response = requests.get(
            f'{settings.TMDB_BASE_URL}/collection/{collection_id}',
            headers=self.headers,
            params={'language': self.lang4},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
