from django.contrib import admin

from torrents.models import DownloadMedia, Torrent


@admin.register(Torrent)
class TorrentAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'media',
        'quality',
        'language',
        'size',
        'seeders',
        'peers',
        'status',
        'progress',
        'published_at',
    )
    list_filter = ('status', 'quality', 'language')
    search_fields = ('id', 'title', 'media__original_title')
    autocomplete_fields = ('media',)
    readonly_fields = ('created_at',)
    list_select_related = ('media',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    fieldsets = (
        (None, {
            'fields': ('id', 'media', 'title', 'url', 'magnet'),
        }),
        ('Details', {
            'fields': ('quality', 'language', 'size', 'seeders', 'peers', 'published_at', 'created_at'),
        }),
        ('Download', {
            'fields': ('status', 'progress', 'output_file', 'error'),
        }),
    )


@admin.register(DownloadMedia)
class DownloadMediaAdmin(admin.ModelAdmin):
    list_display = ('id', 'torrent', 'language', 'status', 'created_at', 'last_watched_at')
    search_fields = ('id', 'torrent__title')
    autocomplete_fields = ('torrent',)
    readonly_fields = ('created_at', 'last_watched_at')
    list_select_related = ('torrent',)
