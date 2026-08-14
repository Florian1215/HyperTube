from django.contrib import admin
from movies.models import Movie, Genre, Cast, Crew, MovieLanguage


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = (
        'original_title',
        'year',
        'note'
    )

    search_fields = (
        'original_title',
    )


@admin.register(Cast)
class MovieAdmin(admin.ModelAdmin):
    search_fields = (
        'name',
    )


@admin.register(Crew)
class MovieAdmin(admin.ModelAdmin):
    search_fields = (
        'name',
    )


admin.register(MovieLanguage)
admin.register(Genre)
