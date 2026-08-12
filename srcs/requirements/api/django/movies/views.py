from django.utils.translation import get_language_from_request
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.response import Response

from config.errors import ERRORMSG_SEARCH_REQUIRED
from config.tmdb_media import tmdb_media
from .models import Movie, Genre
from .pagination import TMDBPagination
from .serializers import MovieSerializer, MovieDetailSerializer
from .services.tmdb import TMDBService


class MovieViewSet(viewsets.ViewSet):
    authentication_classes = []
    pagination_class = TMDBPagination

    def list(self, request):
        query = request.query_params.get('search')
        language = get_language_from_request(request)

        if not query:
            raise ValidationError(ERRORMSG_SEARCH_REQUIRED)
        page = request.query_params.get('page', 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
        tmdb = TMDBService()
        data = tmdb.search_movies(query=query, lang=language, page=page)
        paginator = self.pagination_class()
        movies = paginator.paginate_tmdb(request, data)
        serializer = MovieSerializer(movies, many=True)
        return paginator.get_paginated_response(serializer.data)

    @staticmethod
    def get_or_fetch_movie(pk, language):
        try:
            return Movie.objects.get(pk=pk)
        except (Movie.DoesNotExist, ValueError):
            try:
                tmdb = TMDBService()
                movie_data = tmdb.get_movie(pk, language)
                movie = Movie.objects.create(
                    id=movie_data['id'],
                    title=movie_data['title'],
                    year=movie_data['release_date'][:4],
                    poster_url=tmdb_media(movie_data['poster_path'], 'w500'),
                    backdrop_url=tmdb_media(movie_data['backdrop_path'], 'w1280'),
                    note=movie_data['vote_average'],
                    vote_count=movie_data['vote_count'],
                    original_title=movie_data['original_title'],
                    runtime=movie_data['runtime'],
                    summary=movie_data['overview'],
                    status=movie_data['status'],
                )
                for genre_data in movie_data['genres']:
                    genre, _ = Genre.objects.get_or_create(id=genre_data['id'], name=genre_data['name'])
                    movie.genres.add(genre)
                for cast in movie_data['credits']['cast']:
                    movie.cast.create(cast_id=cast['id'], name=cast['name'], picture=tmdb_media(cast['profile_path'], 'w300'), character=cast['character'])
                for crew in movie_data['credits']['crew']:
                    movie.crew.create(crew_id=crew['id'], name=crew['name'], picture=tmdb_media(crew['profile_path'], 'w300'), job=crew['job'])
                return movie
            except Exception as e:
                raise NotFound()

    @staticmethod
    def retrieve(request, pk=None):
        language = get_language_from_request(request)
        movie = MovieViewSet.get_or_fetch_movie(pk, language)
        serializer = MovieDetailSerializer(movie)
        return Response(serializer.data)
