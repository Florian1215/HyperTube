import requests

from django.conf import settings


class ListResponse:
    def __init__(self, data):
        self.data = data
        self.page: int = data.get('page', 1)
        self.total_pages: int = data.get('total_pages', 1)
        self.total_results: int = data.get('total_results', 0)
        self.results: list[Movie] = [Movie(i) for i in data.get('results', [])]


class Movie:
    def __init__(self, obj):
        self.id: str = str(obj.get('id'))
        self.adult: bool = obj.get('adult')
        self.backdrop_path: str = obj.get('backdrop_path')
        self.genre_ids: list[int] = obj.get('genre_ids')
        self.title: str = obj.get('title')
        self.original_language: str = obj.get('original_language')
        self.original_title: str = obj.get('original_title')
        self.overview: str = obj.get('overview')
        self.popularity: float = obj.get('popularity')
        self.poster_path: str = obj.get('poster_path')
        self.release_date: str = obj.get('release_date')
        self.softcore: bool = obj.get('softcore')
        self.video: bool = obj.get('video')
        self.vote_average: float = obj.get('vote_average')
        self.vote_count: float = obj.get('vote_count')


class TMDBClient:
    @staticmethod
    def search_movies(query) -> ListResponse:
        headers = {
            'Authorization': f'Bearer {settings.TMDB_API_KEY}',
            'accept': 'application/json'
        }

        params = {
            'query': query,
            'language': 'fr-FR'
        }

        r = requests.get(
            f'{settings.TMDB_BASE_URL}/search/movie',
            headers=headers,
            params=params
        )

        r.raise_for_status()
        return ListResponse(r.json())


tmdb_client = TMDBClient()
