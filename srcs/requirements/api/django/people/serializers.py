from rest_framework import serializers

from config.tmdb_media import format_tmdb_image
from medias.serializers import MediaSerializer
from people.models import People


class PeopleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    picture = serializers.SerializerMethodField()
    department = serializers.CharField(source='known_for_department', allow_null=True)
    known_for = serializers.SerializerMethodField()
    watched_count = serializers.SerializerMethodField()

    @staticmethod
    def get_picture(obj):
        return format_tmdb_image(obj.get('profile_path'), 'w300')

    def get_watched_count(self, obj):
        return self.context.get('watched_counts', {}).get(obj['id'], 0)

    @staticmethod
    def get_known_for(obj):
        return [{
            'id': media['id'],
            'type': 'series' if media.get('media_type') == 'tv' else 'movies',
            'title': media.get('title') or media.get('name'),
        } for media in obj.get('known_for', [])]


class PersonSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='tmdb_id')
    picture = serializers.SerializerMethodField()
    biography = serializers.SerializerMethodField()
    watched_count = serializers.SerializerMethodField()
    medias_count = serializers.SerializerMethodField()

    class Meta:
        model = People
        fields = ['id', 'name', 'picture', 'department', 'biography', 'birthday', 'deathday', 'place_of_birth',
                  'watched_count', 'medias_count']

    @staticmethod
    def get_picture(obj):
        return format_tmdb_image(obj.profile_path, 'w500')

    def get_biography(self, obj):
        return self.context['language'].biography

    def get_watched_count(self, obj):
        return self.context.get('watched_counts', {}).get(obj.tmdb_id, 0)

    @staticmethod
    def get_medias_count(obj):
        return len(obj.medias)


class PersonMediaSerializer(MediaSerializer):
    roles = serializers.ListField(child=serializers.CharField())
