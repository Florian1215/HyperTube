from django.urls import path

from comments.views import CommentAPIView, CommentMovieAPIView, CommentUserAPIView

urlpatterns = [
    path("comments/", CommentAPIView.as_view(), name="user"),
    path("users/<int:pk>/comments/", CommentUserAPIView.as_view(), name="user-comments"),
    path("movies/<int:pk>/comments/", CommentMovieAPIView.as_view(), name="movie-comments")
]
