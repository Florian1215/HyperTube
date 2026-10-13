import re
import shutil
import time

import requests
from celery import shared_task
from django.http import HttpRequest
from django.utils import timezone
import libtorrent as lt
from rest_framework.exceptions import APIException

from config.settings import DOWNLOAD_RETENTION, TORRENT_DIR, TRANSCODE_URL
from torrents.fetch import get_or_fetch_torrent
from torrents.models import DownloadMedia, Torrent, TorrentRequest


def set_status(torrent, stream_id, status, error=None):
    Torrent.objects.filter(id=torrent.id).update(status=status, error=error)
    DownloadMedia.objects.filter(id=stream_id).update(status=status, error=error)


IN_PROGRESS = ['downloading', 'transcoding']


def remove_source_video(torrent, stream_id, video_path):
    video_path.unlink(missing_ok=True)
    if not torrent.downloaded.filter(status__in=IN_PROGRESS).exclude(id=stream_id).exists():
        shutil.rmtree(TORRENT_DIR / torrent.id, ignore_errors=True)


VIDEO_EXTENSIONS = ('.mkv', '.mp4', '.avi', '.mov', '.webm', '.m4v')


def find_video_file(files, season_number=None, episode_number=None):
    videos = [f for f in files if f[1].lower().endswith(VIDEO_EXTENSIONS)]
    if episode_number is not None:
        patterns = [
            rf'S0*{season_number}(?:[ ._-]?E\d+)*[ ._-]?E0*{episode_number}(?!\d)',
            rf'(?<!\d)0*{season_number}x0*{episode_number}(?!\d)',
            rf'(?<![A-Za-z])(?:E|EP|Episode)[ ._]?0*{episode_number}(?!\d)',
        ]
        for pattern in patterns:
            matches = [f for f in videos if re.search(pattern, f[1].rsplit('/', 1)[-1], re.IGNORECASE)]
            if matches:
                videos = matches
                break
        else:
            videos = []
    if not videos:
        raise RuntimeError('File not found')
    return max(videos, key=lambda f: f[2])


def read_video(handle, info, video, path, torrent, stream_id):
    index, _, size = video
    offset = info.files().file_offset(index)
    piece_length = info.piece_length()
    position = 0
    last_update = 0
    while position < size:
        if time.monotonic() - last_update > 2:
            last_update = time.monotonic()
            progress = handle.status().progress * 100
            Torrent.objects.filter(id=torrent.id).update(progress=progress)
            print(f'Torrent {torrent.id}: {progress:.1f}%', flush=True)
        piece = (offset + position) // piece_length
        end = min(size, (piece + 1) * piece_length - offset)
        data = b''
        if handle.have_piece(piece) and path.is_file():
            with open(path, 'rb') as f:
                f.seek(position)
                data = f.read(end - position)
        if len(data) < end - position:
            time.sleep(1)
            continue
        yield data
        position = end
    Torrent.objects.filter(id=torrent.id).update(progress=100)
    set_status(torrent, stream_id, 'transcoding')


@shared_task
def download_and_transcode(torrent_id, lang, episode_number=None):
    torrent = Torrent.objects.get(id=torrent_id)
    stream_id = torrent.get_stream_id(episode_number)
    download_dir = TORRENT_DIR / torrent.id
    try:
        download_dir.mkdir(parents=True, exist_ok=True)
        Torrent.objects.filter(id=torrent.id).update(progress=0)
        set_status(torrent, stream_id, 'downloading')
        # -----------------------------
        # 1. Télécharger le .torrent
        # -----------------------------
        torrent_path = download_dir / 'source.torrent'
        response = requests.get(torrent.url, timeout=30)
        response.raise_for_status()
        torrent_path.write_bytes(response.content)

        # -----------------------------
        # 2. Charger le torrent
        # -----------------------------
        session = lt.session()
        session.listen_on(6881, 6891)
        info = lt.torrent_info(str(torrent_path))
        storage = info.files()
        files = [(i, storage.file_path(i), storage.file_size(i)) for i in range(storage.num_files())]
        if torrent.is_season_pack:
            video = find_video_file(files, torrent.season_number, episode_number)
        else:
            video = find_video_file(files)
        handle = session.add_torrent({'ti': info, 'save_path': str(download_dir)})
        # only the video is downloaded, from its beginning, so it can be transcoded while it downloads
        handle.prioritize_files([4 if i == video[0] else 0 for i, _, _ in files])
        handle.set_flags(lt.torrent_flags.sequential_download)

        # -----------------------------
        # 3. Télécharger et transcoder en parallèle
        # -----------------------------
        res = requests.post(
            f'{TRANSCODE_URL}/transcode',
            params={'preferred_language': lang, 'torrent_id': stream_id},
            data=read_video(handle, info, video, download_dir / video[1], torrent, stream_id),
        )
        res.raise_for_status()
        session.remove_torrent(handle)
        remove_source_video(torrent, stream_id, download_dir / video[1])
        set_status(torrent, stream_id, 'completed')
    except Exception as exc:
        set_status(torrent, stream_id, 'error', str(exc))
        raise


@shared_task
def delete_expired_downloads():
    expired = DownloadMedia.objects.filter(last_watched_at__lt=timezone.now() - DOWNLOAD_RETENTION)
    for download_id in list(expired.values_list('id', flat=True)):
        print(f'Download {download_id}: expired, deleted', flush=True)
    expired.delete()


@shared_task
def check_requested_torrents():
    pending = TorrentRequest.objects.filter(available_at__isnull=True)
    targets = {(r.media, r.episode) for r in pending.select_related('media', 'episode__season')}
    for media, episode in targets:
        season_number = episode.season.season_number if episode else None
        episode_number = episode.episode_number if episode else None
        try:
            torrents = get_or_fetch_torrent(HttpRequest(), media.tmdb_id, media.type, season_number, episode_number)
        except APIException as exc:
            print(f'Torrent request {episode or media}: {exc}', flush=True)
            continue
        if torrents:
            print(f'Torrent request {episode or media}: available', flush=True)
            pending.filter(media=media, episode=episode).update(available_at=timezone.now())
