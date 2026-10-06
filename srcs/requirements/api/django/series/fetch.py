from django.db import IntegrityError, transaction
from django.utils.translation import get_language_from_request

from config.errors import MEDIA_NOT_FOUND
from config.exceptions import external_service
from config.tmdb_media import format_tmdb_image
from medias.services.tmdb import TMDBService
from series.models import Season, SeasonLanguage, Episode


def get_or_fetch_season_lang(season, lang, season_data=None):
    try:
        season_lang = season.languages.get(lang=lang)
    except SeasonLanguage.DoesNotExist:
        with external_service('TMDB', MEDIA_NOT_FOUND.format(type='season')):
            if season_data is None or 'name' not in season_data:
                tmdb = TMDBService(lang)
                season_data = tmdb.get_season(season.serie.tmdb_id, season.season_number, False)
            with transaction.atomic():
                season_lang, _ = season.languages.get_or_create(lang=lang, defaults={
                    'name': season_data['name'],
                    'overview': season_data['overview'],
                })
                for episode_data in season_data['episodes']:
                    try:
                        episode = season.episodes.get(episode_number=episode_data['episode_number'])
                        episode.languages.get_or_create(lang=lang, defaults={
                            'name': episode_data['name'],
                            'overview': episode_data['overview'],
                        })
                    except Episode.DoesNotExist:
                        pass
    return season_lang


def create_season(serie, season_data):
    try:
        url = season_data['images']['posters'][0]['file_path']
    except IndexError:
        url = season_data['poster_path']
    season = serie.seasons.create(
        season_number=season_data['season_number'],
        release_date=season_data['air_date'],
        rating=season_data['vote_average'],
        poster_url=format_tmdb_image(url, 'original')
    )
    for episode_data in season_data['episodes']:
        season.episodes.create(
            serie=serie,
            episode_number=episode_data['episode_number'],
            episode_type=episode_data['episode_type'],
            runtime=episode_data['runtime'],
            rating=episode_data['vote_average'],
            release_date=episode_data['air_date'],
            poster_url=format_tmdb_image(episode_data['still_path'], 'w500')
        )
    return season


def get_or_fetch_season(request, serie, season_number):
    language = get_language_from_request(request)
    season_data = {}

    try:
        season = Season.objects.get(serie=serie, season_number=season_number)
    except (Season.DoesNotExist, ValueError):
        with external_service('TMDB', MEDIA_NOT_FOUND.format(type='season')):
            tmdb = TMDBService(language)
            season_data = tmdb.get_season(serie.tmdb_id, season_number)
            try:
                # all or nothing: a season without all its episodes would be served as it is by the next requests
                with transaction.atomic():
                    season = create_season(serie, season_data)
            except IntegrityError:
                # created by a concurrent request
                season = Season.objects.get(serie=serie, season_number=season_data['season_number'])
    get_or_fetch_season_lang(season, language, season_data)
    return season
