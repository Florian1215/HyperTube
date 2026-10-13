from django.contrib import admin

from series.models import Episode, EpisodeLanguage, Season, SeasonLanguage


class SeasonLanguageInline(admin.TabularInline):
    model = SeasonLanguage
    extra = 0


class EpisodeLanguageInline(admin.TabularInline):
    model = EpisodeLanguage
    extra = 0


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 0
    fields = ('episode_number', 'episode_type', 'runtime', 'rating', 'release_date', 'poster_url')
    show_change_link = True


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('serie', 'season_number', 'rating', 'release_date', 'created_at')
    search_fields = ('serie__original_title', 'languages__name')
    autocomplete_fields = ('serie',)
    readonly_fields = ('created_at',)
    list_select_related = ('serie',)
    ordering = ('serie__original_title', 'season_number')
    inlines = (SeasonLanguageInline, EpisodeInline)

    def save_formset(self, request, form, formset, change):
        if formset.model is not Episode:
            return super().save_formset(request, form, formset, change)
        episodes = formset.save(commit=False)
        for deleted in formset.deleted_objects:
            deleted.delete()
        for episode in episodes:
            episode.serie = form.instance.serie
            episode.save()
        formset.save_m2m()


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = (
        'serie',
        'season_number',
        'episode_number',
        'episode_type',
        'runtime',
        'rating',
        'release_date',
        'created_at',
    )
    list_filter = ('episode_type',)
    search_fields = ('serie__original_title', 'languages__name')
    autocomplete_fields = ('serie', 'season')
    readonly_fields = ('created_at',)
    list_select_related = ('serie', 'season')
    ordering = ('serie__original_title', 'season__season_number', 'episode_number')
    inlines = (EpisodeLanguageInline,)

    @admin.display(description='Season', ordering='season__season_number')
    def season_number(self, obj):
        return obj.season.season_number


@admin.register(SeasonLanguage)
class SeasonLanguageAdmin(admin.ModelAdmin):
    list_display = ('name', 'lang', 'season')
    list_filter = ('lang',)
    search_fields = ('name', 'season__serie__original_title')
    autocomplete_fields = ('season',)
    list_select_related = ('season__serie',)


@admin.register(EpisodeLanguage)
class EpisodeLanguageAdmin(admin.ModelAdmin):
    list_display = ('name', 'lang', 'episode')
    list_filter = ('lang',)
    search_fields = ('name', 'episode__serie__original_title')
    autocomplete_fields = ('episode',)
    list_select_related = ('episode__serie', 'episode__season')
