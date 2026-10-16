import random

from celery import shared_task
from django.db.models import F
from django.utils import timezone

from medias.models import Media


@shared_task
def rotate_featured_medias():
    for type in ('movie', 'series'):
        featured = list(Media.objects.filter(feature=True, type=type).order_by(F('feature_at').asc(nulls_first=True)))
        oldest = featured[:len(featured) // 2]
        if not oldest:
            continue
        media = random.choice(oldest)
        Media.objects.filter(pk=media.pk).update(feature_at=timezone.now())
        print(f'Featured {type}: {media} rotated to the top', flush=True)
