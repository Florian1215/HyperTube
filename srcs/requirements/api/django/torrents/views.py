import requests
from django.http import FileResponse, Http404, HttpResponse
from django.utils.http import content_disposition_header
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from config import settings
from config.errors import TORRENT_NOT_FOUND
from torrents.models import DownloadMedia, Torrent
from torrents.tasks import download_and_transcode


class TorrentsApiView(APIView):
    def get_object(self):
        try:
            return Torrent.objects.get(id=self.kwargs['torrent_id'])
        except Torrent.DoesNotExist:
            raise NotFound(TORRENT_NOT_FOUND)

    @staticmethod
    def get_episode_number(torrent, data):
        if not torrent.is_season_pack:
            return None
        try:
            return int(data.get('episode_number'))
        except (TypeError, ValueError):
            raise ValidationError()

    @staticmethod
    def get_response(torrent, stream_id, download_status, code):
        return Response({
            'id': torrent.id,
            'status': download_status,
            'stream': f'stream/{stream_id}/stream.m3u8',
        }, status=code)

    def get(self, request, *args, **kwargs):
        torrent = self.get_object()
        stream_id = torrent.get_stream_id(self.get_episode_number(torrent, request.query_params))
        try:
            download_status = DownloadMedia.objects.get(id=stream_id).status
        except DownloadMedia.DoesNotExist:
            download_status = 'not-downloaded'
        return self.get_response(torrent, stream_id, download_status, status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        torrent = self.get_object()
        if getattr(request.user, 'preferred_language', 'vo') == 'vo':
            lang = torrent.media.original_language
        else:
            lang = 'fr'
        episode_number = self.get_episode_number(torrent, request.data)
        stream_id = torrent.get_stream_id(episode_number)
        download, start = DownloadMedia.objects.get_or_create(id=stream_id, defaults={'torrent': torrent, 'language': lang})
        if not start:
            start = DownloadMedia.objects.filter(id=stream_id, status='error').update(
                status='downloading', language=lang, error=None) == 1
        if not start:
            return self.get_response(torrent, stream_id, download.status, status.HTTP_200_OK)
        (settings.STREAM_DIR / stream_id / 'stream.m3u8').unlink(missing_ok=True)
        download_and_transcode.delay(torrent.id, lang, episode_number)
        return self.get_response(torrent, stream_id, 'downloading', status.HTTP_201_CREATED)


class TorrentFileApiView(APIView):
    @staticmethod
    def get(request, torrent_id):
        """The .torrent is downloaded through the API: its url holds the tracker API key."""
        try:
            torrent = Torrent.objects.get(id=torrent_id)
            response = requests.get(torrent.url, timeout=30)
            response.raise_for_status()
        except (Torrent.DoesNotExist, requests.RequestException):
            raise NotFound(TORRENT_NOT_FOUND)
        return HttpResponse(response.content, content_type='application/x-bittorrent', headers={
            'Content-Disposition': content_disposition_header(True, f'{torrent.title}.torrent'),
        })


class TorrentHLSApiView(APIView):
    @staticmethod
    def get(request, torrent_id, filename):
        base_dir = settings.STREAM_DIR / torrent_id
        file_path = (base_dir / filename).resolve()
        if base_dir.resolve() not in file_path.parents:
            raise Http404()
        if not file_path.is_file():
            raise Http404()
        if file_path.suffix.lower() == '.m3u8':
            stream_id = file_path.parent.relative_to(settings.STREAM_DIR).as_posix()
            DownloadMedia.objects.filter(id=stream_id).update(last_watched_at=timezone.now())
        content_types = {'.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t'}
        content_type = content_types.get(file_path.suffix.lower(), 'application/octet-stream')
        return FileResponse(open(file_path, 'rb'), content_type=content_type)
