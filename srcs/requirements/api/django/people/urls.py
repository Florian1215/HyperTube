from django.urls import path

from people.views import PeopleListView, PersonApiView, PersonMediasApiView

urlpatterns = [
    path('people/', PeopleListView.as_view(), name='people-search'),
    path('people/<int:person_id>/', PersonApiView.as_view(), name='person-detail'),
    path('people/<int:person_id>/medias/', PersonMediasApiView.as_view(), name='person-medias')
]
