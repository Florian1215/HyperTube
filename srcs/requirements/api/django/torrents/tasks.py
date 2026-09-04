import shutil
import time

import requests
from celery import shared_task
import libtorrent as lt

from config.settings import TORRENT_DIR
from torrents.models import Torrent


class TorrentCancelled(Exception):
    pass


def is_cancel_requested(torrent_id):
    return Torrent.objects.filter(id=torrent_id, status='cancelled').exists()


@shared_task
def download_and_transcode(torrent_id, lang):
    torrent = Torrent.objects.get(id=torrent_id)
    download_dir = TORRENT_DIR / torrent.id
    try:
        # if torrent.status == 'not-downloaded' or True:
        download_dir.mkdir(parents=True, exist_ok=True)
        # -----------------------------
        # 1. Télécharger le .torrent
        # -----------------------------
        torrent.status = 'downloading'
        torrent.save(update_fields=['status'])
        torrent_path = download_dir / 'source.torrent'
        response = requests.get(torrent.url, timeout=30)
        response.raise_for_status()
        print('TORRENT PATH', torrent_path, flush=True)
        torrent_path.write_bytes(response.content)

        # -----------------------------
        # 2. Charger le torrent
        # -----------------------------
        session = lt.session()
        session.listen_on(6881, 6891)
        info = lt.torrent_info(str(torrent_path))
        handle = session.add_torrent({'ti': info, 'save_path': str(download_dir)})

        # -----------------------------
        # 3. Télécharger
        # -----------------------------
        while not handle.is_seed():
            if is_cancel_requested(torrent.id):
                handle.pause()
                raise TorrentCancelled()
            torrent_status = handle.status()
            progress = torrent_status.progress * 100
            torrent.progress = progress
            torrent.save(update_fields=['progress'])
            print(f'Torrent {torrent.id}: {progress:.1f}%')
            time.sleep(2)

        # -----------------------------
        # 5. Trouver la vidéo
        # -----------------------------
        video_extensions = {'.mkv', '.mp4', '.avi', '.mov', '.webm', '.m4v'}
        video_files = [
            p
            for p in download_dir.rglob('*')
            if p.is_file() and p.suffix.lower() in video_extensions
        ]
        if not video_files:
            raise RuntimeError('File not found')
        input_file = video_files[0]
        res = requests.post(f'http://localhost:{TRANSCODE_PORT}/transcode', json={
            'lang': lang,
            'input_file': str(input_file),
            'torrent_id': torrent_id
        })
        print('RES', res.status_code, flush=True)
        print('RES', res.json(), flush=True)
        print('MAKE REQUEST input_file=', input_file, flush=True)
        # if torrent.status == 'downloading' or True:
        #     torrent.status = 'transcoding'
        #     torrent.progress = 100
        #     torrent.save(update_fields=['status', 'progress'])
        #     transcode_video.apply_async(args=[playlist, download_dir, transcoded_dir], queue='video')
        # torrent.status = 'done'
        # torrent.output_file = str(playlist)
        # torrent.save(update_fields=['status', 'output_file'])
#     except TorrentCancelled:
#         torrent.status = 'cancelled'
#         torrent.save(update_fields=['status'])
#         shutil.rmtree(base_dir, ignore_errors=True)
    except Exception as exc:
        print("ERROR", exc, flush=True)
#         torrent.status = 'error'
#         torrent.error = str(exc)
#         torrent.save(update_fields=['status', 'error'])
        raise
