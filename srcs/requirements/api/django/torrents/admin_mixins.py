from django.contrib import messages
from django.db import transaction
from django.http import HttpResponseRedirect

from torrents.models import FileDeletionError


class FileDeletionAdminMixin:
    """Shows an error instead of a 500 when the files of a deleted object cannot be removed.

    The delete signal raises inside the transaction, so the rows (and the admin log entry) are rolled back.
    """

    def delete_view(self, request, object_id, extra_context=None):
        try:
            return super().delete_view(request, object_id, extra_context)
        except FileDeletionError as exc:
            self.message_user(request, str(exc), messages.ERROR)
            return HttpResponseRedirect(request.get_full_path())

    def changelist_view(self, request, extra_context=None):
        # the "delete selected" action logs the deletions before deleting: both must be rolled back together
        try:
            with transaction.atomic():
                return super().changelist_view(request, extra_context)
        except FileDeletionError as exc:
            self.message_user(request, str(exc), messages.ERROR)
            return HttpResponseRedirect(request.get_full_path())
