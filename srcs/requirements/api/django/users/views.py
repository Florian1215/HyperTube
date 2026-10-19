from datetime import timedelta

from django.db.models import Exists, Max, OuterRef, Q, Value
from django.utils import timezone
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.errors import CANNOT_FOLLOW_YOURSELF
from medias.context import LangHistoryContext
from medias.models import Media
from medias.serializers import MediaActivitySerializer, MediaComingSoonSerializer, MediaHistorySerializer, SmallMediaSerializer
from users.models import User, UserFollow, UserHistory
from users.permissions import IsUserOwner
from users.pictures import delete_profile_picture, save_profile_picture
from users.watching import get_coming_soon, get_continue_watching
from users.serializers import UserSerializer, RegisterSerializer, UserMeSerializer, UserProfileSerializer, \
    UserSettingsSerializer


def annotate_rewatch(queryset):
    earlier = UserHistory.objects.filter(
        Q(episode=OuterRef('episode')) | Q(episode__isnull=True),
        user=OuterRef('user'), media=OuterRef('media'), complete=True, id__lt=OuterRef('id'),
    )
    return queryset.annotate(rewatch=Exists(earlier))


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by('username')
    serializer_class = UserSerializer
    lookup_field = 'id'
    search_fields = ['username']

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action == 'list' and self.request.user.is_authenticated:
            queryset = queryset.exclude(id=self.request.user.id)
            if not self.request.query_params.get('search', '').strip():
                new_q = queryset.filter(is_following=True)
                if new_q.exists():
                    return new_q
        return queryset

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return super().get_queryset().annotate(is_following=Value(False))
        return super().get_queryset().annotate(
            is_following=Exists(UserFollow.objects.filter(follower=user, followed=OuterRef('pk')))
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return RegisterSerializer
        elif self.action in ['me', 'profile_picture']:
            return UserMeSerializer
        elif self.action in ['list', 'retrieve', 'follow']:
            return UserProfileSerializer
        elif self.action in ['update', 'partial_update']:
            return UserSettingsSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['me', 'update', 'partial_update', 'destroy', 'profile_picture']:
            return [IsAuthenticated(), IsUserOwner()]
        elif self.action == 'follow':
            return [IsAuthenticated()]
        return []

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        delete_profile_picture(instance)
        super().perform_destroy(instance)

    @action(detail=True, methods=['post', 'delete'], url_path='profile-picture',
            parser_classes=[MultiPartParser, FormParser, JSONParser])
    def profile_picture(self, request, id=None):
        user = self.get_object()
        if request.method == 'POST':
            save_profile_picture(user, request.FILES.get('file'))
        else:
            delete_profile_picture(user)
            user.profile_picture = None
            user.save(update_fields=['profile_picture'])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=['post', 'delete'], url_path='follow')
    def follow(self, request, id=None):
        user = self.get_object()
        if user == request.user:
            raise ValidationError({'detail': CANNOT_FOLLOW_YOURSELF})
        if request.method == 'POST':
            UserFollow.objects.get_or_create(follower=request.user, followed=user)
        else:
            UserFollow.objects.filter(follower=request.user, followed=user).delete()
        return Response(self.get_serializer(self.get_object()).data)


class UserHistoryApiView(LangHistoryContext, generics.ListAPIView):
    queryset = UserHistory.objects.all()
    serializer_class = MediaHistorySerializer

    def is_series(self):
        return self.request.query_params.get('type') == 'series'

    def get_serializer_class(self):
        if self.is_series():
            return SmallMediaSerializer
        return super().get_serializer_class()

    def filter_queryset(self, queryset):
        if self.is_series():
            return Media.objects.filter(type='series', history__user=self.kwargs['user_id']).annotate(
                last_watch=Max('history__updated_at')
            ).order_by('-last_watch')
        queryset = queryset.filter(user=self.kwargs['user_id'])
        media_type = self.request.query_params.get('type')
        if media_type == 'movies':
            queryset = queryset.filter(media__type=media_type)
        return annotate_rewatch(queryset).order_by('-updated_at')


class UserMediasApiView(LangHistoryContext, generics.ListAPIView):
    get_medias = None

    def get_queryset(self):
        user_id = self.kwargs.get('user_id') or self.request.user.id
        if user_id is None:
            return []
        medias = type(self).get_medias(self.request, user_id)
        media_type = self.kwargs.get('type')
        if media_type:
            medias = [media for media in medias if getattr(media, 'media', media).type == media_type]
        return medias

    def filter_queryset(self, queryset):
        return queryset


class UserContinueWatchingApiView(UserMediasApiView):
    serializer_class = MediaHistorySerializer
    get_medias = get_continue_watching


class UserComingSoonApiView(UserMediasApiView):
    serializer_class = MediaComingSoonSerializer
    get_medias = get_coming_soon


class UserWatchlistApiView(LangHistoryContext, generics.ListAPIView):
    serializer_class = SmallMediaSerializer

    def get_queryset(self):
        queryset = Media.objects.filter(watchlist__user=self.kwargs['user_id'])
        media_type = self.request.query_params.get('type')
        if media_type in ('movies', 'series'):
            queryset = queryset.filter(type=media_type)
        return queryset.order_by('-watchlist__created_at')


class UserFollowingActivityApiView(LangHistoryContext, generics.ListAPIView):
    queryset = UserHistory.objects.select_related('user', 'media', 'episode')
    serializer_class = MediaActivitySerializer
    permission_classes = [IsAuthenticated]

    def filter_queryset(self, queryset):
        filters = {'complete': True, 'watched_at__gte': timezone.now() - timedelta(days=7)}
        queryset = queryset.filter(user__followers__follower=self.request.user, **filters)
        if 'type' in self.kwargs:
            queryset = queryset.filter(media__type=self.kwargs['type'])
        return annotate_rewatch(queryset).order_by('-watched_at')
