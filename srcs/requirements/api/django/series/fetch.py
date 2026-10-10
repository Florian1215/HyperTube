from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.translation import get_language_from_request

from config.cache import LIFETIME_MOVING, LIFETIME_STABLE, is_outdated, is_recent, is_released, keep_saved_data
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


def get_season_fields(season_data):
    try:
        url = season_data['images']['posters'][0]['file_path']
    except IndexError:
        url = season_data['poster_path']
    return {
        'release_date': season_data['air_date'] or '',
        'rating': season_data['vote_average'],
        'poster_url': format_tmdb_image(url, 'original'),
    }


def get_episode_fields(episode_data):
    return {
        'episode_type': episode_data['episode_type'],
        # not known yet for the episodes to come
        'runtime': episode_data['runtime'] or 0,
        'rating': episode_data['vote_average'],
        'release_date': episode_data['air_date'] or '',
        'poster_url': format_tmdb_image(episode_data['still_path'], 'w500'),
    }


def create_season(serie, season_data):
    season = serie.seasons.create(season_number=season_data['season_number'], **get_season_fields(season_data))
    for episode_data in season_data['episodes']:
        season.episodes.create(serie=serie, episode_number=episode_data['episode_number'],
                               **get_episode_fields(episode_data))
    return season


def get_season_lifetime(season):
    episodes = list(season.episodes.all())
    fetched_on = (season.fetched_at or season.created_at).date().isoformat()
    # an episode was released since: its name, its picture and its runtime are often only known at that time
    if any(fetched_on < episode.release_date and is_released(episode.release_date) for episode in episodes):
        return timedelta()
    last_season = season.serie.in_production and season.season_number == season.serie.number_of_seasons
    if last_season or not episodes or any(not is_released(episode.release_date) or is_recent(episode.release_date)
                                          for episode in episodes):
        return LIFETIME_MOVING
    return LIFETIME_STABLE


def refresh_season(season, lang):
    """Fetches again the season and its episodes. The episodes are updated and not created again:
    the history of the users is linked to them."""
    with external_service('TMDB', MEDIA_NOT_FOUND.format(type='season')):
        season_data = TMDBService(lang).get_season(season.serie.tmdb_id, season.season_number)
        with transaction.atomic():
            for field, value in get_season_fields(season_data).items():
                setattr(season, field, value)
            season.fetched_at = timezone.now()
            season.save()
            # the other languages are fetched again when they are asked, with the new episodes
            season.languages.exclude(lang=lang).delete()
            season.languages.update_or_create(lang=lang, defaults={
                'name': season_data['name'],
                'overview': season_data['overview'],
            })
            numbers = []
            for episode_data in season_data['episodes']:
                numbers.append(episode_data['episode_number'])
                episode, _ = season.episodes.update_or_create(episode_number=episode_data['episode_number'], defaults={
                    'serie': season.serie,
                    **get_episode_fields(episode_data),
                })
                episode.languages.update_or_create(lang=lang, defaults={
                    'name': episode_data['name'],
                    'overview': episode_data['overview'],
                })
            # removed from TMDB: only kept when a user watched it
            season.episodes.exclude(episode_number__in=numbers).filter(history__isnull=True).delete()


def get_or_fetch_season(request, serie, season_number):
    language = get_language_from_request(request)
    season_data = {}

    try:
        season = Season.objects.get(serie=serie, season_number=season_number)
        if is_outdated(season, get_season_lifetime(season)):
            with keep_saved_data(f'season {season_number} of series {serie.tmdb_id}'):
                refresh_season(season, language)
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
