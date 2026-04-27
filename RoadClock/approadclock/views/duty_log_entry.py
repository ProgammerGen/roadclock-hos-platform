from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from ..models import DutyLogEntry
from ..serializers import DutyLogEntrySerializer
from ..services import push_audit_event

class DutyLogEntryViewSet(viewsets.ModelViewSet):
    queryset = DutyLogEntry.objects.select_related("driver").all()
    serializer_class = DutyLogEntrySerializer
                                                                                    
                                                                         
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get("driver_id")
        status_filter = self.request.query_params.get("status")
        started_from = self.request.query_params.get("started_from")
        started_to = self.request.query_params.get("started_to")
        active_only = self.request.query_params.get("active_only")

        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if started_from:
            queryset = queryset.filter(started_at__gte=started_from)
        if started_to:
            queryset = queryset.filter(started_at__lte=started_to)
        if active_only == "1":
            queryset = queryset.filter(ended_at__isnull=True)
        return queryset.order_by("-started_at", "-id")

    def perform_create(self, serializer):
        instance = serializer.save()
        push_audit_event(
            driver=instance.driver,
            kind="manual_entry" if instance.manual else "status_change",
            message=f"Entry created ({instance.status})",
            meta={
                "entry_id": instance.id,
                "manual": instance.manual,
            },
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        push_audit_event(
            driver=instance.driver,
            kind="edit",
            message=f"Entry updated ({instance.id})",
            meta={"entry_id": instance.id},
        )

    def perform_destroy(self, instance):
        driver = instance.driver
        entry_id = instance.id
        super().perform_destroy(instance)
        push_audit_event(
            driver=driver,
            kind="edit",
            message=f"Entry deleted ({entry_id})",
            meta={"entry_id": entry_id},
        )
