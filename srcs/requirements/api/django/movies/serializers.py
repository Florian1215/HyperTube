from django.utils import timezone
from rest_framework import serializers

from config.tmdb_media import tmdb_media
from movies.fetch import get_or_fetch_movie_lang
from movies.models import Movie, Cast, Crew
from users.models import UserHistory


class MovieTitleMixin(serializers.Serializer):
    title = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    def get_title(self, obj):
        return get_or_fetch_movie_lang(obj, self.context['lang']).title

    def get_summary(self, obj):
        return get_or_fetch_movie_lang(obj, self.context['lang']).summary


class MovieProgressMixin(serializers.Serializer):
    progress = serializers.SerializerMethodField()
    complete = serializers.SerializerMethodField()
    pourcent = serializers.SerializerMethodField()
    watched_at = serializers.SerializerMethodField()

    def get_history(self, obj):
        try:
            if self.context['user_history']:
                if type(obj) is dict:
                    res = UserHistory.objects.filter(movie_id=obj['id'], user=self.context['user_history'])
                else:
                    res = obj.history.filter(user=self.context['user_history'])
                return res.order_by('-updated_at').first()
        except UserHistory.DoesNotExist:
            pass
        return None

    def get_progress(self, obj):
        h = self.get_history(obj)
        return h.progress if h else 0

    def get_complete(self, obj):
        h = self.get_history(obj)
        return h.complete if h else False

    def get_pourcent(self, obj):
        h = self.get_history(obj)
        return h.pourcent if h else 0

    def get_watched_at(self, obj):
        h = self.get_history(obj)
        return h.watched_at if h else None


SMALL_MOVIE_FIELDS = [
    'id',
    'title',
    'year',
    'backdrop_url',
    'progress',
    'complete',
    'pourcent',
    'watched_at'
]


class SmallMovieSerializer(MovieTitleMixin, MovieProgressMixin, serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = SMALL_MOVIE_FIELDS


class MovieSerializer(MovieProgressMixin, serializers.Serializer):
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


class MovieDetailSerializer(MovieTitleMixin, MovieProgressMixin, serializers.ModelSerializer):
    cast = CastSerializer(many=True, read_only=True)
    crew = CrewSerializer(many=True, read_only=True)
    genres = serializers.SerializerMethodField()
    backdrops_url = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

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
            'genres',
            'progress',
            'complete',
            'pourcent',
            'watched_at'
        ]

    @staticmethod
    def get_genres(obj):
        return [g.genre_id for g in obj.genres.all()]

    @staticmethod
    def get_backdrops_url(obj):
        return [g.url for g in obj.backdrops_url.all()]


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


class MovieProgressSerializer(serializers.ModelSerializer):
    progress = serializers.IntegerField(min_value=0)
    pourcent = serializers.IntegerField(min_value=0, max_value=100)

    class Meta:
        model = UserHistory
        fields = [
            'progress',
            'complete',
            'pourcent',
            'watched_at'
        ]
        read_only_fields = [
            'watched_at'
        ]

    def update(self, instance, validated_data):
        if validated_data.get('complete'):
            validated_data['pourcent'] = 100
            validated_data['watched_at'] = timezone.now()
        return super().update(instance, validated_data)


class MovieHistorySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='movie_id')
    title = serializers.SerializerMethodField()
    year = serializers.CharField(source='movie.year')
    backdrop_url = serializers.CharField(source='movie.backdrop_url')

    class Meta:
        model = UserHistory
        fields = SMALL_MOVIE_FIELDS

    def get_title(self, obj):
        return get_or_fetch_movie_lang(obj.movie, self.context['lang']).title
