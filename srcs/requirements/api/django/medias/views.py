from collections.abc import Mapping

from django.utils.translation import get_language_from_request
from rest_framework import generics, viewsets
from rest_framework.exceptions import NotFound, ValidationError

from config.errors import MEDIA_NOT_FOUND, PROGRESS_NOT_FOUND
from medias.context import LangHistoryContext
from medias.fetch import get_or_fetch_media
from medias.models import Media
from medias.pagination import TMDBPagination
from medias.permissions import CanRecommendMedia
from medias.serializers import MediaDetailSerializer, MediaSerializer, MediaFeatureSerializer, MediaProgressSerializer, \
    MediaTorrentSerializer, SmallMediaSerializer
from medias.services.tmdb import TMDBService
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
        print('TEST', self, self.kwargs, flush=True)
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
        tmdb = TMDBService(language)
        response = tmdb.search_medias(self.kwargs['type'], query=query, page=page)
        self.tmdb_request = response
        res = []
        for media in response['results']:
            try:
                media['backdrop_path'] = Media.objects.get(id=media['id']).backdrop_url
            except Media.DoesNotExist:
                pass
            res.append(media)
        return res


class MediaFeatureApiView(generics.UpdateAPIView):
    serializer_class = MediaFeatureSerializer
    permissions_classes = [CanRecommendMedia]

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
        return get_or_fetch_torrent(**self.kwargs)


class MediasDirectStreamApiView(LangHistoryContext, generics.ListAPIView):
    serializer_class = SmallMediaSerializer

    def get_queryset(self):
        return Media.objects.filter(torrents__downloaded__isnull=False).distinct()  # .order_by('-created_at') todo
