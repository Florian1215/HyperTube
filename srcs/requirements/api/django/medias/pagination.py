import math

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from config.settings import PER_PAGE
from medias.services.tmdb import TMDBService

TMDB_PER_PAGE = TMDBService.PER_PAGE


class TMDBPagination(PageNumberPagination):
    page_query_param = 'page'
    MAX_COUNT = PER_PAGE * 11

    def paginate_queryset(self, queryset, request, view=None):
        self.request = request
        req = view.tmdb_request

        self.page = req['page']
        self.per_page = req['per_page']
        self.total_pages = req['total_pages']
        self.total_count = min(req['total_results'], self.MAX_COUNT)
        self.results = req['results']
        return self.results

    def get_paginated_response(self, data):
        return Response({
            'count': self.total_count,
            'page': self.page,
            'per_page': self.per_page,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })

    def get_next_link(self):
        return self._replace_page(self.page + 1) if self.page < self.total_pages else None

    def get_previous_link(self):
        return self._replace_page(self.page - 1) if self.page > 1 else None

    def _replace_page(self, page):
        url = self.request.build_absolute_uri()
        query_params = self.request.query_params.copy()
        query_params[self.page_query_param] = page

        return f'{url.split('?')[0]}?{query_params.urlencode()}'


def fetch_tmdb_page(fetch, page, per_page=PER_PAGE):
    start = (max(page, 1) - 1) * per_page
    first_page = start // TMDB_PER_PAGE + 1
    res = fetch(first_page)
    results = res['results']
    if start + per_page > first_page * TMDB_PER_PAGE and first_page < res['total_pages']:
        results = results + fetch(first_page + 1)['results']
    offset = start - (first_page - 1) * TMDB_PER_PAGE
    return {
        'results': results[offset:offset + per_page],
        'page': page,
        'per_page': per_page,
        'total_pages': math.ceil(min(res['total_results'], TMDBPagination.MAX_COUNT) / per_page),
        'total_results': res['total_results'],
    }
