from django.utils.translation import get_language_from_request
from rest_framework.exceptions import NotFound
from rest_framework.generics import GenericAPIView

from config.errors import USER_NOT_FOUND
from users.models import User


class LangHistoryContext(GenericAPIView):
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['lang'] = get_language_from_request(self.request)
        res = None
        if 'user_id' in self.kwargs:
            try:
                res = User.objects.get(id=self.kwargs['user_id'])
            except User.DoesNotExist:
                NotFound(USER_NOT_FOUND)
        elif self.request.user.is_authenticated:
            res = self.request.user
        context['user_history'] = res
        return context
