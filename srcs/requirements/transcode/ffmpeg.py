import json
import os
import shutil
import subprocess
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, List
import logging


PROBE_SIZE = 10 * 1024 * 1024
MAX_AUDIO_TRACKS = 8
TEXT_SUBTITLE_CODECS = ('subrip', 'srt', 'ass', 'ssa', 'mov_text', 'webvtt', 'text')
MASTER_PLAYLIST = 'stream.m3u8'
TRACKS_FILE = 'tracks.json'

ISO639_1_TO_2 = {
    'en': ['eng'],
    'fr': ['fre', 'fra'],
    'de': ['ger', 'deu'],
    'es': ['spa'],
    'it': ['ita'],
    'pt': ['por'],
    'ru': ['rus'],
    'ja': ['jpn'],
    'ko': ['kor'],
    'zh': ['chi', 'zho'],
    'hi': ['hin'],
    'ar': ['ara'],
    'nl': ['dut', 'nld'],
    'sv': ['swe'],
    'no': ['nor'],
    'da': ['dan'],
    'fi': ['fin'],
    'pl': ['pol'],
    'tr': ['tur'],
    'cs': ['cze', 'ces'],
    'el': ['gre', 'ell'],
    'he': ['heb'],
    'th': ['tha'],
    'uk': ['ukr'],
    'hu': ['hun'],
    'ro': ['rum', 'ron'],
}
ISO639_2_TO_1 = {code: lang for lang, codes in ISO639_1_TO_2.items() for code in codes}


@dataclass
class FFProbeStream:
    index: int
    codec_type: str
    codec_name: str
    language: str = ''
    title: str = ''
    channels: int = 0
    default: bool = False
    forced: bool = False


def read_head(reader: BinaryIO, size: int) -> bytes:
    chunks = []
    while size > 0:
        chunk = reader.read(size)
        if not chunk:
            break
        chunks.append(chunk)
        size -= len(chunk)
    return b''.join(chunks)


def probe_streams(data: bytes) -> List[FFProbeStream]:
    process = subprocess.run([
        'ffprobe',
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        'pipe:0',
    ], input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if process.returncode != 0:
        raise RuntimeError(f'ffprobe: {process.stderr.decode(errors="replace")}')
    try:
        output = json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f'ffprobe parse: {exc}') from exc
    streams = []
    for stream in output.get('streams', []):
        tags = {key.lower(): value for key, value in stream.get('tags', {}).items()}
        disposition = stream.get('disposition', {})
        streams.append(
            FFProbeStream(
                index=stream.get('index', -1),
                codec_type=stream.get('codec_type', ''),
                codec_name=stream.get('codec_name', ''),
                language=tags.get('language', ''),
                title=tags.get('title', ''),
                channels=stream.get('channels', 0),
                default=bool(disposition.get('default')),
                forced=bool(disposition.get('forced')),
            )
        )
    return streams


def video_codec_name(streams: List[FFProbeStream]) -> str:
    for stream in streams:
        if stream.codec_type == 'video':
            return stream.codec_name
    return ''


def get_language(stream: FFProbeStream) -> str:
    language = stream.language.strip().lower()
    if language in ('und', 'unk'):
        return ''
    return ISO639_2_TO_1.get(language, language)


def select_tracks(streams: List[FFProbeStream], preferred_lang: str = '') -> dict:
    audio = [{
        'stream': stream.index,
        'language': get_language(stream),
        'title': stream.title,
        'channels': stream.channels,
        'default': False,
    } for stream in streams if stream.codec_type == 'audio'][:MAX_AUDIO_TRACKS]
    preferred = preferred_lang.strip().lower()
    default = next((track for track in audio if preferred and track['language'] == preferred), audio[0] if audio else None)
    if default:
        default['default'] = True
    subtitles = [{
        'stream': stream.index,
        'language': get_language(stream),
        'title': stream.title,
        'forced': stream.forced,
    } for stream in streams if stream.codec_type == 'subtitle' and stream.codec_name in TEXT_SUBTITLE_CODECS]
    for i, track in enumerate(subtitles):
        track['file'] = f'sub_{i}.vtt'
    return {'audio': audio, 'subtitles': subtitles}


def video_args(video_codec: str) -> List[str]:
    if video_codec == 'h264':
        return ['-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb']
    if video_codec == 'hevc':
        return ['-c:v', 'copy', '-bsf:v', 'hevc_mp4toannexb']
    return [
        '-c:v',
        'h264_videotoolbox',
        '-b:v',
        '5M',
        '-maxrate',
        '7M',
        '-bufsize',
        '10M',
        '-bsf:v',
        'h264_mp4toannexb',
    ]


AUDIO_ARGS = ['-c:a', 'aac', '-b:a', '256k', '-ac', '2']
HLS_ARGS = ['-avoid_negative_ts', 'make_zero', '-hls_time', '5', '-hls_list_size', '0', '-hls_flags', 'append_list']


