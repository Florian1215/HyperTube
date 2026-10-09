from collections.abc import Mapping

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from config.errors import PROGRESS_NOT_FOUND
from medias.context import LangHistoryContext
from medias.fetch import get_or_fetch_media
from medias.progress import get_serie_progress, remove_watched_from_watchlist
from series.fetch import get_or_fetch_season
from series.serializers import SeasonSerializer


class SerieSeasonAPIView(LangHistoryContext, generics.RetrieveAPIView):
    serializer_class = SeasonSerializer

    def get_object(self):
        serie = get_or_fetch_media(self.request, self.kwargs['media_id'], 'series')
        season = get_or_fetch_season(self.request, serie, self.kwargs['season_number'])
        return season


class SeriesWatchedAPIView(APIView):
    def get_season_number(self):
        data = self.request.data
        season_number = data.get('season_number') if isinstance(data, Mapping) else None
        if season_number is None:
            return None
        try:
            return int(season_number)
        except (TypeError, ValueError):
            raise ValidationError()

    def post(self, request, media_id):
        media = get_or_fetch_media(request, media_id, 'series')
        season_number = self.get_season_number()
        if season_number is None:
            season_numbers = range(1, (media.number_of_seasons or 0) + 1)
        else:
            season_numbers = [season_number]

        now = timezone.now()
        for n in season_numbers:
            season = get_or_fetch_season(request, media, n)
            for episode in season.episodes.all():
                history = episode.history.filter(user=request.user)
                if history.exists():
                    history.filter(complete=False).update(complete=True, pourcent=100, watched_at=None, updated_at=now)
                else:
                    episode.history.create(user=request.user, media=media, complete=True, pourcent=100)
        remove_watched_from_watchlist(request.user, media)
        return Response(get_serie_progress(media, request.user), status=status.HTTP_201_CREATED)

    def delete(self, request, media_id):
        media = get_or_fetch_media(request, media_id, 'series')
        season_number = self.get_season_number()

        query = request.user.history.filter(media=media)
        if season_number is not None:
            query = query.filter(episode__season__season_number=season_number)
        count, _ = query.delete()
        if count == 0:
            raise NotFound(PROGRESS_NOT_FOUND)
        return Response(get_serie_progress(media, request.user), status=status.HTTP_200_OK)
