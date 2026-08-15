import requests

from django.conf import settings


class TMDBService:
    DEFAULT_LANGUAGE = 'en'
    LANGUAGES_CODE = {
        'en': 'en-US',
        'de': 'de-DE',
        'fr': 'fr-FR'
    }

    def __init__(self, language):
        self.headers = {
            'Authorization': f'Bearer {settings.TMDB_API_KEY}',
            'accept': 'application/json',
        }
        self.lang2 = language
        if not self.lang2:
            self.lang2 = self.DEFAULT_LANGUAGE
        self.lang4 = self.LANGUAGES_CODE.get(self.lang2)

    def search_movies(self, query, page=1):
        params = {
            'language': self.lang4,
            'page': page,
        }

        if query == 'popular':
            endpoint = 'movie/popular'
        elif query == 'top_rated':
            endpoint = 'movie/top_rated'
        else:
            params['query'] = query
            endpoint = 'search/movie'

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/{endpoint}',
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    def get_movie(self, tmdb_id, get_credits=True):
        params = {
            'language': self.lang4
        }
        if get_credits:
            params['append_to_response'] = 'credits'

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/movie/{tmdb_id}',
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    def get_images_movie(self, tmdb_id):
        params = {
            'include_image_language': 'null'
        }

        response = requests.get(
            f'{settings.TMDB_BASE_URL}/movie/{tmdb_id}/images',
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()
