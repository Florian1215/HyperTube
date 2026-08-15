from django.utils.translation import get_language_from_request
from rest_framework import generics
from rest_framework.exceptions import ValidationError, NotFound

from config.errors import ERRORMSG_SEARCH_REQUIRED, MOVIE_NOT_FOUND, PROGRESS_NOT_FOUND
from users.models import UserHistory
from .context import LangHistoryContext
from .fetch import get_or_fetch_movie
from .models import Movie
from .pagination import TMDBPagination
from .permissions import CanRecommendMovie
from .serializers import MovieSerializer, MovieDetailSerializer, MovieFeatureSerializer, MovieProgressSerializer
from .services.tmdb import TMDBService


class MovieApiView(LangHistoryContext, generics.RetrieveAPIView):
    serializer_class = MovieDetailSerializer

    def get_object(self):
        movie = get_or_fetch_movie(self.kwargs['movie_id'], self.request)
        return movie


class MoviesListView(LangHistoryContext, generics.ListAPIView):
    serializer_class = MovieSerializer
    pagination_class = TMDBPagination
    filter_backends = []

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.tmdb_request = None

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
            return Movie.objects.get(movie=self.kwargs['movie_id'])
        except Movie.DoesNotExist:
            raise NotFound(MOVIE_NOT_FOUND)


class MoviesFeatureApiView(LangHistoryContext, generics.ListAPIView):
    serializer_class = MovieDetailSerializer

    def get_queryset(self):
        return Movie.objects.filter(feature=True).order_by('-feature_at')


class MovieProgressApiView(generics.ListAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = MovieProgressSerializer

    def get_object(self):
        if self.request.method in ['PUT', 'PATCH']:
            obj, _ = UserHistory.objects.get_or_create(user=self.request.user, movie_id=self.kwargs['movie_id'], complete=False)
        else:
            try:
                obj = UserHistory.objects.get(user=self.request.user, movie_id=self.kwargs['movie_id'], complete=False)
            except UserHistory.DoesNotExist:
                raise NotFound(PROGRESS_NOT_FOUND)
        return obj

    def get_queryset(self):
        return UserHistory.objects.filter(user=self.request.user, movie_id=self.kwargs['movie_id'])
