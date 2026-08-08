from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User


class SmallUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username"
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "color",
            "profile_picture",
            "created_at"
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name"
        ]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User

        fields = [
            "first_name",
            "last_name",
            "profile_picture"
        ]


class RegisterResponseSerializer(serializers.ModelSerializer):
    access = serializers.SerializerMethodField()
    refresh = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "color",
            "access",
            "refresh"
        ]

    @staticmethod
    def get_access(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    @staticmethod
    def get_refresh(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh)


class UserMeSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "color",
            "profile_picture",
            "created_at"
        ]

        read_only_fields = [
            "username",
            "email",
            "color",
            "created_at"
        ]
