from pathlib import Path

from flask import Flask, request, jsonify

from ffmpeg import convert_pipe_hls

app = Flask(__name__)

base_dir = Path(__file__).parent.parent.parent.parent / 'medias'


@app.post('/transcode')
def transcode():
    language = request.args['preferred_language']
    output_dir = base_dir / 'streams' / request.args['torrent_id']
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_file in [*output_dir.glob('*.m3u8'), *output_dir.glob('*.ts')]:
        old_file.unlink()
    playlist = output_dir / 'stream.m3u8'

    try:
        convert_pipe_hls(
            reader=request.stream,
            playlist=str(playlist),
            original_lang=language,
        )
    except Exception as e:
        print(f"Transcode error : {e}", flush=True)
        return jsonify({'status': 'error', 'error': str(e)}), 500

    return jsonify({
        'status': 'success',
        'language': language,
        'playlist': str(playlist),
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5024)
