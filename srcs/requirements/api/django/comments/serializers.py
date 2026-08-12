from rest_framework import serializers

from comments.models import Comment
from movies.serializers import SmallMovieSerializer
from users.serializers import UserSerializer


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id',
            'user',
            'content',
            'edited',
            'updated_at',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'user',
            'edited',
            'updated_at',
            'created_at'
        ]

    def update(self, instance, validated_data):
        if 'content' in validated_data and validated_data['content'] != instance.content:
            instance.content = validated_data.get('content')
            instance.edited = True
            instance.save()
        return instance


class CommentDetailSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    movie = SmallMovieSerializer(read_only=True)

    class Meta:
        model = Comment

        fields = [
            'id',
            'user',
            'content',
            'edited',
            'updated_at',
            'movie'
        ]
