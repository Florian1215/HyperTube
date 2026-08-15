from django.urls import path
from movies.views import MoviesListView, MovieApiView, MovieFeatureApiView, MoviesFeatureApiView, MovieProgressApiView

urlpatterns = [
    path('movies/', MoviesListView.as_view(), name='movies-search'),
    path('movies/top-rated/', MoviesListView.as_view(), name='movies-top-rated'),
    path('movies/featured/', MoviesFeatureApiView.as_view(), name='movies-feature'),
    path('movies/<int:movie_id>/feature/', MovieFeatureApiView.as_view(), name='movie-feature'),
    path('movies/<int:movie_id>/', MovieApiView.as_view(), name='movie-detail'),
    path('movies/<int:movie_id>/progress/', MovieProgressApiView.as_view(), name='movie-progress'),
]
