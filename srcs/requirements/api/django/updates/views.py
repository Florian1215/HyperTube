import uuid
from pathlib import Path

from django.contrib.admin.views.decorators import staff_member_required
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.utils.translation import get_language_from_request
from django.views.decorators.http import require_POST
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from updates.models import Update
from updates.serializers import UpdateSerializer

IMAGE_MAX_SIZE_MB = 20
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
IMAGE_DIR = 'updates'


class CurrentUpdateApiView(APIView):
    """The update announced right now, if any: the most recent one published less than 7 days ago."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        update = Update.objects.announced().prefetch_related('translations').first()
        if update is None:
            return Response({'update': None})
        lang = get_language_from_request(request)[:2]
        return Response({'update': UpdateSerializer(update, context={'lang': lang}).data})


@staff_member_required
@require_POST
def upload_image(request):
    """Images and GIFs dropped in the admin markdown editor."""
    file = request.FILES.get('image')
    extension = Path(file.name).suffix.lower() if file else ''
    if file is None or extension not in IMAGE_EXTENSIONS:
        return JsonResponse({'error': 'Only PNG, JPEG, GIF and WEBP images are accepted.'}, status=400)
    if file.size > IMAGE_MAX_SIZE_MB * 1024 * 1024:
        return JsonResponse({'error': f'The image must be smaller than {IMAGE_MAX_SIZE_MB} MB.'}, status=400)
    path = default_storage.save(f'{IMAGE_DIR}/{uuid.uuid4().hex}{extension}', file)
    return JsonResponse({'url': default_storage.url(path)})
