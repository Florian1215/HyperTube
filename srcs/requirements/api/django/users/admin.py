from urllib.parse import urlencode

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from django.utils.timezone import localtime

from users.models import User, UserFollow, UserHistory, UserWatchlist


HISTORY_LIMIT = 50
LIST_LIMIT = 100


def admin_link(obj, label=None):
    url = reverse(f'admin:{obj._meta.app_label}_{obj._meta.model_name}_change', args=[obj.pk])
    return format_html('<a href="{}">{}</a>', url, label if label is not None else obj)


def changelist_link(model, label, **filters):
    url = reverse(f'admin:{model._meta.app_label}_{model._meta.model_name}_changelist') + '?' + urlencode(filters)
    return format_html('<a href="{}">{}</a>', url, label)


def table(headers, rows, empty, footer=''):
    """A read-only table in the admin style, shown inside the user page."""
    if not rows:
        return format_html('<p>{}</p>', empty)
    head = format_html_join('', '<th>{}</th>', ((h,) for h in headers))
    body = format_html_join('', '<tr>{}</tr>', ((format_html_join('', '<td>{}</td>', ((cell,) for cell in row)),) for row in rows))
    return format_html('<table style="width:100%"><thead><tr>{}</tr></thead><tbody>{}</tbody></table>{}', head, body, footer)


def date(value):
    return localtime(value).strftime('%d/%m/%Y %H:%M') if value else '-'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('avatar', 'username', 'email', 'color', 'watched_count', 'is_staff', 'is_active', 'last_login', 'created_at')
    list_display_links = ('avatar', 'username')
    list_filter = ('is_active', 'is_staff')
    search_fields = ('username', 'email')
    ordering = ('-created_at',)
    readonly_fields = ('avatar_large', 'created_at', 'last_login', 'stats', 'history_table', 'following_table',
                       'followers_table', 'watchlist_table')
    fieldsets = (
        (None, {'fields': ('avatar_large', 'username', 'password')}),
        ('Profile', {'fields': ('color', 'preferred_language', 'profile_picture')}),
        ('Activity', {'fields': ('stats', 'last_login', 'created_at')}),
        ('History', {'fields': ('history_table',)}),
        ('Following', {'fields': ('following_table',)}),
        ('Followers', {'fields': ('followers_table',)}),
        ('Watchlist', {'fields': ('watchlist_table',), 'classes': ('collapse',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'), 'classes': ('collapse',)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            watched=Count('history', filter=Q(history__complete=True), distinct=True))

    @staticmethod
    def picture(obj, size):
        if obj.profile_picture:
            return format_html('<img src="{}" width="{}" height="{}" style="border-radius:50%;object-fit:cover">',
                               obj.profile_picture, size, size)
        return format_html('<span style="display:inline-flex;align-items:center;justify-content:center;width:{}px;height:{}px;'
                           'border-radius:50%;background:var(--hairline-color);font-weight:bold;text-transform:uppercase">{}</span>',
                           size, size, obj.username[:2])

    @admin.display(description='')
    def avatar(self, obj):
        return self.picture(obj, 28)

    @admin.display(description='Picture')
    def avatar_large(self, obj):
        return self.picture(obj, 96)

    @admin.display(description='Watched', ordering='watched')
    def watched_count(self, obj):
        return obj.watched

    @admin.display(description='Summary')
    def stats(self, obj):
        history = obj.history.filter(complete=True)
        return format_html(
            '{} movies · {} episodes watched · {} in watchlist · {} following · {} followers',
            history.filter(episode__isnull=True).count(), history.filter(episode__isnull=False).count(),
            obj.watchlist.count(), obj.following.count(), obj.followers.count())

    @admin.display(description='Last watched')
    def history_table(self, obj):
        history = obj.history.select_related('media', 'episode__season').order_by('-updated_at')
        total = history.count()
        rows = []
        for h in history[:HISTORY_LIMIT]:
            episode = f'S{h.episode.season.season_number:02}E{h.episode.episode_number:02}' if h.episode else '-'
            status = 'Watched' + (' (rewatch)' if h.rewatch else '') if h.complete else f'{h.pourcent}%'
            rows.append((admin_link(h.media), episode, status, date(h.watched_at or h.updated_at), admin_link(h, 'Edit')))
        footer = changelist_link(UserHistory, f'See the {total} entries', user__id__exact=obj.pk) if total > HISTORY_LIMIT else ''
        return table(('Media', 'Episode', 'Progress', 'Date', ''), rows, 'Nothing watched yet.', footer)

    @admin.display(description='Following')
    def following_table(self, obj):
        follows = obj.following.select_related('followed').order_by('-created_at')[:LIST_LIMIT]
        rows = [(self.picture(f.followed, 24), admin_link(f.followed), date(f.created_at)) for f in follows]
        return table(('', 'User', 'Since'), rows, 'Follows nobody.')

    @admin.display(description='Followers')
    def followers_table(self, obj):
        follows = obj.followers.select_related('follower').order_by('-created_at')[:LIST_LIMIT]
        rows = [(self.picture(f.follower, 24), admin_link(f.follower), date(f.created_at)) for f in follows]
        return table(('', 'User', 'Since'), rows, 'No followers.')

    @admin.display(description='Watchlist')
    def watchlist_table(self, obj):
        items = obj.watchlist.select_related('media').order_by('-created_at')[:LIST_LIMIT]
        rows = [(admin_link(w.media), w.media.get_type_display(), date(w.created_at)) for w in items]
        return table(('Media', 'Type', 'Added'), rows, 'Empty watchlist.')


@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'followed', 'created_at')
    search_fields = ('follower__username', 'followed__username')
    autocomplete_fields = ('follower', 'followed')
    list_select_related = ('follower', 'followed')


@admin.register(UserHistory)
class UserHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'media', 'episode', 'progress', 'pourcent', 'complete', 'watched_at', 'updated_at')
    list_filter = ('complete',)
    search_fields = ('user__username', 'media__original_title')
    autocomplete_fields = ('user', 'media', 'episode')
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('user', 'media', 'episode__serie', 'episode__season')
    date_hierarchy = 'updated_at'


@admin.register(UserWatchlist)
class UserWatchlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'media', 'created_at')
    search_fields = ('user__username', 'media__original_title')
    autocomplete_fields = ('user', 'media')
    list_select_related = ('user', 'media')
