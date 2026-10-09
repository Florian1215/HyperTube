from django.contrib import admin

from people.models import People


@admin.register(People)
class PeopleAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'tmdb_id', 'updated_at')
    list_filter = ('department',)
    search_fields = ('name',)
