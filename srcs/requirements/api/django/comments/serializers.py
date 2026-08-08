from rest_framework import serializers

from comments.models import Comment
from movies.serializers import MovieListSerializer
from users.serializers import SmallUserSerializer


class CommentSerializer(serializers.ModelSerializer):
    user = SmallUserSerializer(read_only=True)

    class Meta:
        model = Comment

        fields = [
            "id",
            "user",
            "content",
            "edited",
            "updated_at"
        ]


class CommentDetailSerializer(serializers.ModelSerializer):
    user = SmallUserSerializer(read_only=True)
    movie = MovieListSerializer(read_only=True)

    class Meta:
        model = Comment

        fields = [
            "id",
            "user",
            "content",
            "edited",
            "updated_at",
            "movie"
        ]
