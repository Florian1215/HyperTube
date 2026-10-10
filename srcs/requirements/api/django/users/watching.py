from copy import copy
from datetime import date, datetime, timezone

from django.db.models import Q
from rest_framework.exceptions import APIException

from config.cache import is_released
from medias.fetch import get_or_fetch_media
from medias.models import Media
from series.models import Episode
from series.fetch import get_or_fetch_season
from torrents.models import TorrentRequest
from users.models import UserHistory


def get_next_released_episode(request, serie, episode):
    try:
        serie = get_or_fetch_media(request, serie.tmdb_id, 'series')
        season_number = episode.season.season_number
        season = get_or_fetch_season(request, serie, season_number)
        following = season.episodes.filter(episode_number__gt=episode.episode_number).order_by('episode_number').first()
        if following is None and season_number < (serie.number_of_seasons or 0):
            following = get_or_fetch_season(request, serie, season_number + 1).episodes.order_by('episode_number').first()
    except APIException:
        return None
    if following is None or not following.release_date or not is_released(following.release_date):
        return None
    return following


def get_continue_watching(request, user_id):
    last_watched = UserHistory.objects.filter(user=user_id).select_related('media', 'episode__season').order_by(
        'media', '-updated_at', '-episode__season__season_number', '-episode__episode_number'
    ).distinct('media')
    items = []
    for history in last_watched:
        date = history.updated_at
        if history.complete:
            if history.episode is None:
                continue
            following = get_next_released_episode(request, history.media, history.episode)
            if following is None:
                continue
            released_at = datetime.fromisoformat(following.release_date[:10]).replace(tzinfo=timezone.utc)
            date = max(date, released_at)
            history = UserHistory(user_id=user_id, media=history.media, episode=following)
        elif history.progress <= 0:
            continue
        history.rewatch = False
        items.append((date, history))
    watching = {history.media_id for _, history in items}
    requests = TorrentRequest.objects.filter(user=user_id, available_at__isnull=False)
    for torrent_request in requests.select_related('media', 'episode__season').order_by('-available_at'):
        if torrent_request.media_id in watching:
            continue
        watching.add(torrent_request.media_id)
        history = UserHistory(user_id=user_id, media=torrent_request.media, episode=torrent_request.episode)
        history.rewatch = False
        items.append((torrent_request.available_at, history))
    items.sort(key=lambda item: item[0], reverse=True)
    return [history for _, history in items]


def get_coming_soon(request, user_id):
    today = date.today().isoformat()
    followed = Media.objects.filter(Q(watchlist__user=user_id) | Q(type='series', history__user=user_id)).distinct()
    items = []
    for media in followed:
        if media.type == 'movies' and media.release_date and media.release_date <= today:
            continue
        if media.type == 'series' and media.in_production is False:
            continue
        try:
            media = get_or_fetch_media(request, media.tmdb_id, media.type)
            if media.type == 'series' and media.number_of_seasons:
                get_or_fetch_season(request, media, media.number_of_seasons)
        except APIException:
            pass
        if media.type == 'series':
            episodes = Episode.objects.filter(serie=media, release_date__gt=today, season__season_number__gte=1)
            for episode in episodes.select_related('season').order_by('season__season_number', 'episode_number'):
                item = copy(media)
                item.coming_episode, item.coming_date = episode, episode.release_date
                items.append(item)
        elif media.release_date > today:
            media.coming_episode, media.coming_date = None, media.release_date
            items.append(media)
    items.sort(key=lambda media: media.coming_date)
    return items
