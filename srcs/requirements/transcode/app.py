from pathlib import Path
import json
import subprocess
from threading import Thread

from flask import Flask, request, jsonify

from ffmpeg import convert_pipe_hls

app = Flask(__name__)

base_dir = Path(__file__).parent.parent.parent.parent / 'medias'


def run_transcode(input_file: str, playlist: str, language: str):
    try:
        with open(input_file, 'rb') as f:
            convert_pipe_hls(
                reader=f,
                playlist=playlist,
                original_lang=language,
            )
    except Exception as e:
        print(f"Transcode error : {e}")


@app.post('/transcode')
def transcode():
    data = request.json
    language = data['preferred_language']
    input_file = base_dir / 'torrents' / data['input_file']
    output_dir = base_dir / 'streams' / data['torrent_id']
    output_dir.mkdir(parents=True, exist_ok=True)
    playlist = output_dir / 'stream.m3u8'

    thread = Thread(
        target=run_transcode,
        args=(input_file, playlist, language),
        daemon=True,
    )
    thread.start()

    return jsonify({
        'status': 'success',
        'language': language,
        'playlist': str(playlist),
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5024)
