from django.urls import path

from comments.views import CommentAPIView, CommentMovieAPIView, CommentUserAPIView

urlpatterns = [
    path("comments/", CommentAPIView.as_view(), name="user"),
    path("users/<int:user_id>/comments/", CommentUserAPIView.as_view(), name="user-comments"),
    path("movies/<int:movie_id>/comments/", CommentMovieAPIView.as_view(), name="movie-comments")
]
