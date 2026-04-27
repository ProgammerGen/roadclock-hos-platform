from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from ..models import HOSExceptionRecord
from ..serializers import HOSExceptionRecordSerializer
from ..services import push_audit_event

class HOSExceptionRecordViewSet(viewsets.ModelViewSet):
    queryset = HOSExceptionRecord.objects.select_related("driver").all()
    serializer_class = HOSExceptionRecordSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get("driver_id")
        is_active = self.request.query_params.get("is_active")
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if is_active in {"0", "1"}:
            queryset = queryset.filter(is_active=(is_active == "1"))
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        push_audit_event(
            driver=instance.driver,
            kind="exception",
            message=f"Exception applied: {instance.exception_type}",
        )
