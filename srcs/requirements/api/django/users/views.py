from django.db.models import Exists, OuterRef, Value
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.errors import CANNOT_FOLLOW_YOURSELF
from medias.context import LangHistoryContext
from medias.serializers import MediaHistorySerializer
from users.models import User, UserFollow, UserHistory
from users.permissions import IsUserOwner
from users.serializers import UserSerializer, RegisterSerializer, UserMeSerializer, UserProfileSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by('username')
    serializer_class = UserSerializer
    lookup_field = 'id'
    search_fields = ['username']

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action == 'list' and self.request.user.is_authenticated:
            return queryset.exclude(id=self.request.user.id)
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
        elif self.action == 'me':
            return UserMeSerializer
        elif self.action in ['list', 'retrieve', 'follow']:
            return UserProfileSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['me', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsUserOwner()]
        elif self.action == 'follow':
            return [IsAuthenticated()]
        return []

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

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

    def filter_queryset(self, queryset):
        return queryset.filter(user=self.kwargs['user_id']).order_by('-updated_at')
