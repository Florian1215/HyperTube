from django.conf import settings
from django.contrib import admin

from torrents.models import DownloadMedia, Torrent, TorrentRequest


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
    list_display = ('id', 'torrent', 'size', 'language', 'status', 'created_at', 'last_watched_at')
    search_fields = ('id', 'torrent__title')
    autocomplete_fields = ('torrent',)
    readonly_fields = ('size', 'created_at', 'last_watched_at')
    list_select_related = ('torrent',)

    @admin.display(description='Size (GB)')
    def size(self, obj):
        stream_dir = settings.STREAM_DIR / obj.id
        total = sum(f.stat().st_size for f in stream_dir.rglob('*') if f.is_file())
        return f'{total / 1024 ** 3:.2f}'


@admin.register(TorrentRequest)
class TorrentRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'media', 'episode', 'created_at', 'available_at')
    search_fields = ('user__username', 'media__original_title')
    autocomplete_fields = ('user', 'media')
    raw_id_fields = ('episode',)
    readonly_fields = ('created_at',)
    list_select_related = ('user', 'media', 'episode')
