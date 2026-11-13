import json
import os
import shutil
import subprocess
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, List, Optional, Union
import struct
import logging

from werkzeug.exceptions import ClientDisconnected


PROBE_SIZE = 10 * 1024 * 1024
MAX_AUDIO_TRACKS = 8
TEXT_SUBTITLE_CODECS = ('subrip', 'srt', 'ass', 'ssa', 'mov_text', 'webvtt', 'text')
MASTER_PLAYLIST = 'stream.m3u8'
TRACKS_FILE = 'tracks.json'
SUBTITLE_PART_SUFFIX = '.part'
SUBTITLE_PUBLISH_INTERVAL = 2

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
        try:
            chunk = reader.read(size)
        except OSError as exc:
            raise ClientDisconnected() from exc
        if not chunk:
            break
        chunks.append(chunk)
        size -= len(chunk)
    return b''.join(chunks)


def probe_streams(source: Union[bytes, Path]) -> List[FFProbeStream]:
    """Probe either the first bytes of the stream or a complete file on disk."""
    is_file = isinstance(source, Path)
    process = subprocess.run([
        'ffprobe',
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_streams',
        str(source) if is_file else 'pipe:0',
    ], input=None if is_file else source, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

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


H264_ARGS = [
    '-c:v',
    'h264_videotoolbox',
    '-b:v',
    '5M',
    '-maxrate',
    '7M',
    '-bufsize',
    '10M',
    # a keyframe at each segment start: players can start decoding anywhere (resume, seek)
    '-force_key_frames',
    'expr:gte(t,n_forced*5)',
    '-bsf:v',
    'h264_mp4toannexb',
]


def input_args(video_codec: str) -> List[str]:
    # HEVC is decoded on the GPU, so the frames stay there for scale_vt
    if video_codec == 'hevc':
        return ['-hwaccel', 'videotoolbox', '-hwaccel_output_format', 'videotoolbox_vld']
    return []


def video_args(video_codec: str) -> List[str]:
    if video_codec == 'h264':
        return ['-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb']
    if video_codec == 'hevc':
        # HEVC is not copied: browsers without HEVC support cannot play it, and x265 open GOPs
        # (segments starting on CRA frames) cannot be decoded after a seek by Firefox.
        # Re-encoded to H.264, at most 1080p, HDR tone-mapped to SDR.
        return [
            '-vf',
            "scale_vt=w='min(1920,iw)':h=-2:color_matrix=bt709:color_primaries=bt709:color_transfer=bt709",
            *H264_ARGS,
        ]
    return H264_ARGS


AUDIO_ARGS = ['-c:a', 'aac', '-b:a', '256k', '-ac', '2']
HLS_ARGS = ['-avoid_negative_ts', 'make_zero', '-hls_time', '5', '-hls_list_size', '0', '-hls_flags', 'append_list+temp_file']


def build_args(input_path: str, output_dir: Path, video_codec: str, tracks: dict) -> List[str]:
    args = [*input_args(video_codec), '-i', input_path, '-map', '0:v:0']
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
        args.extend(['-map', f'0:{track["stream"]}', '-c:s', 'webvtt', '-flush_packets', '1', '-f', 'webvtt', str(output_dir / (track['file'] + SUBTITLE_PART_SUFFIX))])
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


def publish_subtitles(output_dir: Path, tracks: dict, process: subprocess.Popen) -> None:
    sizes = {}
    while True:
        ended = process.poll() is not None
        for track in tracks['subtitles']:
            part = output_dir / (track['file'] + SUBTITLE_PART_SUFFIX)
            try:
                content = part.read_bytes()
            except FileNotFoundError:
                continue
            if sizes.get(track['file']) != len(content):
                sizes[track['file']] = len(content)
                tmp = output_dir / (track['file'] + '.tmp')
                tmp.write_bytes(content)
                os.replace(tmp, output_dir / track['file'])
            if ended:
                part.unlink(missing_ok=True)
        if ended:
            return
        try:
            process.wait(timeout=SUBTITLE_PUBLISH_INTERVAL)
        except subprocess.TimeoutExpired:
            pass


def needs_seekable_input(head: bytes) -> bool:
    """MP4/MOV whose index (moov) comes after the media data (mdat): ffmpeg has to seek back
    to the start of the file once it has read the index, which a pipe cannot do."""
    if head[4:8] != b'ftyp':
        return False
    pos = 0
    while pos + 8 <= len(head):
        size, kind = struct.unpack('>I4s', head[pos:pos + 8])
        if kind == b'moov':
            return False
        if kind == b'mdat':
            return True
        if size == 1:
            if pos + 16 > len(head):
                return False
            size = struct.unpack('>Q', head[pos + 8:pos + 16])[0]
        if size < 8:
            return False
        pos += size
    return False


def copy_upload(reader: BinaryIO, writer: BinaryIO) -> None:
    try:
        shutil.copyfileobj(reader, writer, 1024 * 1024)
    except OSError as exc:
        # werkzeug raises 'Invalid chunk header' when the chunked upload ends without its final chunk
        if isinstance(exc, ClientDisconnected) or 'chunk' in str(exc).lower():
            raise ClientDisconnected() from exc
        raise


def probe_tracks(source: Union[bytes, Path], preferred_lang: str) -> Optional[tuple]:
    try:
        streams = probe_streams(source)
        video_codec = video_codec_name(streams)
        if not video_codec:
            raise RuntimeError('no video stream')
    except Exception as exc:
        logging.warning('probe streams failed: %s', exc)
        return None
    tracks = select_tracks(streams, preferred_lang)
    logging.info('source video codec: %s, preferred language: %r, tracks: %s', video_codec, preferred_lang, tracks)
    return video_codec, tracks


def run_ffmpeg(input_path: str, output_dir: Path, probed: Optional[tuple], feed=None) -> dict:
    """Transcode input_path to HLS; when feed is given, it writes the source into ffmpeg's stdin."""
    tracks = {'audio': [], 'subtitles': []}
    if probed:
        video_codec, tracks = probed
        args = build_args(input_path, output_dir, video_codec, tracks)
    else:
        args = build_legacy_args(input_path, output_dir)
    write_file(output_dir / TRACKS_FILE, json.dumps(tracks))

    with tempfile.TemporaryFile() as stderr:
        stdin = subprocess.PIPE if feed else subprocess.DEVNULL
        process = subprocess.Popen(['ffmpeg', *args], stdin=stdin, stdout=subprocess.DEVNULL, stderr=stderr)
        threads = []
        if probed:
            threads.append(threading.Thread(target=write_master_playlist, args=(output_dir, tracks, process), daemon=True))
            threads.append(threading.Thread(target=publish_subtitles, args=(output_dir, tracks, process), daemon=True))
        for thread in threads:
            thread.start()
        try:
            if feed:
                feed(process.stdin)
                process.stdin.close()
        except BrokenPipeError:
            pass
        except BaseException:
            process.kill()
            raise
        finally:
            process.wait()
            for thread in threads:
                thread.join()
        if process.returncode != 0:
            stderr.seek(0)
            raise RuntimeError(f'ffmpeg: {process.returncode}\n{stderr.read().decode(errors="replace")}')
    return tracks


def convert_pipe_hls(reader: BinaryIO, output_dir: Path, preferred_lang: str = '') -> dict:
    head = read_head(reader, PROBE_SIZE)
    probed = None if needs_seekable_input(head) else probe_tracks(head, preferred_lang)

    if probed:
        def feed(stdin: BinaryIO) -> None:
            stdin.write(head)
            copy_upload(reader, stdin)

        return run_ffmpeg('pipe:0', output_dir, probed, feed)

    # The start of the stream is not enough to decode it (e.g. MP4 with its index at the end):
    # store the whole upload on disk, then transcode the file, where ffmpeg can seek.
    logging.warning('source cannot be streamed, buffering the whole upload to disk before transcoding')
    with tempfile.NamedTemporaryFile(dir=output_dir, prefix='.source-', suffix='.tmp') as source:
        source.write(head)
        copy_upload(reader, source)
        source.flush()
        path = Path(source.name)
        return run_ffmpeg(str(path), output_dir, probe_tracks(path, preferred_lang))
