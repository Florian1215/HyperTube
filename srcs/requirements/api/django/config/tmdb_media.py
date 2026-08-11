from config.settings import TMDB_MEDIAS_URL


def tmdb_media(path, size='original'):
    if path is None:
        return ''
    return f'{TMDB_MEDIAS_URL}/original{path}'
