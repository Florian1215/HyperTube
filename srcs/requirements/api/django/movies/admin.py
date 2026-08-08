from django.contrib import admin
from movies.models import Movie, Genre


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "year",
        "note"
    )

    search_fields = (
        "title",
        "imdb_id"
    )


admin.site.register(Genre)
