from django.utils.translation import get_language_from_request
from rest_framework import generics, viewsets
from rest_framework.exceptions import ValidationError, NotFound

import test
from config.errors import ERRORMSG_SEARCH_REQUIRED, MOVIE_NOT_FOUND
from .fetch import get_or_fetch_movie
from .models import Movie
from .pagination import TMDBPagination
from .permissions import CanRecommendMovie
from .serializers import MovieSerializer, MovieDetailSerializer, MovieFeatureSerializer
from .services.tmdb import TMDBService


class MovieApiView(generics.RetrieveAPIView):
    serializer_class = MovieDetailSerializer

    def get_object(self):
        movie = get_or_fetch_movie(self.kwargs['pk'], self.request)
        return movie

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['lang'] = get_language_from_request(self.request)
        return context


class MoviesListView(generics.ListAPIView):
    serializer_class = MovieSerializer
    pagination_class = TMDBPagination
    filter_backends = []

    def get_queryset(self):
        query = self.request.query_params.get('search')
        language = get_language_from_request(self.request)

        if not query:
            raise ValidationError(ERRORMSG_SEARCH_REQUIRED)
        page = self.request.query_params.get('page', 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
        tmdb = TMDBService(language)
        response = tmdb.search_movies(query=query, page=page)
        self.tmdb_request = response
        return response['results']


class MovieFeatureApiView(generics.UpdateAPIView):
    serializer_class = MovieFeatureSerializer
    permissions_classes = [CanRecommendMovie]

    def get_object(self):
        try:
            return Movie.objects.get(movie=self.kwargs['pk'])
        except Movie.DoesNotExist:
            raise NotFound(MOVIE_NOT_FOUND)


class MoviesFeatureApiView(generics.ListAPIView):
    serializer_class = MovieDetailSerializer

    def get_queryset(self):
        return Movie.objects.filter(feature=True).order_by('-feature_at')
