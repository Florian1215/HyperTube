from django.utils.translation import get_language_from_request
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from config.errors import ERRORMSG_SEARCH_REQUIRED
from .pagination import TMDBPagination
from .serializers import MovieSerializer, MovieDetailSerializer
from .services.tmdb import TMDBService


class MovieViewSet(viewsets.ViewSet):
    authentication_classes = []
    pagination_class = TMDBPagination

    def list(self, request):
        query = request.query_params.get("search")
        language = get_language_from_request(request)

        print("LANGUAGE, ", language)
        if not query:
            raise ValidationError(ERRORMSG_SEARCH_REQUIRED)
        page = request.query_params.get("page", 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
        tmdb = TMDBService()
        data = tmdb.search_movies(query=query, lang=language, page=page)
        print("DATA: ", data, len(data["results"]))
        paginator = self.pagination_class()
        movies = paginator.paginate_tmdb(request, data)
        serializer = MovieSerializer(movies, many=True)
        return paginator.get_paginated_response(serializer.data)

    @staticmethod
    def retrieve(request, pk=None):
        language = get_language_from_request(request)
        tmdb = TMDBService()
        movie = tmdb.get_movie(pk, language)
        serializer = MovieDetailSerializer(movie)
        return Response(serializer.data)
