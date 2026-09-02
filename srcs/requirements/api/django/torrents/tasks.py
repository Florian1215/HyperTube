import shutil
import time

import requests
from celery import shared_task
from django.conf import settings
import libtorrent as lt
import subprocess
from pathlib import Path

from config.errors import FILE_NOT_FOUND
from config.settings import TORRENT_DIR
from torrents.models import Torrent


class TorrentCancelled(Exception):
    pass


def is_cancel_requested(torrent_id):
    return Torrent.objects.filter(id=torrent_id, status='cancelled').exists()


@shared_task
def download_and_transcode(torrent_id):
    torrent = Torrent.objects.get(id=torrent_id)
    download_dir = TORRENT_DIR / 'download'
    transcoded_dir = TORRENT_DIR / 'transcoded'

    print('AAAAAAA', flush=True)

    try:
        if torrent.status == 'not-downloaded':
            download_dir.mkdir(parents=True, exist_ok=True)
            transcoded_dir.mkdir(parents=True, exist_ok=True)
            # -----------------------------
            # 1. Télécharger le .torrent
            # -----------------------------
            torrent.status = 'downloading'
            torrent.save(update_fields=['status'])
            torrent_path = TORRENT_DIR / 'source.torrent'
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

        print('COUCOU TRANSODE', flush=True)
        if torrent.status == 'downloading' or True:
            print('STAT TRANSODE', flush=True)
            # -----------------------------
            # 4. Torrent terminé
            # -----------------------------
            torrent.status = 'transcoding'
            torrent.progress = 100
            torrent.save(update_fields=['status', 'progress'])

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
                raise RuntimeError(FILE_NOT_FOUND)
            input_file = video_files[0]

            # -----------------------------
            # 6. FFmpeg → HLS
            # -----------------------------
            playlist = transcoded_dir / 'index'
            subprocess.run(
                [
                    'ffmpeg',
                    '-y',
                    '-i',
                    str(input_file),

                    '-c:v',
                    'libx264',
                    '-preset',
                    'veryfast',
                    '-crf',
                    '23',

                    '-c:a',
                    'aac',
                    '-b:a',
                    '128k',

                    '-f',
                    'hls',
                    '-hls_time',
                    '6',
                    '-hls_list_size',
                    '0',
                    '-hls_segment_filename',
                    str(transcoded_dir / '%d.ts'),

                    str(playlist),
                ],
                check=True,
            )
            # -----------------------------
            # 7. Terminé
            # -----------------------------
            torrent.status = 'done'
            torrent.output_file = str(playlist)
            torrent.save(update_fields=['status', 'output_file'])
    except TorrentCancelled:
        torrent.status = 'cancelled'
        torrent.save(update_fields=['status'])
        shutil.rmtree(TORRENT_DIR, ignore_errors=True)
    except Exception as exc:
        torrent.status = 'error'
        torrent.error = str(exc)
        torrent.save(update_fields=['status', 'error'])
        raise
