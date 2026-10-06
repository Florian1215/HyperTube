import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from typing import BinaryIO, List
import logging


DEFAULT_AUDIO_MAP = '0:a:0'
PROBE_SIZE = 10 * 1024 * 1024

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


@dataclass
class FFProbeStream:
    index: int
    codec_type: str
    codec_name: str
    language: str = ''
    title: str = ''


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
        tags = stream.get('tags', {})
        streams.append(
            FFProbeStream(
                index=stream.get('index', -1),
                codec_type=stream.get('codec_type', ''),
                codec_name=stream.get('codec_name', ''),
                language=tags.get('language', ''),
                title=tags.get('title', ''),
            )
        )
    return streams


def video_codec_name(streams: List[FFProbeStream]) -> str:
    for stream in streams:
        if stream.codec_type == 'video':
            return stream.codec_name
    return ''


def has_audio_stream(streams: List[FFProbeStream]) -> bool:
    return any(stream.codec_type == 'audio' for stream in streams)


def audio_map_for_language(streams: List[FFProbeStream], original_lang: str) -> str:
    if not has_audio_stream(streams):
        return ''
    if not original_lang:
        return DEFAULT_AUDIO_MAP
    lang = original_lang.strip().lower()
    wanted = {lang}
    wanted.update(ISO639_1_TO_2.get(lang, []))
    for stream in streams:
        if stream.codec_type != 'audio':
            continue
        stream_language = stream.language.strip().lower()
        if stream_language in wanted:
            return f'0:{stream.index}'
    return DEFAULT_AUDIO_MAP


def audio_args(audio_map: str) -> List[str]:
    if not audio_map:
        return []
    return [
        '-map',
        audio_map,
        '-c:a',
        'aac',
        '-b:a',
        '256k',
        '-ac',
        '2',
    ]


def build_h264_args(input_path: str, playlist: str, audio_map: str) -> List[str]:
    args = [
        '-i',
        input_path,
        '-map',
        '0:v:0',
        '-c:v',
        'copy',
    ]
    args.extend(audio_args(audio_map))
    args.extend(
        [
            '-bsf:v',
            'h264_mp4toannexb',
            '-avoid_negative_ts',
            'make_zero',
            '-hls_time',
            '5',
            '-hls_list_size',
            '0',
            '-hls_flags',
            'append_list',
            '-f',
            'hls',
            playlist,
        ]
    )
    return args


def build_hevc_args(input_path: str, playlist: str, audio_map: str) -> List[str]:
    args = [
        '-i',
        input_path,
        '-map',
        '0:v:0',
        '-c:v',
        'copy',
    ]
    args.extend(audio_args(audio_map))
    args.extend(
        [
            '-bsf:v',
            'hevc_mp4toannexb',
            '-avoid_negative_ts',
            'make_zero',
            '-hls_time',
            '5',
            '-hls_list_size',
            '0',
            '-hls_flags',
            'append_list',
            '-f',
            'hls',
            playlist,
        ]
    )
    return args


def default_transcode_args(input_path: str, playlist: str, audio_map: str) -> List[str]:
    args = [
        '-i',
        input_path,
        '-map',
        '0:v:0',

        '-c:v',
        'h264_videotoolbox',

        '-b:v',
        '5M',
        '-maxrate',
        '7M',
        '-bufsize',
        '10M',
    ]
    args.extend(audio_args(audio_map))
    args.extend(
        [
            '-bsf:v',
            'h264_mp4toannexb',
            '-avoid_negative_ts',
            'make_zero',
            '-hls_time',
            '5',
            '-hls_list_size',
            '0',
            '-hls_flags',
            'append_list',
            '-f',
            'hls',
            playlist,
        ]
    )
    return args


def convert_pipe_hls(reader: BinaryIO, playlist: str, original_lang: str = '') -> None:
    """reader does not need to be seekable or complete: ffmpeg is fed as the data arrives."""
    video_codec = ''
    audio_map = DEFAULT_AUDIO_MAP

    head = read_head(reader, PROBE_SIZE)
    try:
        streams = probe_streams(head)
        video_codec = video_codec_name(streams)
        audio_map = audio_map_for_language(streams, original_lang)
        logging.info('source video codec: %s, original language: %r, selected audio map: %s', video_codec, original_lang, audio_map)
    except Exception as exc:
        logging.warning('probe streams failed: %s', exc)

    if video_codec == 'h264':
        args = build_h264_args('pipe:0', playlist, audio_map)
    elif video_codec == 'hevc':
        args = build_hevc_args('pipe:0', playlist, audio_map)
    else:
        args = default_transcode_args('pipe:0', playlist, audio_map)
    with tempfile.TemporaryFile() as stderr:
        process = subprocess.Popen(['ffmpeg', *args], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=stderr)
        try:
            process.stdin.write(head)
            shutil.copyfileobj(reader, process.stdin, 1024 * 1024)
            process.stdin.close()
        except BrokenPipeError:
            # ffmpeg stopped before the end of the input, its error is raised below
            pass
        except BaseException:
            process.kill()
            raise
        finally:
            process.wait()
        if process.returncode != 0:
            stderr.seek(0)
            raise RuntimeError(f'ffmpeg: {process.returncode}\n{stderr.read().decode(errors="replace")}')
