from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.errors import TV_DEVICE_REQUIRED, TV_OFFLINE, TV_CAST_INVALID
from users.models import TvDevice

# The TV polls every few seconds, it is offline once it stopped for longer
ONLINE_TIMEOUT = timedelta(seconds=15)
MEDIA_TYPES = ('movies', 'series')


def online_devices(user):
    return TvDevice.objects.filter(user=user, polled_at__gte=timezone.now() - ONLINE_TIMEOUT)


def positive_int(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValidationError(TV_CAST_INVALID)
    return value


class TvStatusView(APIView):
    """GET tv/: whether a TV app is signed in with the user and open, the website then shows the cast button"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'online': online_devices(request.user).exists()})


class TvCastView(APIView):
    """POST tv/cast/: opens a media on the TVs of the user, the episode of a series is optional"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        media_type = request.data.get('type')
        media_id = str(request.data.get('id', ''))
        if media_type not in MEDIA_TYPES or not media_id.isdigit():
            raise ValidationError(TV_CAST_INVALID)
        cast = {'type': media_type, 'id': media_id}
        if media_type == 'series':
            season, episode = positive_int(request.data.get('season')), positive_int(request.data.get('episode'))
            if (season is None) != (episode is None):
                raise ValidationError(TV_CAST_INVALID)
            if season is not None:
                cast.update(season=season, episode=episode)

        # update() keeps polled_at, so a cast does not make an offline TV look online
        if not online_devices(request.user).update(cast=cast):
            raise NotFound(TV_OFFLINE)
        return Response({'status': 'sent'})


class TvPollView(APIView):
    """GET tv/poll/?device=<id>: polled by the TV app, keeps it online and gives the media cast since the last poll"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        device = request.query_params.get('device', '').strip()
        if not device or len(device) > 64:
            raise ValidationError(TV_DEVICE_REQUIRED)
        # A device belongs to the account in use on the TV, switching account moves it
        tv, created = TvDevice.objects.get_or_create(device=device, defaults={'user': request.user})
        if created:
            return Response({'cast': None})
        cast = tv.cast if tv.user_id == request.user.id else None
        tv.user = request.user
        tv.cast = None
        tv.save()
        return Response({'cast': cast})
