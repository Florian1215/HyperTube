from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import User
from users.permissions import IsUserOwner
from users.serializers import UserSerializer, RegisterSerializer, UserUpdateSerializer, UserMeSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = "id"

    def get_serializer_class(self):
        if self.action == "create":
            return RegisterSerializer

        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer

        if self.action == "me":
            return UserMeSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsUserOwner()]

        return [IsAuthenticated()]

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
