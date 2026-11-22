from django.urls import path

from updates.views import CurrentUpdateApiView

urlpatterns = [
    path('updates/current/', CurrentUpdateApiView.as_view(), name='current_update'),
]
