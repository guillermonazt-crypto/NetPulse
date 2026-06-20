from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RouterViewSet, metrics_view, stats_view, events_view, health_view, historical_view

router = DefaultRouter()
router.register(r'routers', RouterViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('metrics/', metrics_view, name='metrics'),
    path('stats/', stats_view, name='stats'),
    path('events/', events_view, name='events'),
    path('health/', health_view, name='health'),
    path('historical/', historical_view, name='historical'),
]
