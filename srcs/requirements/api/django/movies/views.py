from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from config import settings
from movies.models import Movie, Genre
from movies.serializers import MovieListSerializer, MovieDetailSerializer, GenreSerializer, MovieSearchSerializer
from movies.services.tmdb import tmdb_client


class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movie.objects.prefetch_related("genres")
    lookup_field = "imdb_id"

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter
    ]

    filterset_fields = ["year", "genres"]
    search_fields = ["title", "director", "cast"]
    ordering_fields = ["note", "year", "created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MovieDetailSerializer
        return MovieListSerializer


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


class MovieSearchView(APIView):
    def get(self, request):
        query = request.GET.get("query")
        print("QUERY REQUEST", query, flush=True)

        if not query:
            return Response(
                {
                    "error": "query required"
                },
                status=400
            )

        data = tmdb_client.search_movies(query)
        print("DATA", data, flush=True)
        results = []
        for movie in data.results:
            print("MOVIE TEST", movie, flush=True)
            obj, created = Movie.objects.get_or_create(
                tmdb_id=movie.id,
                defaults={
                    "title": movie.title,
                    "year": movie.release_date[:4],
                    "poster_url": f"{settings.TMDB_MEDIAS_URL}/w500" + movie.poster_path,
                    "backdrop_url": f"{settings.TMDB_MEDIAS_URL}/original" + movie.backdrop_path,
                    "summary": movie.overview,
                    "note": movie.vote_average
                }
            )
            results.append(obj)

        serializer = MovieSearchSerializer(results, many=True)
        return Response(serializer.data)
