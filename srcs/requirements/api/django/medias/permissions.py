from rest_framework.permissions import BasePermission


class CanRecommendMedia(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('medias.can_recommend_media')
