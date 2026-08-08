from rest_framework import serializers
from movies.models import Movie, Genre


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = [
            "id",
            "name"
        ]


class MovieListSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            "imdb_id",
            "title",
            "year",
            "poster_url",
            "backdrop_url",
            "genres",
            "note"
        ]


class MovieDetailSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            "imdb_id",
            "tmdb_id",
            "title",
            "year",
            "poster_url",
            "backdrop_url",
            "genres",
            "note",
            "runtime_minutes",
            "summary",
            "director",
            "cast"
        ]


class MovieSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie

        fields = [
            "imdb_id",
            "tmdb_id",
            "title",
            "year",
            "poster_url",
            "backdrop_url",
            "note"
        ]
