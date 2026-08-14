from django.urls import path
from movies.views import MoviesListView, MovieApiView, MovieFeatureApiView, MoviesFeatureApiView, MovieProgressApiView

urlpatterns = [
    path('movies/', MoviesListView.as_view(), name='movies-search'),
    path('movies/featured/', MovieFeatureApiView.as_view(), name='movies-feature'),
    path('movie/<int:movie_id>/feature/', MoviesFeatureApiView.as_view(), name='movie-feature'),
    path('movie/<int:movie_id>/', MovieApiView.as_view(), name='movie-detail'),
    path('movie/<int:movie_id>/progress/', MovieProgressApiView.as_view(), name='movie-progress'),
]
