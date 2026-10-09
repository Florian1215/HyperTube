from rest_framework import serializers

from medias.models import Media
from series.models import Episode
from users.models import UserHistory, UserWatchlist


def get_progress_ratio(watched, total):
    if total and watched >= total:
        return {'complete': True, 'pourcent': 100}
    return {'complete': False, 'pourcent': int(100 * watched / total) if total else 0}


def count_watched_episodes(user, **filters):
    return UserHistory.objects.filter(user=user, complete=True, **filters).values('episode').distinct().count()


def get_season_progress(season, user):
    return get_progress_ratio(count_watched_episodes(user, episode__season=season), season.episodes.count())


def get_serie_progress(serie, user):
    res = {'progress': 0, 'complete': False, 'pourcent': 0, 'watched_at': None}
    last = UserHistory.objects.filter(user=user, media=serie).order_by('-updated_at').first()
    if last is None:
        return res
    res['progress'] = last.progress
    res['watched_at'] = last.watched_at
    watched = count_watched_episodes(user, media=serie, episode__season__season_number__gte=1)
    res.update(get_progress_ratio(watched, serie.number_of_episodes))
    return res


def get_next_episode(serie, user):
    res = {'season_number': 1, 'episode_number': 1, 'progress': 0}
    if not user:
        return res
    history = UserHistory.objects.filter(user=user, media=serie, episode__isnull=False)
    last = history.order_by('-updated_at', '-episode__season__season_number', '-episode__episode_number').first()
    if last is None:
        return res

    season_number = last.episode.season.season_number
    episode_number = last.episode.episode_number
    if last.complete:
        if Episode.objects.filter(season=last.episode.season, episode_number__gt=episode_number).exists():
            episode_number += 1
        elif season_number < (serie.number_of_seasons or 0):
            season_number, episode_number = season_number + 1, 1
        else:
            return res
    res['season_number'] = season_number
    res['episode_number'] = episode_number
    current = history.filter(episode__season__season_number=season_number, episode__episode_number=episode_number
                             ).order_by('-updated_at').first()
    if current and not current.complete:
        res['progress'] = current.progress
    return res


def remove_watched_from_watchlist(user, media):
    if media.type == 'series' and not get_serie_progress(media, user)['complete']:
        return
    UserWatchlist.objects.filter(user=user, media=media).delete()


class MediaProgressMixin(serializers.Serializer):
    progress = serializers.SerializerMethodField()
    complete = serializers.SerializerMethodField()
    pourcent = serializers.SerializerMethodField()
    watched_at = serializers.SerializerMethodField()

    @staticmethod
    def get_media_type(obj):
        if type(obj) is dict:
            return 'series' if 'first_air_date' in obj else 'movies'
        return getattr(obj, 'type', None)

    def get_history(self, obj):
        try:
            if self.context['user_history']:
                if type(obj) is dict:
                    res = UserHistory.objects.filter(media__tmdb_id=obj['id'], media__type=self.get_media_type(obj),
                                                     user=self.context['user_history'])
                else:
                    res = obj.history.filter(user=self.context['user_history'])
                return res.order_by('-updated_at').first()
        except UserHistory.DoesNotExist:
            pass
        return None

    def get_progress_field(self, obj, field, default):
        if self.context['user_history'] and self.get_media_type(obj) == 'series':
            if type(obj) is dict:
                obj = Media.objects.filter(tmdb_id=obj['id'], type='series').first()
            if obj is None:
                return default
            return get_serie_progress(obj, self.context['user_history'])[field]
        h = self.get_history(obj)
        return getattr(h, field) if h else default

    def get_progress(self, obj):
        return self.get_progress_field(obj, 'progress', 0)

    def get_complete(self, obj):
        return self.get_progress_field(obj, 'complete', False)

    def get_pourcent(self, obj):
        return self.get_progress_field(obj, 'pourcent', 0)

    def get_watched_at(self, obj):
        return self.get_progress_field(obj, 'watched_at', None)


class MediaWatchlistMixin(serializers.Serializer):
    in_watchlist = serializers.SerializerMethodField()

    def get_in_watchlist(self, obj):
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            return False
        if 'watchlist' not in self.context:
            self.context['watchlist'] = set(UserWatchlist.objects.filter(user=request.user)
                                            .values_list('media__type', 'media__tmdb_id'))
        if type(obj) is dict:
            return (MediaProgressMixin.get_media_type(obj), obj['id']) in self.context['watchlist']
        media = getattr(obj, 'media', obj)
        return (media.type, media.tmdb_id) in self.context['watchlist']
