from rest_framework import serializers

from updates.models import Update


class UpdateSerializer(serializers.ModelSerializer):
    content = serializers.SerializerMethodField()

    class Meta:
        model = Update
        fields = ['version', 'published_at', 'content']

    def get_content(self, obj):
        return obj.get_content(self.context['lang'])
