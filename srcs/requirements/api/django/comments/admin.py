from django.contrib import admin

from comments.models import Comment


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'media', 'short_content', 'edited', 'created_at', 'updated_at')
    list_filter = ('edited',)
    search_fields = ('content', 'user__username', 'media__original_title')
    autocomplete_fields = ('user', 'media')
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('user', 'media')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='Content')
    def short_content(self, obj):
        return obj.content if len(obj.content) <= 75 else f'{obj.content[:75]}…'
