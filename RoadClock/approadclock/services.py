from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from django.db import transaction
from django.utils import timezone

from .models import AuditEvent, AuditEventKind, Driver, DutyLogEntry, DutyStatus, RuleSetId

HOUR_SECONDS = 3600
DAY_SECONDS = 24 * HOUR_SECONDS

RULE_SET_CONFIG = {
    RuleSetId.PROPERTY_70_8: {
        "label": "Property — 11/14, 70h/8d",
        "driver_type": "property",
        "driving_limit_h": 11,
        "window_h": 14,
        "break_after_driving_h": 8,
        "weekly_limit_h": 70,
        "weekly_days": 8,
        "reset_h": 10,
    },
    RuleSetId.PROPERTY_60_7: {
        "label": "Property — 11/14, 60h/7d",
        "driver_type": "property",
        "driving_limit_h": 11,
        "window_h": 14,
        "break_after_driving_h": 8,
        "weekly_limit_h": 60,
        "weekly_days": 7,
        "reset_h": 10,
    },
    RuleSetId.PASSENGER_70_8: {
        "label": "Passenger — 10/15, 70h/8d",
        "driver_type": "passenger",
        "driving_limit_h": 10,
        "window_h": 15,
        "break_after_driving_h": 8,
        "weekly_limit_h": 70,
        "weekly_days": 8,
        "reset_h": 8,
    },
    RuleSetId.PASSENGER_60_7: {
        "label": "Passenger — 10/15, 60h/7d",
        "driver_type": "passenger",
        "driving_limit_h": 10,
        "window_h": 15,
        "break_after_driving_h": 8,
        "weekly_limit_h": 60,
        "weekly_days": 7,
        "reset_h": 8,
    },
}

@dataclass
class TransitionResult:
    ok: bool
    reason: str | None = None

def _ensure_tz(dt: datetime) -> datetime:
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt

def get_rule_config(rule_set_id: str):
    try:
        return RULE_SET_CONFIG[rule_set_id]
    except KeyError:
        return RULE_SET_CONFIG[RuleSetId.PROPERTY_70_8]

def _normalize_entries(entries: Iterable[DutyLogEntry], now: datetime):
    normalized = []
    last_segment_end = None
    for entry in sorted(entries, key=lambda item: (item.started_at, item.id)):
        start_at = _ensure_tz(entry.started_at)
        end_at = _ensure_tz(entry.ended_at or now)
        if end_at <= start_at:
            continue
        if last_segment_end and start_at < last_segment_end:
            start_at = last_segment_end
        if end_at <= start_at:
            continue
        normalized.append(
            {
                "entry": entry,
                "status": entry.status,
                "started_at": start_at,
                "ended_at": end_at,
            }
        )
        last_segment_end = end_at
    return normalized

def calculate_hos_summary(driver: Driver, now: datetime | None = None):
    now = _ensure_tz(now or timezone.now())
    rule = get_rule_config(driver.rule_set_id)

    entries = list(driver.duty_entries.all().order_by("started_at"))
    normalized = _normalize_entries(entries, now)

    current = entries[-1] if entries else None

                                                                          
    last_reset_at = normalized[0]["started_at"] if normalized else now
    reset_duration_seconds = rule["reset_h"] * HOUR_SECONDS
    for item in reversed(normalized):
        if item["status"] in {DutyStatus.OFF_DUTY, DutyStatus.SLEEPER}:
            rest_seconds = (item["ended_at"] - item["started_at"]).total_seconds()
            if rest_seconds >= reset_duration_seconds:
                last_reset_at = item["ended_at"]
                break

                                                                     
    last_34h_restart_at = driver.last_34h_restart_at
    if not last_34h_restart_at and normalized:
        last_34h_restart_at = normalized[0]["started_at"]
    elif not last_34h_restart_at:
        last_34h_restart_at = now

    restart_34h_duration_seconds = 34 * HOUR_SECONDS
    for item in reversed(normalized):
        if item["status"] in {DutyStatus.OFF_DUTY, DutyStatus.SLEEPER}:
            rest_seconds = (item["ended_at"] - item["started_at"]).total_seconds()
            if rest_seconds >= restart_34h_duration_seconds:
                last_34h_restart_at = item["ended_at"]
                break
    
    driving_seconds = 0
    cumulative_drive_since_break_seconds = 0
    break_accum_seconds = 0

    for item in normalized:
        if item["ended_at"] <= last_reset_at:
            continue
        segment_start = max(item["started_at"], last_reset_at)
        duration = max(0, int((item["ended_at"] - segment_start).total_seconds()))

        if item["status"] == DutyStatus.DRIVING:
            driving_seconds += duration
            cumulative_drive_since_break_seconds += duration
            break_accum_seconds = 0
        else:
            break_accum_seconds += duration
            if break_accum_seconds >= 30 * 60:
                cumulative_drive_since_break_seconds = 0

    elapsed_since_reset_seconds = max(0, int((now - last_reset_at).total_seconds()))

    week_start = now - timedelta(days=rule["weekly_days"])
    weekly_on_duty_seconds = 0
    for item in normalized:
                                                                                           
        if item["ended_at"] <= week_start or item["ended_at"] <= last_34h_restart_at:
            continue
        if item["status"] in {DutyStatus.DRIVING, DutyStatus.ON_DUTY}:
            segment_start = max(item["started_at"], week_start, last_34h_restart_at)
            weekly_on_duty_seconds += max(
                0,
                int((item["ended_at"] - segment_start).total_seconds()),
            )

    remaining_driving_seconds = max(0, rule["driving_limit_h"] * HOUR_SECONDS - driving_seconds)
    remaining_window_seconds = max(
        0,
        rule["window_h"] * HOUR_SECONDS - elapsed_since_reset_seconds,
    )
    remaining_break_seconds = max(
        0,
        rule["break_after_driving_h"] * HOUR_SECONDS - cumulative_drive_since_break_seconds,
    )
    remaining_weekly_seconds = max(
        0,
        rule["weekly_limit_h"] * HOUR_SECONDS - weekly_on_duty_seconds,
    )

    def to_ms(seconds: int) -> int:
        return seconds * 1000

    return {
        "driver_id": driver.id,
        "rule_set": {
            "id": driver.rule_set_id,
            **rule,
        },
        "current": {
            "id": getattr(current, "id", None),
            "status": getattr(current, "status", DutyStatus.OFF_DUTY),
            "started_at": getattr(current, "started_at", now),
            "location": getattr(current, "location", ""),
        },
        "driving_ms": to_ms(driving_seconds),
        "on_duty_ms": to_ms(elapsed_since_reset_seconds),
        "cumulative_driving_since_break_ms": to_ms(cumulative_drive_since_break_seconds),
        "weekly_on_duty_ms": to_ms(weekly_on_duty_seconds),
        "last_reset_at": last_reset_at,
        "remaining": {
            "driving_ms": to_ms(remaining_driving_seconds),
            "window_ms": to_ms(remaining_window_seconds),
            "break_ms": to_ms(remaining_break_seconds),
            "weekly_ms": to_ms(remaining_weekly_seconds),
        },
    }

