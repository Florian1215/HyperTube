from django.urls import path

from series.views import SerieSeasonAPIView, SeriesWatchedAPIView


urlpatterns = [
    path('series/<int:media_id>/season/<int:season_number>/', SerieSeasonAPIView.as_view(), name='serie-season'),
    path('series/<int:media_id>/watched/', SeriesWatchedAPIView.as_view(), name='serie-watched')
]
