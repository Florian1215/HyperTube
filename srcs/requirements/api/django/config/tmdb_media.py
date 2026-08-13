from config.settings import TMDB_MEDIAS_URL

from typing import Literal

TMDBImageSize = Literal[
    'w45',
    'w92',
    'w154',
    'w185',
    'w300',
    'w342',
    'w500',
    'w780',
    'w1280',
    'original'
]


def tmdb_media(path, size: TMDBImageSize):
    if path is None:
        return ''
    return f'{TMDB_MEDIAS_URL}/{size}{path}'
