from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from movies.context import LangHistoryContext
from movies.serializers import MovieHistorySerializer
from users.models import User, UserHistory
from users.permissions import IsUserOwner
from users.serializers import UserSerializer, RegisterSerializer, UserMeSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action == 'create':
            return RegisterSerializer
        elif self.action == 'me':
            return UserMeSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['me', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsUserOwner()]
        return []

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class UserHistoryApiView(LangHistoryContext, generics.ListAPIView):
    queryset = UserHistory.objects.all()
    serializer_class = MovieHistorySerializer

    def filter_queryset(self, queryset):
        return queryset.filter(user=self.kwargs['user_id']).order_by('-updated_at')
