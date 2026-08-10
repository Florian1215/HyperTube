from django.urls import path, include
from rest_framework.routers import DefaultRouter
from movies.views import MovieViewSet

router = DefaultRouter()
router.register("movies", MovieViewSet, basename="movies")

urlpatterns = [
    path("", include(router.urls))
]
