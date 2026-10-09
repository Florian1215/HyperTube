from django.utils.translation import get_language_from_request
from rest_framework import generics

from config.pagination import CustomPagination
from medias.context import LangHistoryContext
from medias.pagination import TMDBPagination
from people.fetch import (PERSON_ROLES, count_watched_medias, fetch_people_search,
                          get_or_fetch_person, set_person_medias_backdrops)
from people.serializers import PeopleSerializer, PersonSerializer, PersonMediaSerializer


class PeopleListView(generics.ListAPIView):
    serializer_class = PeopleSerializer
    pagination_class = TMDBPagination
    filter_backends = []

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.tmdb_request = None

    def get_queryset(self):
        query = self.request.query_params.get('search', '').strip()
        language = get_language_from_request(self.request)
        page = self.request.query_params.get('page', 1)
        try:
            page = int(page)
        except ValueError:
            page = 1
        self.tmdb_request = fetch_people_search(query, language, page)
        return self.tmdb_request['results']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        people = self.tmdb_request['results'] if self.tmdb_request else []
        context['watched_counts'] = count_watched_medias(self.request.user, [person['id'] for person in people])
        return context


class PersonApiView(generics.RetrieveAPIView):
    serializer_class = PersonSerializer

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.language = None

    def get_object(self):
        people, self.language = get_or_fetch_person(self.kwargs['person_id'], get_language_from_request(self.request))
        return people

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['language'] = self.language
        context['watched_counts'] = count_watched_medias(self.request.user, [self.kwargs['person_id']])
        return context


class PersonMediasPagination(CustomPagination):
    page_size = 18

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data['counts'] = self.counts
        return response

    def paginate_queryset(self, queryset, request, view=None):
        self.counts = view.counts
        return super().paginate_queryset(queryset, request, view)


class PersonMediasApiView(LangHistoryContext, generics.ListAPIView):
    serializer_class = PersonMediaSerializer
    pagination_class = PersonMediasPagination
    filter_backends = []

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.counts = None

    def get_queryset(self):
        _, language = get_or_fetch_person(self.kwargs['person_id'], get_language_from_request(self.request))
        medias = language.credits
        role = self.request.query_params.get('role')
        if role not in PERSON_ROLES:
            role = PERSON_ROLES[0]
        self.counts = {role: len(medias[role]) for role in PERSON_ROLES}
        return medias[role]

    def paginate_queryset(self, queryset):
        # Only the medias of the page need the backdrops stored in the database
        return set_person_medias_backdrops(super().paginate_queryset(queryset))
