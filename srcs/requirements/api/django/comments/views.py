from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from comments.models import Comment
from comments.serializers import CommentSerializer, CommentDetailSerializer
from comments.permissions import IsOwner
from movies.context import LangHistoryContext
from movies.views import get_or_fetch_movie


class CommentAPIView(generics.RetrieveUpdateDestroyAPIView):
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['updated_at']
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwner]
    serializer_class = CommentSerializer
    queryset = Comment.objects.all()


class CommentMovieAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = CommentSerializer
    ordering_fields = ['updated_at']

    def get_queryset(self):
        movie = get_or_fetch_movie(self.kwargs['movie_id'], self.request)
        return Comment.objects.filter(movie=movie)

    def perform_create(self, serializer):
        movie = get_or_fetch_movie(self.kwargs['movie_id'], self.request)
        serializer.save(user=self.request.user, movie=movie)


class CommentUserAPIView(LangHistoryContext, generics.ListAPIView):
    permissions_classes = []
    serializer_class = CommentDetailSerializer
    ordering_fields = ['updated_at']

    def get_queryset(self):
        return Comment.objects.filter(user=self.request.user)
