from django.utils.translation import get_language_from_request
from rest_framework.exceptions import NotFound

from config.errors import MOVIE_NOT_FOUND
from config.tmdb_media import tmdb_media
from movies.models import MovieLanguage, Movie, Genre
from movies.services.tmdb import TMDBService


def get_or_fetch_movie_lang(movie, lang, movie_data=None):
    try:
        movie_lang = movie.languages.get(lang=lang)
    except MovieLanguage.DoesNotExist:
        if movie_data and 'title' not in movie_data:
            tmdb = TMDBService(lang)
            movie_data = tmdb.get_movie(movie.id, False)
        movie_lang = movie.languages.create(title=movie_data['title'], summary=movie_data['overview'], lang=lang)
    return movie_lang


def get_or_fetch_movie(pk, request):
    language = get_language_from_request(request)
    movie_data = {}

    try:
        movie = Movie.objects.get(id=pk)
    except (Movie.DoesNotExist, ValueError):
        try:
            tmdb = TMDBService(language)
            movie_data = tmdb.get_movie(pk)
            movie = Movie.objects.create(
                id=movie_data['id'],
                year=movie_data['release_date'][:4],
                poster_url=tmdb_media(movie_data['poster_path'], 'w500'),
                backdrop_url=tmdb_media(movie_data['backdrop_path'], 'original'),
                note=movie_data['vote_average'],
                vote_count=movie_data['vote_count'],
                original_title=movie_data['original_title'],
                runtime=movie_data['runtime'],
                status=movie_data['status'],
                release_date=movie_data['release_date'],
            )
            for genre_data in movie_data['genres']:
                genre, _ = Genre.objects.get_or_create(genre_id=genre_data['id'])
                movie.genres.add(genre)
            for cast in movie_data['credits']['cast']:
                movie.cast.create(cast_id=cast['id'], name=cast['name'],
                                  picture=tmdb_media(cast['profile_path'], 'w300'), character=cast['character'])
            for crew in movie_data['credits']['crew']:
                movie.crew.create(crew_id=crew['id'], name=crew['name'],
                                  picture=tmdb_media(crew['profile_path'], 'w300'), job=crew['job'])
            image_data = tmdb.get_images_movie(pk)
            for backdrop_data in image_data['backdrops'][:9]:
                backdrop, _ = movie.backdrops_url.get_or_create(url=tmdb_media(backdrop_data['file_path'], 'original'))
                movie.backdrops_url.add(backdrop)
        except Exception as e:
            print(e, flush=True)
            raise NotFound(MOVIE_NOT_FOUND)
    get_or_fetch_movie_lang(movie, language, movie_data)
    return movie
