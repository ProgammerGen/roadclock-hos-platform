from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from ..models import ExportRecord
from ..serializers import ExportRecordSerializer
from ..services import push_audit_event

class ExportRecordViewSet(viewsets.ModelViewSet):
    queryset = ExportRecord.objects.select_related("driver").all()
    serializer_class = ExportRecordSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get("driver_id")
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        push_audit_event(
            driver=instance.driver,
            kind="export",
            message=f"Export requested ({instance.export_type})",
            meta={
                "from_date": str(instance.from_date),
                "to_date": str(instance.to_date),
            },
        )
