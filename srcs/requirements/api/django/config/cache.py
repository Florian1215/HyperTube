import logging
from contextlib import contextmanager
from datetime import date, timedelta

from django.utils import timezone
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

LIFETIME_MOVING = timedelta(days=1)
LIFETIME_RECENT = timedelta(days=3)
LIFETIME_STABLE = timedelta(days=30)

RECENT_DAYS = 60


def is_outdated(obj, lifetime):
    return (obj.fetched_at or obj.created_at) < timezone.now() - lifetime


def is_released(release_date):
    return bool(release_date) and release_date <= date.today().isoformat()


def is_recent(release_date):
    return bool(release_date) and release_date >= (date.today() - timedelta(days=RECENT_DAYS)).isoformat()


@contextmanager
def keep_saved_data(name):
    try:
        yield
    except APIException as exc:
        logger.warning('%s not refreshed: %s', name, exc)
