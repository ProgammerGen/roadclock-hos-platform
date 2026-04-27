from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from ..models import AuditEvent
from ..serializers import AuditEventSerializer

class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditEvent.objects.select_related("driver").all()
    serializer_class = AuditEventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get("driver_id")
        kind = self.request.query_params.get("kind")
        date_value = self.request.query_params.get("date")

        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if kind:
            queryset = queryset.filter(kind=kind)
        if date_value:
            queryset = queryset.filter(at__date=date_value)
        return queryset.order_by("-at", "-id")
