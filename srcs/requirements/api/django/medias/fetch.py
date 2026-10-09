from typing import Literal

from django.db import IntegrityError, transaction
from django.utils.translation import get_language_from_request

from config.errors import MEDIA_NOT_FOUND
from config.exceptions import external_service
from config.tmdb_media import format_tmdb_image
from medias.models import Media, Genre, MediaLanguage
from medias.pagination import fetch_tmdb_page
from medias.services.tmdb import TMDBService


def get_or_fetch_media_lang(media, lang, media_data=None):
    try:
        media_lang = media.languages.get(lang=lang)
    except MediaLanguage.DoesNotExist:
        with external_service('TMDB', MEDIA_NOT_FOUND.format(type=media.type)):
            if media_data is None or 'title' not in media_data:
                tmdb = TMDBService(lang)
                media_data = tmdb.get_media(media.type, media.tmdb_id, False)
            media_lang, _ = media.languages.get_or_create(lang=lang, defaults={
                'title': media_data['title'],
                'summary': media_data['overview'],
            })
    return media_lang


def get_collection_id(media_data):
    return (media_data.get('belongs_to_collection') or {}).get('id', 0)


def create_media(type, media_data, image_data):
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
        kwarg['collection_id'] = get_collection_id(media_data)
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
    for backdrop_data in image_data['backdrops'][:9]:
        backdrop, _ = media.backdrops_url.get_or_create(url=format_tmdb_image(backdrop_data['file_path'],
                                                                              'original'))
        media.backdrops_url.add(backdrop)
    return media


def get_or_fetch_media(request, media_id, type: Literal['movies', 'series']):
    language = get_language_from_request(request)
    media_data = {}

    try:
        media = Media.objects.get(tmdb_id=media_id, type=type)
    except (Media.DoesNotExist, ValueError):
        with external_service('TMDB', MEDIA_NOT_FOUND.format(type=type)):
            tmdb = TMDBService(language)
            media_data = tmdb.get_media(type, media_id)
            image_data = tmdb.get_images_media(type, media_id)
            try:
                with transaction.atomic():
                    media = create_media(type, media_data, image_data)
            except IntegrityError:
                media = Media.objects.get(tmdb_id=media_data['id'], type=type)
    get_or_fetch_media_lang(media, language, media_data)
    return media


def get_media_collection(request, media):
    res = {'id': None, 'name': None, 'parts': []}
    if media.type != 'movies':
        return res
    with external_service('TMDB', MEDIA_NOT_FOUND.format(type='collection')):
        tmdb = TMDBService(get_language_from_request(request))
        if media.collection_id is None:
            media.collection_id = get_collection_id(tmdb.get_media(media.type, media.tmdb_id, False))
            media.save(update_fields=['collection_id'])
        if not media.collection_id:
            return res
        collection = tmdb.get_collection(media.collection_id)
        res['id'] = collection['id']
        res['name'] = collection['name']
        res['parts'] = sorted(collection['parts'], key=lambda part: part.get('release_date') or '9999')
    set_custom_backdrops(res['parts'], media.type)
    return res


def fetch_search(type, query, lang, page):
    tmdb = TMDBService(lang)
    with external_service('TMDB', MEDIA_NOT_FOUND.format(type=type)):
        return fetch_tmdb_page(lambda tmdb_page: tmdb.search_medias(type, query=query, page=tmdb_page), page)


def set_custom_backdrops(medias_data, type):
    backdrops = dict(Media.objects.filter(type=type, tmdb_id__in=[m['id'] for m in medias_data])
                     .values_list('tmdb_id', 'backdrop_url'))
    for media_data in medias_data:
        if backdrops.get(media_data['id']):
            media_data['backdrop_url'] = backdrops[media_data['id']]
    return medias_data
