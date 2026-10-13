from django.urls import path, include
from rest_framework.routers import DefaultRouter

from users.views import UserViewSet, UserHistoryApiView, UserFollowingActivityApiView, UserWatchlistApiView, \
    UserContinueWatchingApiView, UserComingSoonApiView

from medias.urls import get_media_path

router = DefaultRouter()
router.register('users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('users/<int:user_id>/history/', UserHistoryApiView.as_view(), name='user-history'),
    path('users/<int:user_id>/continue-watching/', UserContinueWatchingApiView.as_view(), name='user-continue-watching'),
    path('users/<int:user_id>/coming-soon/', UserComingSoonApiView.as_view(), name='user-coming-soon'),
    path('users/<int:user_id>/watchlist/', UserWatchlistApiView.as_view(), name='user-watchlist'),
    get_media_path(UserContinueWatchingApiView, 'continue-watching', name='medias-continue-watching'),
    get_media_path(UserComingSoonApiView, 'upcoming', name='medias-upcoming'),
    get_media_path(UserFollowingActivityApiView, 'friends-activity', name='medias-friends-activity'),
    path('users/following/activity/', UserFollowingActivityApiView.as_view(), name='user-following-activity')
]
