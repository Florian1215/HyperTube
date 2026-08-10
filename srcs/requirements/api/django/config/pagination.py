from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from config.settings import PER_PAGE


class CustomPagination(PageNumberPagination):
    page_size = PER_PAGE
    page_size_query_param = "per_page"

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "page": self.page.number,
            "per_page": self.get_page_size(self.request),
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })
