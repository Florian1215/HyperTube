from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.tv_cast import TvCastView, TvPollView, TvStatusView
from users.tv_login import TvLoginApproveView, TvLoginStartView, TvLoginStatusView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/tv/', TvLoginStartView.as_view(), name='tv_login'),
    path('api/v1/auth/tv/<str:code>/', TvLoginStatusView.as_view(), name='tv_login_status'),
    path('api/v1/auth/tv/<str:code>/approve/', TvLoginApproveView.as_view(), name='tv_login_approve'),
    path('api/v1/tv/', TvStatusView.as_view(), name='tv_status'),
    path('api/v1/tv/cast/', TvCastView.as_view(), name='tv_cast'),
    path('api/v1/tv/poll/', TvPollView.as_view(), name='tv_poll'),
    path('api/v1/', include('medias.urls')),
    path('api/v1/', include('series.urls')),
    path('api/v1/', include('comments.urls')),
    path('api/v1/', include('users.urls')),
    path('api/v1/', include('people.urls')),
    path('api/v1/', include('torrents.urls')),
    re_path(r'^api/v1/media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}, name='media')
]
