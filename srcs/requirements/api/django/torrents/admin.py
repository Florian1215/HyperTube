from django.contrib import admin

from torrents.models import Torrent


@admin.register(Torrent)
class TorrentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title'
    )

    search_fields = (
        'title',
    )
