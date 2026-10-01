from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from users.models import User, UserHistory


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'username',
        'email',
        'first_name',
        'last_name',
        'color',
        'preferred_language',
        'is_staff',
        'is_active',
        'created_at',
    )
    list_filter = BaseUserAdmin.list_filter + ('color', 'preferred_language')
    readonly_fields = ('created_at',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('color', 'profile_picture', 'preferred_language', 'created_at'),
        }),
    )


@admin.register(UserHistory)
class UserHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'media', 'episode', 'progress', 'pourcent', 'complete', 'watched_at', 'updated_at')
    list_filter = ('complete',)
    search_fields = ('user__username', 'media__original_title')
    autocomplete_fields = ('user', 'media', 'episode')
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('user', 'media', 'episode__serie', 'episode__season')
    date_hierarchy = 'updated_at'
