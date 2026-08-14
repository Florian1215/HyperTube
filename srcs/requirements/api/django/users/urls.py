from django.urls import path, include
from rest_framework.routers import DefaultRouter

from users.views import UserViewSet, UserHistoryApiView

router = DefaultRouter()
router.register("users", UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('users/<int:user_id>/history/', UserHistoryApiView.as_view(), name='user-history')
]
