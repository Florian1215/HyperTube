from django.urls import path
from movies.views import MoviesListView, MovieApiView, MovieFeatureApiView, MoviesFeatureApiView

urlpatterns = [
    path('movies/featured/', MovieFeatureApiView.as_view(), name='movies-feature'),
    path('movies/<int:pk>/feature/', MoviesFeatureApiView.as_view(), name='movie-feature'),
    path('movies/', MoviesListView.as_view(), name='movies-search'),
    path('movie/<int:pk>/', MovieApiView.as_view(), name='movie-detail'),
]
