from django.core.validators import RegexValidator
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from config.errors import USERNAME_CONTAINS, USER_ALREADY_TAKEN
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'color',
            'profile_picture',
            'created_at'
        ]

        read_only_fields = [
            'id',
            'username',
            'created_at'
        ]


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        min_length=3,
        max_length=32,
        validators=[
            RegexValidator(regex=r'^[a-zA-Z0-9_]+$', message=USERNAME_CONTAINS)
        ],
        write_only=True
    )
    password = serializers.CharField(write_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'username',
            'password',
            'access',
            'refresh',
        ]

    @staticmethod
    def validate_username(value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(USER_ALREADY_TAKEN)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        refresh = RefreshToken.for_user(user)

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