def can_transition(driver: Driver, next_status: str, now: datetime | None = None) -> TransitionResult:
    now = _ensure_tz(now or timezone.now())
    summary = calculate_hos_summary(driver, now=now)
    rule = summary["rule_set"]
    current_status = summary["current"]["status"]

    if current_status == next_status:
        return TransitionResult(ok=False, reason="You are already in this status.")

    if next_status == DutyStatus.DRIVING:
        if summary["remaining"]["driving_ms"] <= 0:
            return TransitionResult(
                ok=False,
                reason=f'{rule["driving_limit_h"]}-hour driving limit reached. Take {rule["reset_h"]} consecutive hours off-duty before driving.',
            )
        if summary["remaining"]["window_ms"] <= 0:
            return TransitionResult(
                ok=False,
                reason=f'{rule["window_h"]}-hour duty window has closed. {rule["reset_h"]}-hour reset required.',
            )
        if summary["remaining"]["weekly_ms"] <= 0:
            return TransitionResult(
                ok=False,
                reason=f'{rule["weekly_limit_h"]}-hour / {rule["weekly_days"]}-day limit reached. 34-hour restart required.',
            )
        if summary["remaining"]["break_ms"] <= 0:
            return TransitionResult(
                ok=False,
                reason="30-minute break required before continuing to drive.",
            )

        if current_status in {DutyStatus.OFF_DUTY, DutyStatus.SLEEPER}:
            current_started_at = summary["current"]["started_at"]
            rest_seconds = int((now - _ensure_tz(current_started_at)).total_seconds())
            if rest_seconds < 60:
                return TransitionResult(
                    ok=False,
                    reason=(
                        "You just switched off-duty. Confirm you intended to start driving "
                        "(wait 1 minute or change to On Duty first)."
                    ),
                )

    if next_status == DutyStatus.ON_DUTY and summary["remaining"]["window_ms"] <= 0:
        return TransitionResult(
            ok=False,
            reason=f'{rule["window_h"]}-hour duty window has closed. Off-duty reset required.',
        )

    return TransitionResult(ok=True)

def push_audit_event(driver: Driver, kind: str, message: str, meta: dict | None = None):
    return AuditEvent.objects.create(
        driver=driver,
        kind=kind,
        message=message,
        meta=meta or {},
        at=timezone.now(),
    )

@transaction.atomic
def change_status(
    driver: Driver,
    next_status: str,
    note: str = "",
    location: str = "",
    signature: str = "",
) -> TransitionResult:
    result = can_transition(driver, next_status)
    if not result.ok:
        push_audit_event(
            driver=driver,
            kind=AuditEventKind.ALERT,
            message=f"Blocked transition -> {next_status}: {result.reason}",
        )
        return result

    ts = timezone.now()
    current = (
        driver.duty_entries.filter(ended_at__isnull=True).order_by("-started_at").first()
    )
    if current:
        current.ended_at = ts
        current.save(update_fields=["ended_at", "updated_at"])

    DutyLogEntry.objects.create(
        driver=driver,
        status=next_status,
        started_at=ts,
        location=location,
        note=note,
        signature=signature,
        manual=False,
    )

    push_audit_event(
        driver=driver,
        kind=AuditEventKind.STATUS_CHANGE,
        message=f"Status -> {next_status}",
        meta={
            "location": location or None,
            "note": note or None,
            "signed": bool(signature),
        },
    )
    return TransitionResult(ok=True)
