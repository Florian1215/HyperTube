from django.utils import timezone
from django.utils.translation import get_language_from_request
from rest_framework import serializers

from config.tmdb_media import tmdb_media
from movies.fetch import get_or_fetch_movie_lang
from movies.models import Movie, Cast, Crew


class SmallMovieSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = [
            'id',
            'title',
            'year',
            'backdrop_url'
        ]

    def get_title(self, obj):
        lang = get_language_from_request(self.context['request'])
        return get_or_fetch_movie_lang(obj, lang).title


class MovieSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    year = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()
    genres = serializers.ListField(child=serializers.IntegerField(), source='genre_ids')
    note = serializers.FloatField(source='vote_average')
    release_date = serializers.CharField()
    vote_count = serializers.IntegerField()

    @staticmethod
    def get_year(obj):
        return obj.get('release_date', '')[:4]

    @staticmethod
    def get_poster_url(obj):
        return tmdb_media(obj['poster_path'], 'w500')

    @staticmethod
    def get_backdrop_url(obj):
        return tmdb_media(obj['backdrop_path'], 'w1280')


class CastSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cast
        fields = [
            'id',
            'name',
            'picture',
            'character',
        ]


class CrewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crew
        fields = [
            'id',
            'name',
            'picture',
            'job',
        ]


class MovieDetailSerializer(serializers.ModelSerializer):
    cast = CastSerializer(many=True, read_only=True)
    crew = CrewSerializer(many=True, read_only=True)
    genres = serializers.SerializerMethodField()
    backdrops_url = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = [
            'id',
            'title',
            'original_title',
            'year',
            'poster_url',
            'backdrop_url',
            'backdrops_url',
            'note',
            'vote_count',
            'runtime',
            'summary',
            'status',
            'release_date',
            'feature',
            'cast',
            'crew',
            'genres'
        ]

    @staticmethod
    def get_genres(obj):
        return [g.genre_id for g in obj.genres.all()]

    @staticmethod
    def get_backdrops_url(obj):
        return [g.url for g in obj.backdrops_url.all()]

    def get_title(self, obj):
        return obj.languages.get(lang=self.context['lang']).title

    def get_summary(self, obj):
        return obj.languages.get(lang=self.context['lang']).summary


class MovieFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = [
            'backdrop_url',
            'feature'
        ]

    def update(self, instance, validated_data):
        if 'feature' in validated_data:
            validated_data['feature_at'] = timezone.now()
        return super().update(instance, validated_data)