def build_args(input_path: str, output_dir: Path, video_codec: str, tracks: dict) -> List[str]:
    args = ['-i', input_path, '-map', '0:v:0']
    variants = ['v:0,agroup:audio' if tracks['audio'] else 'v:0']
    for i, track in enumerate(tracks['audio']):
        args.extend(['-map', f'0:{track["stream"]}'])
        variants.append(f'a:{i},agroup:audio')
    args.extend(video_args(video_codec))
    if tracks['audio']:
        args.extend(AUDIO_ARGS)
    args.extend(HLS_ARGS)
    args.extend([
        '-var_stream_map',
        ' '.join(variants),
        '-hls_segment_filename',
        str(output_dir / 'track_%v_%05d.ts'),
        '-f',
        'hls',
        str(output_dir / 'track_%v.m3u8'),
    ])
    for track in tracks['subtitles']:
        args.extend(['-map', f'0:{track["stream"]}', '-c:s', 'webvtt', '-flush_packets', '1', '-f', 'webvtt', str(output_dir / track['file'])])
    return args


def build_legacy_args(input_path: str, output_dir: Path) -> List[str]:
    return ['-i', input_path, '-map', '0:v:0', '-map', '0:a:0?', *video_args(''), *AUDIO_ARGS, *HLS_ARGS, '-f', 'hls', str(output_dir / MASTER_PLAYLIST)]


def write_file(path: Path, content: str) -> None:
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(content, encoding='utf-8')
    os.replace(tmp, path)


def audio_name(track: dict, index: int) -> str:
    name = ' - '.join(part for part in (track['language'], track['title']) if part) or 'audio'
    return f'{index + 1}. {name}'.replace('"', "'").replace('\n', ' ')


def master_playlist(tracks: dict) -> str:
    lines = ['#EXTM3U', '#EXT-X-VERSION:4']
    for i, track in enumerate(tracks['audio']):
        attributes = ['TYPE=AUDIO', 'GROUP-ID="audio"', f'NAME="{audio_name(track, i)}"']
        if track['language']:
            attributes.append(f'LANGUAGE="{track["language"]}"')
        attributes.extend([f'DEFAULT={"YES" if track["default"] else "NO"}', 'AUTOSELECT=YES', f'URI="track_{i + 1}.m3u8"'])
        lines.append('#EXT-X-MEDIA:' + ','.join(attributes))
    lines.append('#EXT-X-STREAM-INF:BANDWIDTH=5000000' + (',AUDIO="audio"' if tracks['audio'] else ''))
    lines.append('track_0.m3u8')
    return '\n'.join(lines) + '\n'


def write_master_playlist(output_dir: Path, tracks: dict, process: subprocess.Popen) -> None:
    playlists = [output_dir / f'track_{i}.m3u8' for i in range(len(tracks['audio']) + 1)]
    while True:
        ended = process.poll() is not None
        if all(playlist.is_file() for playlist in playlists):
            write_file(output_dir / MASTER_PLAYLIST, master_playlist(tracks))
            return
        if ended:
            return
        try:
            process.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            pass


def convert_pipe_hls(reader: BinaryIO, output_dir: Path, preferred_lang: str = '') -> dict:
    head = read_head(reader, PROBE_SIZE)
    tracks = {'audio': [], 'subtitles': []}
    try:
        streams = probe_streams(head)
        video_codec = video_codec_name(streams)
        if not video_codec:
            raise RuntimeError('no video stream')
        tracks = select_tracks(streams, preferred_lang)
        logging.info('source video codec: %s, preferred language: %r, tracks: %s', video_codec, preferred_lang, tracks)
        args = build_args('pipe:0', output_dir, video_codec, tracks)
    except Exception as exc:
        logging.warning('probe streams failed: %s', exc)
        streams = None
        args = build_legacy_args('pipe:0', output_dir)
    write_file(output_dir / TRACKS_FILE, json.dumps(tracks))

    with tempfile.TemporaryFile() as stderr:
        process = subprocess.Popen(['ffmpeg', *args], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=stderr)
        master = None
        if streams is not None:
            master = threading.Thread(target=write_master_playlist, args=(output_dir, tracks, process), daemon=True)
            master.start()
        try:
            process.stdin.write(head)
            shutil.copyfileobj(reader, process.stdin, 1024 * 1024)
            process.stdin.close()
        except BrokenPipeError:
            pass
        except BaseException:
            process.kill()
            raise
        finally:
            process.wait()
            if master:
                master.join()
        if process.returncode != 0:
            stderr.seek(0)
            raise RuntimeError(f'ffmpeg: {process.returncode}\n{stderr.read().decode(errors="replace")}')
    return tracks
