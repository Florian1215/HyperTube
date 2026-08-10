import requests

from django.conf import settings


class TMDBService:
    DEFAULT_LANGUAGE = 'en-US'
    LANGUAGES_CODE = {
        'en': DEFAULT_LANGUAGE,
        'de': 'de-DE',
        'fr': 'fr-FR'
    }

    def __init__(self):
        self.headers = {
            'Authorization': f'Bearer {settings.TMDB_API_KEY}',
            'accept': 'application/json',
        }

    def search_movies(self, query, lang, page=1):
        params = {
            'query': query,
            'language': self.LANGUAGES_CODE.get(lang, self.DEFAULT_LANGUAGE),
            'page': page,
        }

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/search/movie',
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    def get_movie(self, tmdb_id, lang):
        params = {
            'language': self.LANGUAGES_CODE.get(lang, self.DEFAULT_LANGUAGE)
        }

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/movie/{tmdb_id}?append_to_response=credits',
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()
