from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from ..models import AlertPreference
from ..serializers import AlertPreferenceSerializer

class AlertPreferenceViewSet(viewsets.ModelViewSet):
    queryset = AlertPreference.objects.select_related("driver").all()
    serializer_class = AlertPreferenceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get("driver_id")
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        return queryset
