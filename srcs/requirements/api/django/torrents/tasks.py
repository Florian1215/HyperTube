import time

import requests
from celery import shared_task
import libtorrent as lt

from config.settings import TORRENT_DIR, TRANSCODE_PORT
from torrents.models import Torrent
from torrents.parsing import find_episode_file

VIDEO_EXTENSIONS = {'.mkv', '.mp4', '.avi', '.mov', '.webm', '.m4v'}


class TorrentCancelled(Exception):
    pass


def is_cancel_requested(torrent_id):
    return Torrent.objects.filter(id=torrent_id, status='cancelled').exists()


@shared_task
def download_and_transcode(torrent_id, lang, season_number=None, episode_number=None, stream_id=None):
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

        # a series torrent can be a pack: only the file of the requested episode is downloaded
        files = info.files()
        episode_file = None
        if episode_number is not None:
            videos = [
                i for i in range(files.num_files())
                if '.' + files.file_path(i).rsplit('.', 1)[-1].lower() in VIDEO_EXTENSIONS
            ]
            if len(videos) > 1:
                found = find_episode_file([files.file_path(i) for i in videos], season_number, episode_number)
                if found is None:
                    raise RuntimeError('Episode not found in torrent')
                episode_file = videos[found]
                handle.prioritize_files([4 if i == episode_file else 0 for i in range(files.num_files())])

        def is_downloaded():
            if episode_file is None:
                return handle.is_seed()
            return handle.file_progress()[episode_file] >= files.file_size(episode_file)

        # -----------------------------
        # 3. Télécharger
        # -----------------------------
        while not is_downloaded():
            if is_cancel_requested(torrent.id):
                handle.pause()
                raise TorrentCancelled()
            if episode_file is None:
                progress = handle.status().progress * 100
            else:
                progress = handle.file_progress()[episode_file] / max(files.file_size(episode_file), 1) * 100
            torrent.progress = progress
            torrent.save(update_fields=['progress'])
            print(f'Torrent {torrent.id}: {progress:.1f}%')
            time.sleep(2)

        # -----------------------------
        # 5. Trouver la vidéo
        # -----------------------------
        if episode_file is not None:
            input_file = download_dir / files.file_path(episode_file)
        else:
            video_files = [
                p
                for p in download_dir.rglob('*')
                if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS
            ]
            if not video_files:
                raise RuntimeError('File not found')
            input_file = video_files[0]
        res = requests.post(f'http://localhost:{TRANSCODE_PORT}/transcode', json={
            'lang': lang,
            'input_file': str(input_file),
            'torrent_id': stream_id or torrent_id
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
