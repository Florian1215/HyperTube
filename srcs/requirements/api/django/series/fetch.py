from django.utils.translation import get_language_from_request
from rest_framework.exceptions import NotFound

from config.errors import MEDIA_NOT_FOUND
from config.tmdb_media import format_tmdb_image
from medias.services.tmdb import TMDBService
from series.models import Season, SeasonLanguage, Episode


def get_or_fetch_season_lang(season, lang, season_data=None):
    try:
        season_lang = season.languages.get(lang=lang)
    except SeasonLanguage.DoesNotExist:
        if season_data is None or 'name' not in season_data:
            tmdb = TMDBService(lang)
            season_data = tmdb.get_season(season.serie.tmdb_id, season.season_number, False)
        season_lang = season.languages.create(name=season_data['name'], overview=season_data['overview'], lang=lang)
        for episode_data in season_data['episodes']:
            try:
                episode = season.episodes.get(episode_number=episode_data['episode_number'])
                episode.languages.create(
                    name=episode_data['name'],
                    overview=episode_data['overview'],
                    lang=lang
                )
            except Episode.DoesNotExist:
                pass
    return season_lang


def get_or_fetch_season(request, serie, season_number):
    language = get_language_from_request(request)
    season_data = {}

    try:
        season = Season.objects.get(serie=serie, season_number=season_number)
    except (Season.DoesNotExist, ValueError):
        try:
            tmdb = TMDBService(language)
            season_data = tmdb.get_season(serie.tmdb_id, season_number)
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
            print("--> CREATION season test", serie.original_title, season_data['name'], flush=True)
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
        except Exception as e:
            # todo remove
            print('Error on get_or_fetch_season:', e, flush=True)
            raise NotFound(MEDIA_NOT_FOUND.format(type='season'))
    get_or_fetch_season_lang(season, language, season_data)
    return season
