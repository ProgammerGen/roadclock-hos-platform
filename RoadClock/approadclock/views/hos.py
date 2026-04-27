from datetime import datetime, timedelta
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import Driver
from ..serializers import (
    CalculatorProjectionSerializer,
    CanTransitionRequestSerializer,
    DailyLogQuerySerializer,
    DutyLogEntrySerializer,
    TransitionRequestSerializer,
)
from ..services import calculate_hos_summary, can_transition, change_status

class HOSViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def _get_driver(self, driver_id: int) -> Driver:
        return get_object_or_404(Driver, pk=driver_id)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        driver_id = request.query_params.get("driver_id")
        if not driver_id:
            return Response({"detail": "driver_id is required."}, status=400)
        driver = self._get_driver(driver_id)
        return Response(calculate_hos_summary(driver))

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return self.dashboard(request)

    @action(detail=False, methods=["post"], url_path="can-transition")
    def can_transition_endpoint(self, request):
        serializer = CanTransitionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = self._get_driver(serializer.validated_data["driver_id"])
        result = can_transition(driver, serializer.validated_data["status"])
        return Response({"ok": result.ok, "reason": result.reason})

    @action(detail=False, methods=["post"], url_path="change-status")
    def change_status_endpoint(self, request):
        serializer = TransitionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        driver = self._get_driver(payload["driver_id"])
        result = change_status(
            driver=driver,
            next_status=payload["status"],
            note=payload.get("note", ""),
            location=payload.get("location", ""),
            signature=payload.get("signature", ""),
        )
        current_entry = (
            driver.duty_entries.order_by("-started_at", "-id").first()
        )
        current_status = current_entry.status if current_entry else None

        if not result.ok:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "current_status": current_status,
                    "entry": None,
                    "summary": None,
                    "reason": result.reason,
                },
                status=400,
            )

        summary = calculate_hos_summary(driver)
        entry_data = DutyLogEntrySerializer(current_entry).data if current_entry else None
        return Response(
            {
                "ok": True,
                "success": True,
                "current_status": current_status,
                "entry": entry_data,
                "summary": summary,
                "reason": None,
            }
        )

    @action(detail=False, methods=["get"], url_path="daily-log")
    def daily_log(self, request):
        serializer = DailyLogQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        driver = self._get_driver(validated["driver_id"])
        date_value = validated.get("date") or timezone.localdate()

        start_dt = timezone.make_aware(datetime.combine(date_value, datetime.min.time()))
        end_dt = start_dt + timedelta(days=1)

        entries = driver.duty_entries.filter(
            started_at__lt=end_dt,
        ).filter(Q(ended_at__isnull=True) | Q(ended_at__gt=start_dt)).order_by("started_at")
        data = DutyLogEntrySerializer(entries, many=True).data

        return Response(
            {
                "date": date_value,
                "driver_id": driver.id,
                "entries": data,
            }
        )

    @action(detail=False, methods=["post"], url_path="calculator")
    def calculator_projection(self, request):
        serializer = CalculatorProjectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        driver = self._get_driver(validated["driver_id"])
        summary = calculate_hos_summary(driver)
        rule = summary["rule_set"]

        hour_ms = 3_600_000
        extra_driving_ms = int(validated["extra_driving_hours"] * hour_ms)
        extra_on_duty_ms = int(validated["extra_on_duty_hours"] * hour_ms)

        projected_driving = summary["driving_ms"] + extra_driving_ms
        projected_window = summary["on_duty_ms"] + extra_driving_ms + extra_on_duty_ms
        projected_break = summary["cumulative_driving_since_break_ms"] + extra_driving_ms
        projected_weekly = summary["weekly_on_duty_ms"] + extra_driving_ms + extra_on_duty_ms

        return Response(
            {
                "driver_id": driver.id,
                "rule_set_id": driver.rule_set_id,
                "projection": {
                    "driving_ms": projected_driving,
                    "window_ms": projected_window,
                    "break_counter_ms": projected_break,
                    "weekly_ms": projected_weekly,
                },
                "limits": {
                    "driving_ms": rule["driving_limit_h"] * hour_ms,
                    "window_ms": rule["window_h"] * hour_ms,
                    "break_ms": rule["break_after_driving_h"] * hour_ms,
                    "weekly_ms": rule["weekly_limit_h"] * hour_ms,
                },
            }
        )
