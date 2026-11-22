from django import forms
from django.contrib import admin
from django.urls import path, reverse
from django.utils import timezone

from updates.models import ANNOUNCE_DURATION, Update, UpdateTranslation
from updates.views import upload_image

EASYMDE = 'https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min'


class MarkdownEditor(forms.Textarea):
    class Media:
        css = {'all': (f'{EASYMDE}.css', 'updates/markdown-editor.css')}
        js = (f'{EASYMDE}.js', 'updates/markdown-editor.js')

    def __init__(self, attrs=None):
        super().__init__({'class': 'markdown-editor', **(attrs or {})})

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context['widget']['attrs']['data-upload-url'] = reverse('admin:updates_upload_image')
        return context


class UpdateTranslationInline(admin.StackedInline):
    model = UpdateTranslation
    min_num = 1

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'content':
            kwargs['widget'] = MarkdownEditor()
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    def get_extra(self, request, obj=None, **kwargs):
        # a new update starts with a form for every language
        return 0 if obj else 2


@admin.register(Update)
class UpdateAdmin(admin.ModelAdmin):
    list_display = ('version', 'published_at', 'languages', 'announced')
    search_fields = ('version',)
    readonly_fields = ('created_at',)
    inlines = [UpdateTranslationInline]

    def get_urls(self):
        return [path('upload-image/', self.admin_site.admin_view(upload_image), name='updates_upload_image'), *super().get_urls()]

    @admin.display(description='Languages')
    def languages(self, obj):
        return ', '.join(obj.translations.values_list('lang', flat=True))

    @admin.display(description='Announced', boolean=True)
    def announced(self, obj):
        return timezone.now() - ANNOUNCE_DURATION <= obj.published_at <= timezone.now()
