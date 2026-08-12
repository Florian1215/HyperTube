from django.contrib import admin
from movies.models import Movie, Genre, Cast, Crew


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'year',
        'note'
    )

    search_fields = (
        'title',
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


@admin.register(Genre)
class MovieAdmin(admin.ModelAdmin):
    search_fields = (
        'name',
    )
