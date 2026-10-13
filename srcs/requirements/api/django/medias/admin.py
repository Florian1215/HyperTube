from django.contrib import admin

from medias.models import BackdropUrl, Cast, Crew, Genre, Media, MediaLanguage
from series.models import Season


class MediaLanguageInline(admin.TabularInline):
    model = MediaLanguage
    extra = 0


class BackdropUrlInline(admin.TabularInline):
    model = BackdropUrl
    extra = 0


class SeasonInline(admin.TabularInline):
    model = Season
    extra = 0
    fields = ('season_number', 'rating', 'release_date', 'poster_url')
    show_change_link = True


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = (
        'original_title',
        'type',
        'year',
        'original_language',
        'rating',
        'vote_count',
        'status',
        'feature',
        'created_at',
    )
    list_filter = ('type', 'feature', 'status', 'original_language', 'in_production')
    search_fields = ('original_title', 'tmdb_id', 'languages__title')
    readonly_fields = ('created_at',)
    filter_horizontal = ('genres',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    inlines = (MediaLanguageInline, BackdropUrlInline)
    fieldsets = (
        (None, {
            'fields': ('tmdb_id', 'type', 'original_title', 'original_language', 'status', 'genres'),
        }),
        ('Release', {
            'fields': ('year', 'release_date', 'runtime'),
        }),
        ('Series', {
            'fields': ('end_date', 'number_of_seasons', 'in_production'),
        }),
        ('Rating', {
            'fields': ('rating', 'vote_count'),
        }),
        ('Images', {
            'fields': ('poster_url', 'backdrop_url'),
        }),
        ('Feature', {
            'fields': ('feature', 'feature_at', 'created_at'),
        }),
    )

    def get_inlines(self, request, obj):
        if obj is not None and obj.type == 'series':
            return (*self.inlines, SeasonInline)
        return self.inlines


@admin.register(MediaLanguage)
class MediaLanguageAdmin(admin.ModelAdmin):
    list_display = ('title', 'lang', 'media')
    list_filter = ('lang',)
    search_fields = ('title', 'media__original_title')
    autocomplete_fields = ('media',)
    list_select_related = ('media',)


@admin.register(Cast)
class CastAdmin(admin.ModelAdmin):
    list_display = ('name', 'character', 'media', 'cast_id')
    search_fields = ('name', 'character', 'media__original_title')
    autocomplete_fields = ('media',)
    list_select_related = ('media',)


@admin.register(Crew)
class CrewAdmin(admin.ModelAdmin):
    list_display = ('name', 'job', 'media', 'crew_id')
    list_filter = ('job',)
    search_fields = ('name', 'job', 'media__original_title')
    autocomplete_fields = ('media',)
    list_select_related = ('media',)


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('id', 'genre_id')
    search_fields = ('genre_id',)


@admin.register(BackdropUrl)
class BackdropUrlAdmin(admin.ModelAdmin):
    list_display = ('url', 'media')
    search_fields = ('url', 'media__original_title')
    autocomplete_fields = ('media',)
    list_select_related = ('media',)
