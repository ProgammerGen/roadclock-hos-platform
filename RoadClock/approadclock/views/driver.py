from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum
from ..models import Driver, DutyLogEntry, RuleSetId
from ..serializers import DriverSerializer
from ..services import calculate_hos_summary, push_audit_event

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by("name", "id")
    serializer_class = DriverSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def total_hours(self, request):
        total_logged_seconds = 0
        rows = DutyLogEntry.objects.filter(
            ended_at__isnull=False,
            status__in=["driving", "onduty"],
        ).values_list("started_at", "ended_at")
        for started_at, ended_at in rows:
            total_logged_seconds += max(0, int((ended_at - started_at).total_seconds()))

        total_legacy_hours = Driver.objects.aggregate(total=Sum("hours_worked")).get("total") or 0

        return Response(
            {
                "total_hours_worked": total_legacy_hours,
                "total_logged_hours": round(total_logged_seconds / 3600, 2),
                "total_drivers": Driver.objects.count(),
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def dashboard(self, request, pk=None):
        driver = self.get_object()
        return Response(calculate_hos_summary(driver))

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def set_rule_set(self, request, pk=None):
        driver = self.get_object()
        rule_set_id = request.data.get("rule_set_id")
        if rule_set_id not in RuleSetId.values:
            return Response(
                {"detail": "Invalid rule_set_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        driver.rule_set_id = rule_set_id
        driver.save(update_fields=["rule_set_id", "updated_at"])
        push_audit_event(
            driver=driver,
            kind="rule_change",
            message=f"Rule set changed to {rule_set_id}",
        )
        return Response({"ok": True, "rule_set_id": rule_set_id})
