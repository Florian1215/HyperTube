from django.urls import path

from torrents.views import TorrentsApiView, TorrentFileApiView, TorrentHLSApiView

urlpatterns = [
    path('torrents/<str:torrent_id>/', TorrentsApiView.as_view(), name='torrent'),
    path('torrents/<str:torrent_id>/file/', TorrentFileApiView.as_view(), name='torrent-file'),
    path('stream/<str:torrent_id>/<path:filename>', TorrentHLSApiView.as_view(), name='torrent-hls')
]
