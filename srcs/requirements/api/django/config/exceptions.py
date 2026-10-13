import logging
from contextlib import contextmanager
from xml.parsers.expat import ExpatError

import requests
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound

from config.errors import SERVICE_ERROR, SERVICE_INVALID_RESPONSE, SERVICE_TIMEOUT, SERVICE_UNAVAILABLE

logger = logging.getLogger(__name__)


class BadGateway(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_code = 'bad_gateway'


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_code = 'service_unavailable'


class GatewayTimeout(APIException):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    default_code = 'gateway_timeout'


class InsufficientStorage(APIException):
    status_code = status.HTTP_507_INSUFFICIENT_STORAGE
    default_code = 'insufficient_storage'


@contextmanager
def external_service(service, not_found):
    try:
        yield
    except APIException:
        raise
    except requests.Timeout as exc:
        logger.warning('%s timeout: %s', service, exc)
        raise GatewayTimeout(SERVICE_TIMEOUT.format(service=service)) from exc
    except requests.HTTPError as exc:
        code = exc.response.status_code
        logger.warning('%s HTTP error: %s', service, code)
        if code == status.HTTP_404_NOT_FOUND:
            raise NotFound(not_found) from exc
        if code in (status.HTTP_429_TOO_MANY_REQUESTS, status.HTTP_503_SERVICE_UNAVAILABLE):
            raise ServiceUnavailable(SERVICE_UNAVAILABLE.format(service=service)) from exc
        raise BadGateway(SERVICE_ERROR.format(service=service)) from exc
    except (requests.exceptions.JSONDecodeError, ExpatError) as exc:
        logger.warning('%s invalid response: %s', service, exc)
        raise BadGateway(SERVICE_INVALID_RESPONSE.format(service=service)) from exc
    except requests.RequestException as exc:
        logger.warning('%s unreachable: %s', service, exc)
        raise ServiceUnavailable(SERVICE_UNAVAILABLE.format(service=service)) from exc
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning('%s unexpected response: %r', service, exc)
        raise BadGateway(SERVICE_INVALID_RESPONSE.format(service=service)) from exc
