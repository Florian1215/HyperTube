from rest_framework import serializers

from medias.progress import MediaProgressMixin, get_season_progress
from series.fetch import get_or_fetch_season_lang
from series.models import Season, Episode, EpisodeLanguage


class EpisodeSerializer(MediaProgressMixin, serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    overview = serializers.SerializerMethodField()

    class Meta:
        model = Episode
        fields = '__all__'

    def get_obj(self, obj):
        return EpisodeLanguage.objects.get(episode=obj, lang=self.context['lang'])

    def get_name(self, obj):
        return self.get_obj(obj).name

    def get_overview(self, obj):
        return self.get_obj(obj).overview


class SeasonSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    overview = serializers.SerializerMethodField()
    episodes = EpisodeSerializer(many=True)
    complete = serializers.SerializerMethodField()
    pourcent = serializers.SerializerMethodField()

    class Meta:
        model = Season
        fields = '__all__'

    def get_progress(self, obj):
        if not self.context['user_history']:
            return {'complete': False, 'pourcent': 0}
        return get_season_progress(obj, self.context['user_history'])

    def get_complete(self, obj):
        return self.get_progress(obj)['complete']

    def get_pourcent(self, obj):
        return self.get_progress(obj)['pourcent']

    def get_name(self, obj):
        return get_or_fetch_season_lang(obj, self.context['lang']).name

    def get_overview(self, obj):
        return get_or_fetch_season_lang(obj, self.context['lang']).overview


class SmallEpisodeSerializer(serializers.ModelSerializer):
    season_number = serializers.IntegerField(source='season.season_number')

    class Meta:
        model = Episode
        fields = ['id', 'season_number', 'episode_number', 'poster_url']
