from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def health_check(_request):
    return JsonResponse(
        {
            "ok": True,
            "service": "RoadClock API",
            "api_base": "/api/",
        }
    )


urlpatterns = [
    path('', health_check, name='health-check-root'),
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
              
    path('api/', include('approadclock.urls')),
]
