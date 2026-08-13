from django.urls import path, include
from rest_framework.routers import DefaultRouter
from movies.views import MovieViewSet, MovieFeatureViewSet, MoviesFeatureViewSet

router = DefaultRouter()
router.register('movies', MovieViewSet, basename='movies')
urlpatterns = [
    path('movies/featured/', MoviesFeatureViewSet.as_view(), name='movies-feature'),
    path('movies/<int:pk>/feature/', MovieFeatureViewSet.as_view(), name='movie-feature'),
    path('', include(router.urls))
]
