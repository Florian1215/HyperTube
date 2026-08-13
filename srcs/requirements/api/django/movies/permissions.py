from rest_framework.permissions import BasePermission


class CanRecommendMovie(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('movies.can_recommend_movie')
