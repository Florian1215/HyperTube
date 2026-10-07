from django.urls import path, include
from rest_framework.routers import DefaultRouter

from users.views import UserViewSet, UserHistoryApiView, UserFollowingActivityApiView

router = DefaultRouter()
router.register('users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('users/<int:user_id>/history/', UserHistoryApiView.as_view(), name='user-history'),
    path('users/following/activity/', UserFollowingActivityApiView.as_view(), name='user-following-activity')
]
