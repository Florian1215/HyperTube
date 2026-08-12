from rest_framework.routers import DefaultRouter
from movies.views import MovieViewSet

router = DefaultRouter()
router.register("movies", MovieViewSet, basename="movies")
urlpatterns = router.urls
