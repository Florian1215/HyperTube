from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from config.settings import PER_PAGE


class TMDBPagination(PageNumberPagination):
    page_query_param = 'page'

    def paginate_queryset(self, queryset, request, view=None):
        self.request = request
        req = view.tmdb_request

        self.page = req['page']
        self.total_pages = req['total_pages']
        if req['total_results'] > 200:
            self.total_count = 200
        else:
            self.total_count = req['total_results']
        self.results = req['results']
        return self.results

    def get_paginated_response(self, data):
        return Response({
            'count': self.total_count,
            'page': self.page,
            'per_page': PER_PAGE,
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
