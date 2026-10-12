import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

from config.errors import PICTURE_INVALID, PICTURE_REQUIRED, PICTURE_TOO_LARGE

PICTURE_MAX_SIZE_MB = 5
PICTURE_MAX_PIXELS = 40_000_000
PICTURE_FORMATS = ('JPEG', 'PNG', 'WEBP')
PICTURE_SIZE = 512
PICTURE_DIR = 'avatars'


def read_picture(file):
    if file is None or not hasattr(file, 'read'):
        raise ValidationError({'detail': PICTURE_REQUIRED})
    if file.size > PICTURE_MAX_SIZE_MB * 1024 * 1024:
        raise ValidationError({'detail': PICTURE_TOO_LARGE.format(max=PICTURE_MAX_SIZE_MB)})
    try:
        Image.open(file).verify()
        file.seek(0)
        image = Image.open(file)
        if image.format not in PICTURE_FORMATS or image.width * image.height > PICTURE_MAX_PIXELS:
            raise ValidationError({'detail': PICTURE_INVALID})
        image.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise ValidationError({'detail': PICTURE_INVALID})
    return image


def delete_profile_picture(user):
    url = user.profile_picture or ''
    prefix = default_storage.url(f'{PICTURE_DIR}/')
    if url.startswith(prefix):
        default_storage.delete(f'{PICTURE_DIR}/{url[len(prefix):]}')


def save_profile_picture(user, file):
    image = ImageOps.exif_transpose(read_picture(file))
    image = ImageOps.fit(image.convert('RGB'), (PICTURE_SIZE, PICTURE_SIZE), Image.Resampling.LANCZOS)
    content = BytesIO()
    image.save(content, 'WEBP', quality=85)

    name = default_storage.save(f'{PICTURE_DIR}/{user.id}-{uuid.uuid4().hex}.webp', ContentFile(content.getvalue()))
    delete_profile_picture(user)
    user.profile_picture = default_storage.url(name)
    user.save(update_fields=['profile_picture'])
    return user
