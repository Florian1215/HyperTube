from django.urls import re_path
from medias.views import MediasListView, MediaApiView, MediaFeatureApiView, MediasFeatureApiView, MediaProgressApiView, \
    MediaTorrentsApiView, MediasDirectStreamApiView, MediaCollectionApiView, MediaWatchlistApiView, \
    MediaTorrentRequestApiView


def get_media_path(View, endpoint='', name=None, media_id=False):
    if name is None:
        name = endpoint
    if media_id:
        endpoint = r'(?P<media_id>\d+)' + endpoint
    if endpoint:
        endpoint += '/'
    return re_path(r'^(?P<type>movies|series)/' + endpoint + '$', View.as_view(), name=name)


urlpatterns = [
    get_media_path(MediasListView, name='medias-search'),
    get_media_path(MediasListView, 'top-rated'),
    get_media_path(MediasFeatureApiView, 'featured'),
    get_media_path(MediasDirectStreamApiView, 'directstream'),
    get_media_path(MediaFeatureApiView, '/feature', name='set-feature', media_id=True),
    get_media_path(MediaApiView, name='media-detail', media_id=True),
    get_media_path(MediaProgressApiView, '/progress', name='media-progress', media_id=True),
    get_media_path(MediaWatchlistApiView, '/watchlist', name='media-watchlist', media_id=True),
    get_media_path(MediaTorrentsApiView, '/torrents', name='media-torrents', media_id=True),
    get_media_path(MediaTorrentRequestApiView, '/torrents/request', name='media-torrent-request', media_id=True),
    get_media_path(MediaCollectionApiView, '/collection', name='media-collection', media_id=True),
]
