from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from config.tmdb_media import format_tmdb_image
from series.serializers import SmallEpisodeSerializer
from torrents.models import DownloadMedia, Torrent
from medias.fetch import get_or_fetch_media_lang
from medias.models import Media, Cast, Crew
from medias.progress import get_views, MediaProgressMixin, MediaWatchlistMixin, get_next_episode, remove_watched_from_watchlist
from users.models import User, UserHistory
from users.serializers import UserSerializer


class MediaTitleMixin(serializers.Serializer):
    id = serializers.CharField(source='tmdb_id')
    title = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    def get_title(self, obj):
        return get_or_fetch_media_lang(obj, self.context['lang']).title

    def get_summary(self, obj):
        return get_or_fetch_media_lang(obj, self.context['lang']).summary


SMALL_MEDIA_FIELDS = [
    'id',
    'title',
    'year',
    'backdrop_url',
    'progress',
    'complete',
    'pourcent',
    'watched_at',
    'in_watchlist',
    'type'
]


class SmallMediaSerializer(MediaTitleMixin, MediaProgressMixin, MediaWatchlistMixin, serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = SMALL_MEDIA_FIELDS


class MediaComingSoonSerializer(SmallMediaSerializer):
    release_date = serializers.CharField(source='coming_date')
    episode = SmallEpisodeSerializer(source='coming_episode')

    class Meta(SmallMediaSerializer.Meta):
        fields = SMALL_MEDIA_FIELDS + ['release_date', 'episode']


class MediaSerializer(MediaProgressMixin, MediaWatchlistMixin, serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    year = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()
    genres = serializers.ListField(child=serializers.IntegerField(), source='genre_ids')
    rating = serializers.FloatField(source='vote_average')
    release_date = serializers.CharField()
    vote_count = serializers.IntegerField()
    type = serializers.SerializerMethodField()

    @staticmethod
    def get_year(obj):
        return obj['release_date'][:4]

    @staticmethod
    def get_poster_url(obj):
        return format_tmdb_image(obj['poster_path'], 'w500')

    @staticmethod
    def get_backdrop_url(obj):
        return obj.get('backdrop_url') or format_tmdb_image(obj['backdrop_path'], 'original')

    @staticmethod
    def get_type(obj):
        if 'first_air_date' in obj:
            return 'series'
        return 'movies'


class CollectionPartSerializer(MediaSerializer):
    summary = serializers.CharField(source='overview')


class CastSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='cast_id')

    class Meta:
        model = Cast
        fields = ['id', 'name', 'picture', 'character']


class CrewSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='crew_id')

    class Meta:
        model = Crew
        fields = ['id', 'name', 'picture', 'job']


class MediaDetailSerializer(MediaTitleMixin, MediaProgressMixin, MediaWatchlistMixin, serializers.ModelSerializer):
    cast = CastSerializer(many=True)
    crew = CrewSerializer(many=True)
    genres = serializers.SerializerMethodField()
    backdrops_url = serializers.SerializerMethodField()
    next_episode = serializers.SerializerMethodField()
    watched_by = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            'id',
            'title',
            'original_title',
            'original_language',
            'budget',
            'revenue',
            'production_countries',
            'production_companies',
            'year',
            'poster_url',
            'backdrop_url',
            'backdrops_url',
            'rating',
            'vote_count',
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
            'watched_at',
            'watched_by',
            'in_watchlist',
            'type',

            'runtime',

            'in_production',
            'end_date',
            'number_of_seasons',
            'number_of_episodes',
            'next_episode'
        ]

    @staticmethod
    def get_genres(obj):
        return [g.genre_id for g in obj.genres.all()]

    @staticmethod
    def get_backdrops_url(obj):
        return [g.url for g in obj.backdrops_url.all()]

    def get_next_episode(self, obj):
        if obj.type != 'series':
            return None
        return get_next_episode(obj, self.context.get('user_history'))

    def get_watched_by(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return []
        users = User.objects.filter(
            Q(id=user.id) | Q(followers__follower=user),
            history__media=obj,
            history__complete=True
        ).distinct().order_by('username')
        res = []
        for watcher in users:
            views = get_views(obj, watcher)
            res.append({**UserSerializer(watcher).data, 'watch_count': len(views), 'views': views})
        return res


class MediaFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = [
            'backdrop_url',
            'feature'
        ]

    def update(self, instance, validated_data):
        if 'feature' in validated_data:
            validated_data['feature_at'] = timezone.now()
        if validated_data.get('backdrop_url', instance.backdrop_url) != instance.backdrop_url:
            validated_data['backdrop_custom'] = True
        return super().update(instance, validated_data)


class MediaProgressSerializer(serializers.ModelSerializer):
    progress = serializers.IntegerField(min_value=0)
    pourcent = serializers.IntegerField(min_value=0, max_value=100)
    season_number = serializers.IntegerField(min_value=0, required=False)
    episode_number = serializers.IntegerField(min_value=0, required=False)

    class Meta:
        model = UserHistory
        fields = [
            'progress',
            'complete',
            'pourcent',
            'season_number',
            'episode_number',
            'watched_at'
        ]
        read_only_fields = [
            'season_number',
            'episode_number'
        ]

    def update(self, instance, validated_data):
        if validated_data.get('complete'):
            validated_data['pourcent'] = 100
            if 'watched_at' not in validated_data:
                validated_data['watched_at'] = timezone.now()
        instance = super().update(instance, validated_data)
        if instance.complete:
            remove_watched_from_watchlist(instance.user, instance.media)
        return instance


class MediaHistorySerializer(MediaWatchlistMixin, serializers.ModelSerializer):
    id = serializers.IntegerField(source='media.tmdb_id')
    title = serializers.SerializerMethodField()
    year = serializers.CharField(source='media.year')
    backdrop_url = serializers.CharField(source='media.backdrop_url')
    episode = SmallEpisodeSerializer()
    type = serializers.CharField(source='media.type')
    rewatch = serializers.BooleanField()

    class Meta:
        model = UserHistory
        fields = SMALL_MEDIA_FIELDS + ['episode', 'rewatch']

    def get_title(self, obj):
        return get_or_fetch_media_lang(obj.media, self.context['lang']).title


class MediaActivitySerializer(MediaHistorySerializer):
    user = UserSerializer()

    class Meta(MediaHistorySerializer.Meta):
        fields = MediaHistorySerializer.Meta.fields + ['user']


class MediaTorrentSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = Torrent
        fields = [
            'id',
            'title',
            'status',
            'size',
            'seeders',
            'peers',
            'quality',
            'language',
            'published_at'
        ]

    def get_status(self, obj):
        episode_number = self.context['request'].query_params.get('episode_number')
        if obj.is_season_pack and episode_number is None:
            return 'not-downloaded'
        if 'downloads' not in self.context:
            self.context['downloads'] = dict(DownloadMedia.objects.filter(torrent__media=obj.media_id).values_list('id', 'status'))
        if obj.is_season_pack:
            episode_number = int(episode_number)
        return self.context['downloads'].get(obj.get_stream_id(episode_number), 'not-downloaded')
