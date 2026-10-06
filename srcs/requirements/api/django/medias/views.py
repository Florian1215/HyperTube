from collections.abc import Mapping

from django.db.models import Max
from django.utils.translation import get_language_from_request
from rest_framework import generics
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from config.errors import MEDIA_NOT_FOUND, PROGRESS_NOT_FOUND
from medias.context import LangHistoryContext
from medias.fetch import get_media_collection, get_or_fetch_media, fetch_search, set_custom_backdrops
from medias.models import Media
from medias.pagination import TMDBPagination
from medias.permissions import CanRecommendMedia
from medias.serializers import MediaDetailSerializer, MediaSerializer, MediaFeatureSerializer, MediaProgressSerializer, \
    MediaTorrentSerializer, SmallMediaSerializer, CollectionPartSerializer
from series.fetch import get_or_fetch_season
from series.models import Episode
from torrents.fetch import get_or_fetch_torrent
from users.models import UserHistory


class MediaApiView(LangHistoryContext, generics.RetrieveAPIView):
    serializer_class = MediaDetailSerializer

    def get_object(self):
        media = get_or_fetch_media(self.request, **self.kwargs)
        return media


class MediasListView(LangHistoryContext, generics.ListAPIView):
    serializer_class = MediaSerializer
    pagination_class = TMDBPagination
    filter_backends = []

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.tmdb_request = None

    def get_queryset(self):
        if '/top-rated/' in self.request.path:
            query = 'top_rated'
        else:
            query = self.request.query_params.get('search', 'popular')
        language = get_language_from_request(self.request)
        page = self.request.query_params.get('page', 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
        self.tmdb_request = fetch_search(self.kwargs['type'], query, language, page)
        return set_custom_backdrops(self.tmdb_request['results'], self.kwargs['type'])


class MediaFeatureApiView(generics.UpdateAPIView):
    serializer_class = MediaFeatureSerializer
    permission_classes = [CanRecommendMedia]

    def get_object(self):
        return get_or_fetch_media(self.request, self.kwargs['media_id'], self.kwargs['type'])


class MediasFeatureApiView(LangHistoryContext, generics.ListAPIView):
    serializer_class = MediaDetailSerializer

    def get_queryset(self):
        return Media.objects.filter(feature=True, type=self.kwargs['type']).order_by('-feature_at')


class MediaProgressApiView(generics.ListAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = MediaProgressSerializer

    def get_object(self):
        media = get_or_fetch_media(self.request, self.kwargs['media_id'], self.kwargs['type'])
        args = {
            'user': self.request.user,
            'media': media,
        }
        if media.type == 'series':
            data = self.request.data
            if not isinstance(data, Mapping) or data.get('season_number') is None or data.get('episode_number') is None:
                raise ValidationError()
            season = get_or_fetch_season(self.request, media, data['season_number'])
            try:
                args['episode'] = season.episodes.get(episode_number=data['episode_number'])
            except (Episode.DoesNotExist, ValueError):
                raise NotFound(MEDIA_NOT_FOUND.format(type='episode'))
        if self.request.method in ['PUT', 'PATCH']:
            if not isinstance(self.request.data, Mapping) or (not self.request.data.get('progress') and not self.request.data.get('complete') and not self.request.data.get('pourcent')):
                raise ValidationError()
            obj, _ = UserHistory.objects.get_or_create(**args, complete=False)
        else:
            try:
                obj = UserHistory.objects.get(**args)
            except UserHistory.DoesNotExist:
                raise NotFound(PROGRESS_NOT_FOUND)
        return obj

    def get_queryset(self):
        media = get_or_fetch_media(self.request, self.kwargs['media_id'], self.kwargs['type'])
        return UserHistory.objects.filter(user=self.request.user, media=media)


class MediaTorrentsApiView(generics.ListAPIView):
    serializer_class = MediaTorrentSerializer

    def get_queryset(self):
        params = self.request.query_params
        return get_or_fetch_torrent(self.request, **self.kwargs, season_number=params.get('season_number'),
                                    episode_number=params.get('episode_number'))


class MediaCollectionApiView(LangHistoryContext, generics.GenericAPIView):
    serializer_class = CollectionPartSerializer

    def get(self, request, *args, **kwargs):
        media = get_or_fetch_media(request, **kwargs)
        collection = get_media_collection(request, media)
        collection['parts'] = self.get_serializer(collection['parts'], many=True).data
        return Response(collection)


class MediasDirectStreamApiView(LangHistoryContext, generics.ListAPIView):
    serializer_class = SmallMediaSerializer

    def get_queryset(self):
        return Media.objects.filter(torrents__downloaded__status='completed').annotate(
            last_watched_at=Max('torrents__downloaded__last_watched_at')).order_by('-last_watched_at')
