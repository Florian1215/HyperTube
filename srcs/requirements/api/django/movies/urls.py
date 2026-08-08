from django.urls import path, include
from rest_framework.routers import DefaultRouter
from movies.views import MovieViewSet, GenreViewSet, MovieSearchView

router = DefaultRouter()
router.register("movies", MovieViewSet, basename="movies")
router.register("genres", GenreViewSet, basename="genres")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "test/search/",
        MovieSearchView.as_view(),
        name="movie-search"
    ),
]
