import re
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.utils import timezone

from config.errors import MEDIA_NOT_FOUND
from config.exceptions import external_service
from medias.fetch import set_custom_backdrops
from medias.models import Cast, Crew, Media
from medias.pagination import fetch_tmdb_page
from people.models import People
from medias.services.tmdb import TMDBService

PEOPLE_NOT_FOUND = MEDIA_NOT_FOUND.format(type='people')

SHORT_MAX_RUNTIME = 40
# Below, a media is most likely confidential: student film, bonus, unreleased project...
MIN_VOTE_COUNT = 50
DOCUMENTARY_GENRE = 99
# Appearances as oneself (making-of, ceremonies, interviews) or through reused footage
NOT_A_ROLE = re.compile(r'\bself|archiv', re.IGNORECASE)
EXCLUDED_JOBS = ['Thanks']

# A person saved for longer is fetched again, to get the new medias of the filmography
PEOPLE_LIFETIME = timedelta(days=7)

# A multiple of 3, the people being displayed on up to 3 columns
PEOPLE_PER_PAGE = 18

PERSON_ROLES = ['cast', 'directing', 'writing', 'crew']
# The creator of a series is credited in a department of its own
WRITING_DEPARTMENTS = ['Writing', 'Creator']


def fetch_people_search(query, lang, page):
    tmdb = TMDBService(lang)
    with external_service('TMDB', PEOPLE_NOT_FOUND):
        return fetch_tmdb_page(lambda tmdb_page: tmdb.search_people(query, tmdb_page), page, PEOPLE_PER_PAGE)


def fetch_person(person_id, lang, get_credits=False):
    with external_service('TMDB', PEOPLE_NOT_FOUND):
        tmdb = TMDBService(lang)
        person = tmdb.get_person(person_id, get_credits)
        if not person['biography'] and tmdb.lang2 != TMDBService.DEFAULT_LANGUAGE:
            person['biography'] = TMDBService(TMDBService.DEFAULT_LANGUAGE).get_person(person_id)['biography']
        return person


def is_real_credit(credit, role):
    """False for what is not an actual work on a movie or a series: bonus videos, making-of, talk shows..."""
    genres = set(credit.get('genre_ids', []))
    if credit.get('adult') or credit.get('video') or not credit.get('poster_path') or not credit.get('backdrop_path'):
        return False
    if credit.get('vote_count', 0) < MIN_VOTE_COUNT:
        return False
    if credit['media_type'] == 'tv' and genres & set(TMDBService.EXCLUDED_TV_GENRES):
        return False
    if role == 'cast':
        return DOCUMENTARY_GENRE not in genres and not NOT_A_ROLE.search(credit.get('character') or '')
    return credit.get('job') not in EXCLUDED_JOBS


def get_short_movies(tmdb, person_id, credits):
    """The ids of the short films among the credits. The runtime is not in the credits and the one used by
    the discover filter is not reliable, so it only gives candidates, checked against the movie itself."""
    movie_ids = {credit['id'] for credit in credits if credit['media_type'] == 'movie'}
    candidates = list(movie_ids & tmdb.get_person_short_movies(person_id, SHORT_MAX_RUNTIME))
    if not candidates:
        return set()
    with ThreadPoolExecutor(max_workers=8) as executor:
        movies = executor.map(lambda movie_id: tmdb.get_media('movies', movie_id, False), candidates)
        return {movie['id'] for movie in movies if 0 < (movie['runtime'] or 0) <= SHORT_MAX_RUNTIME}


def get_credit_role(credit, role):
    """The role of PERSON_ROLES a credit of the 'cast' or 'crew' credits belongs to."""
    if role == 'cast':
        return 'cast'
    if credit.get('job') == 'Director':
        return 'directing'
    if credit.get('department') in WRITING_DEPARTMENTS:
        return 'writing'
    return 'crew'


def get_person_medias(person):
    """The medias of a person for each role of PERSON_ROLES: one per media, with every job the person had in it."""
    medias = {role: {} for role in PERSON_ROLES}
    with external_service('TMDB', PEOPLE_NOT_FOUND):
        credits = [(credit, role) for role in ('cast', 'crew')
                   for credit in person['combined_credits'][role] if is_real_credit(credit, role)]
        short_movies = get_short_movies(TMDBService(TMDBService.DEFAULT_LANGUAGE), person['id'],
                                        [credit for credit, _ in credits])
    for credit, role in credits:
        type = 'series' if credit['media_type'] == 'tv' else 'movies'
        if type == 'movies' and credit['id'] in short_movies:
            continue
        if type == 'series':
            TMDBService.format_serie(credit)
        credit.setdefault('release_date', '')
        media = medias[get_credit_role(credit, role)].setdefault((type, credit['id']),
                                                                 {**credit, 'type': type, 'roles': []})
        role_name = credit.get('character') or credit.get('job')
        if role_name and role_name not in media['roles']:
            media['roles'].append(role_name)
    return {role: sorted(role_medias.values(), key=lambda media: media['release_date'] or '9999', reverse=True)
            for role, role_medias in medias.items()}


def set_person_medias_backdrops(medias):
    for type in ('movies', 'series'):
        set_custom_backdrops([media for media in medias if (type == 'series') == ('first_air_date' in media)], type)
    return medias


def get_or_fetch_person(person_id, lang):
    """The person and its data in the language, from the database when it was saved recently."""
    people = People.objects.filter(tmdb_id=person_id).first()
    outdated = people is not None and people.updated_at < timezone.now() - PEOPLE_LIFETIME
    language = people.languages.filter(lang=lang).first() if people and not outdated else None
    if language:
        return people, language

    person = fetch_person(person_id, lang, True)
    credits = get_person_medias(person)
    people, _ = People.objects.update_or_create(tmdb_id=person['id'], defaults={
        'name': person['name'],
        'profile_path': person.get('profile_path'),
        'department': person.get('known_for_department'),
        'birthday': person.get('birthday'),
        'deathday': person.get('deathday'),
        'place_of_birth': person.get('place_of_birth'),
        'medias': sorted({(media['type'], media['id']) for medias in credits.values() for media in medias}),
    })
    if outdated:
        people.languages.exclude(lang=lang).delete()
    language, _ = people.languages.update_or_create(lang=lang, defaults={
        'biography': person['biography'] or '',
        'credits': credits,
    })
    return people, language


def count_watched_medias(user, person_ids):
    """For each person, the number of medias the user watched in which the person is credited: among the
    filmography when the person is saved, among the credits of the saved medias (cast or crew) otherwise."""
    if not user or not user.is_authenticated:
        return {person_id: 0 for person_id in person_ids}
    watched = set(Media.objects.filter(history__user=user, history__complete=True).values_list('type', 'tmdb_id'))
    res = {tmdb_id: len(watched & {tuple(media) for media in medias})
           for tmdb_id, medias in People.objects.filter(tmdb_id__in=person_ids).values_list('tmdb_id', 'medias')}
    credited = {person_id: set() for person_id in person_ids if person_id not in res}
    for model, field in ((Cast, 'cast_id'), (Crew, 'crew_id')):
        credits = model.objects.filter(**{f'{field}__in': credited}, media__history__user=user,
                                       media__history__complete=True)
        for person_id, media_id in credits.values_list(field, 'media_id').distinct():
            credited[person_id].add(media_id)
    res.update({person_id: len(medias) for person_id, medias in credited.items()})
    return res
