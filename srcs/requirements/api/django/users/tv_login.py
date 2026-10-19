import secrets
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from config.errors import TV_CODE_INVALID
from users.models import TvLogin

CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 8
POLL_TIMEOUT = timedelta(minutes=2)


def alive_logins():
    return TvLogin.objects.filter(polled_at__gte=timezone.now() - POLL_TIMEOUT)


def normalize(code):
    return code.strip().upper().replace('-', '').replace(' ', '')


class TvLoginStartView(APIView):
    """POST auth/tv/: creates a pending code, its url is shown by the TV in a QR code"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        TvLogin.objects.filter(polled_at__lt=timezone.now() - POLL_TIMEOUT).delete()
        while True:
            code = ''.join(secrets.choice(CODE_CHARS) for _ in range(CODE_LENGTH))
            try:
                with transaction.atomic():
                    TvLogin.objects.create(code=code)
                break
            except IntegrityError:
                continue
        return Response({'code': code, 'url': request.build_absolute_uri(f'/tv?code={code}')}, status=status.HTTP_201_CREATED)


class TvLoginStatusView(APIView):
    """GET auth/tv/<code>/: polled by the TV, gives the tokens once a user approved the code"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, code):
        with transaction.atomic():
            login = alive_logins().select_for_update().filter(code=normalize(code)).first()
            if login is None:
                return Response({'status': 'expired'})
            if login.user is None:
                login.polled_at = timezone.now()
                login.save(update_fields=['polled_at'])
                return Response({'status': 'pending'})
            refresh = RefreshToken.for_user(login.user)
            login.delete()
        return Response({'status': 'approved', 'access': str(refresh.access_token), 'refresh': str(refresh)})


class TvLoginApproveView(APIView):
    """POST auth/tv/<code>/approve/: the signed in user of the website connects the TV with its account"""
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        updated = alive_logins().filter(code=normalize(code), user__isnull=True).update(user=request.user)
        if not updated:
            raise NotFound(TV_CODE_INVALID)
        return Response({'status': 'approved'})
