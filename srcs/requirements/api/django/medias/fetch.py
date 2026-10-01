from typing import Literal

from django.utils.translation import get_language_from_request
from rest_framework.exceptions import NotFound

from config.errors import MEDIA_NOT_FOUND
from config.tmdb_media import format_tmdb_image
from medias.models import Media, Genre, MediaLanguage
from medias.services.tmdb import TMDBService


def get_or_fetch_media_lang(media, lang, media_data=None):
    try:
        media_lang = media.languages.get(lang=lang)
    except MediaLanguage.DoesNotExist:
        if media_data is None or 'title' not in media_data:
            tmdb = TMDBService(lang)
            media_data = tmdb.get_media(media.type, media.tmdb_id, False)
        media_lang = media.languages.create(title=media_data['title'], summary=media_data['overview'], lang=lang)
    return media_lang


def get_or_fetch_media(request, media_id, type: Literal['movies', 'series']):
    language = get_language_from_request(request)
    media_data = {}

    try:
        media = Media.objects.get(tmdb_id=media_id, type=type)
    except (Media.DoesNotExist, ValueError):
        try:
            tmdb = TMDBService(language)
            media_data = tmdb.get_media(type, media_id)
            kwarg = {
                'tmdb_id': media_data['id'],
                'year': media_data['release_date'][:4],
                'poster_url': format_tmdb_image(media_data['poster_path'], 'w500'),
                'backdrop_url': format_tmdb_image(media_data['backdrop_path'], 'original'),
                'original_language': media_data['original_language'],
                'rating': media_data['vote_average'],
                'vote_count': media_data['vote_count'],
                'original_title': media_data['original_title'],
                'status': media_data['status'],
                'release_date': media_data['release_date'],
                'type': type,
                'budget': media_data.get('budget'),
                'revenue': media_data.get('revenue'),
                'production_countries': [c['iso_3166_1'] for c in media_data.get('production_countries', [])],
                'production_companies': [c['name'] for c in media_data.get('production_companies', [])]
            }
            if type == 'movies':
                kwarg['runtime'] = media_data['runtime']
            else:
                kwarg['in_production'] = media_data['in_production']
                kwarg['end_date'] = media_data.get('last_air_date')
                kwarg['number_of_seasons'] = media_data['number_of_seasons']
                kwarg['number_of_episodes'] = media_data['number_of_episodes']
            media = Media.objects.create(**kwarg)
            if type == 'series':
                for creator in media_data['created_by']:
                    media.crew.create(crew_id=creator['id'], name=creator['name'], picture=format_tmdb_image(
                        creator['profile_path'], 'w300'), job='Creator')
            for genre_data in media_data['genres']:
                genre, _ = Genre.objects.get_or_create(genre_id=genre_data['id'])
                media.genres.add(genre)
            for cast in media_data['credits']['cast']:
                media.cast.create(cast_id=cast['id'], name=cast['name'], picture=format_tmdb_image(cast['profile_path'],
                                                                                                   'w300'), character=cast['character'])
            for crew in media_data['credits']['crew']:
                media.crew.create(crew_id=crew['id'], name=crew['name'], picture=format_tmdb_image(crew['profile_path'],
                                                                                                   'w300'), job=crew['job'])
            image_data = tmdb.get_images_media(type, media_id)
            for backdrop_data in image_data['backdrops'][:9]:
                backdrop, _ = media.backdrops_url.get_or_create(url=format_tmdb_image(backdrop_data['file_path'],
                                                                                      'original'))
                media.backdrops_url.add(backdrop)
        except Exception as e:
            # todo remove
            print('Error on get_or_fetch_media:', e, flush=True)
            raise NotFound(MEDIA_NOT_FOUND.format(type=type))
    get_or_fetch_media_lang(media, language, media_data)
    return media
