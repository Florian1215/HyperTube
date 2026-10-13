from django.urls import path

from comments.views import CommentAPIView, CommentMediaAPIView, CommentUserAPIView
from medias.urls import get_media_path

urlpatterns = [
    path('comments/<int:pk>/', CommentAPIView.as_view(), name='comment'),
    path('users/<int:user_id>/comments/', CommentUserAPIView.as_view(), name='user-comments'),
    get_media_path(CommentMediaAPIView, '/comments', name='media-comments', media_id=True)
]
