from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from comments.models import Comment
from comments.serializers import CommentSerializer, CommentDetailSerializer
from comments.permissions import IsOwner


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related("user", "movie")
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["movie", "user"]
    ordering_fields = ["updated_at"]
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CommentDetailSerializer
        return CommentSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsOwner()]
        return super().get_permissions()
