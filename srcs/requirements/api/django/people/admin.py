from django.contrib import admin

from people.models import People


@admin.register(People)
class PeopleAdmin(admin.ModelAdmin):
    list_display = ('name', 'age', 'gender')
    list_filter = ('gender',)
    search_fields = ('name',)
