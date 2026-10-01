from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from comments.models import Comment
from comments.serializers import CommentSerializer, CommentDetailSerializer
from comments.permissions import IsOwner
from medias.context import LangHistoryContext
from medias.fetch import get_or_fetch_media


class CommentAPIView(generics.RetrieveUpdateDestroyAPIView):
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['updated_at']
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwner]
    serializer_class = CommentSerializer
    queryset = Comment.objects.all()


class CommentMediaAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = CommentSerializer
    ordering_fields = ['updated_at']

    def get_queryset(self):
        media = get_or_fetch_media(self.request, **self.kwargs)
        return Comment.objects.filter(media=media)

    def perform_create(self, serializer):
        media = get_or_fetch_media(self.request, **self.kwargs)
        serializer.save(user=self.request.user, media=media)


class CommentUserAPIView(LangHistoryContext, generics.ListAPIView):
    permissions_classes = []
    serializer_class = CommentDetailSerializer
    ordering_fields = ['updated_at']

    def get_queryset(self):
        return Comment.objects.filter(user=self.request.user)
