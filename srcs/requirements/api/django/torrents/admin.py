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
    list_filter = ('status', 'quality', 'language', 'cancel_requested')
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
            'fields': ('status', 'progress', 'output_file', 'error', 'cancel_requested'),
        }),
    )


@admin.register(DownloadMedia)
class DownloadMediaAdmin(admin.ModelAdmin):
    list_display = ('id', 'torrent', 'created_at')
    search_fields = ('id', 'torrent__title')
    autocomplete_fields = ('torrent',)
    readonly_fields = ('created_at',)
    list_select_related = ('torrent',)
