from rest_framework import serializers

from config import settings
from config.settings import TMDB_MEDIAS_URL


class MovieSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    year = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()
    genres = serializers.ListField(child=serializers.IntegerField(), source='genre_ids')
    note = serializers.FloatField(source='vote_average')
    vote_count = serializers.IntegerField()

    @staticmethod
    def get_year(obj):
        return obj.get('release_date', '')[:4]

    @staticmethod
    def get_poster_url(obj):
        path = obj.get('poster_path')
        return f'{settings.TMDB_MEDIAS_URL}/w500{path}' if path else ''

    @staticmethod
    def get_backdrop_url(obj):
        path = obj.get('backdrop_path')
        return f'{settings.TMDB_MEDIAS_URL}/w1280{path}' if path else ''


class MovieDetailSerializer(MovieSerializer):
    genres = serializers.SerializerMethodField()
    original_title = serializers.CharField()
    runtime = serializers.IntegerField()
    summary = serializers.CharField(source='overview')
    status = serializers.CharField()
    cast = serializers.SerializerMethodField()
    crew = serializers.SerializerMethodField()

    @staticmethod
    def get_genres(obj):
        return [g['id'] for g in obj['genres']]

    @staticmethod
    def get_cast(obj):
        return [{'id': g['id'], 'name': g['original_name'], 'picture': TMDB_MEDIAS_URL + g['profile_path'], 'character': g['character']} for g in obj['credits']['cast']]

    @staticmethod
    def get_crew(obj):
        return [{'id': g['id'], 'name': g['original_name'], 'picture': TMDB_MEDIAS_URL + g['profile_path'], 'job': g['job']} for g in obj['credits']['crew']]
