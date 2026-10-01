from django.http import FileResponse, Http404
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from config import settings
from config.errors import TORRENT_NOT_FOUND
from torrents.models import Torrent
from torrents.tasks import download_and_transcode


class TorrentsApiView(APIView):
    def get_object(self):
        try:
            return Torrent.objects.get(id=self.kwargs['torrent_id'])
        except Torrent.DoesNotExist:
            raise NotFound(TORRENT_NOT_FOUND)

    def post(self, request, *args, **kwargs):
        torrent = self.get_object()
        preferred_language = request.data.get('lang', 'vo')
        if preferred_language == 'vo':
            lang = torrent.media.original_language
        else:
            lang = 'fr'
        print('STATUS:', torrent.id, torrent.status, lang, flush=True)
        download_and_transcode.delay(torrent.id, lang)
        return Response({'id': torrent.id, 'status': torrent.status}, status=status.HTTP_201_CREATED)

    def delete(self, request, *args, **kwargs):
        print('DELETE TEST', flush=True)
        torrent = self.get_object()
        if torrent.status != 'downloading':
            return Response(
                {
                    'detail': 'Torrent cannot be cancelled',
                    'status': torrent.status,
                },
                status=status.HTTP_409_CONFLICT,
            )
        torrent.cancel_requested = True
        torrent.save(update_fields=['cancel_requested'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TorrentHLSApiView(APIView):
    @staticmethod
    def get(request, torrent_id, filename):
        base_dir = settings.DATA_DIR / 'streams' / torrent_id
        file_path = (base_dir / filename).resolve()
        print('GET HLS', file_path, base_dir, torrent_id, filename, flush=True)
        if base_dir.resolve() not in file_path.parents:
            raise Http404()
        if not file_path.is_file():
            raise Http404()
        content_types = {'.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t'}
        content_type = content_types.get(file_path.suffix.lower(), 'application/octet-stream')
        return FileResponse(open(file_path, 'rb'), content_type=content_type)
