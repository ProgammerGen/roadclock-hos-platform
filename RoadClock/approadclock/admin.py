from django.contrib import admin

from .models import (
    AlertPreference,
    AuditEvent,
    Driver,
    DutyLogEntry,
    ExportRecord,
    HOSExceptionRecord,
)

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "carrier_name", "rule_set_id", "is_interstate", "updated_at")
    search_fields = ("name", "email", "carrier_name")
    list_filter = ("rule_set_id", "is_interstate", "cdl_required")

@admin.register(DutyLogEntry)
class DutyLogEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "driver", "status", "started_at", "ended_at", "manual", "source")
    search_fields = ("driver__name", "location", "note")
    list_filter = ("status", "manual", "source", "is_personal_conveyance", "is_yard_move")

@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("id", "driver", "kind", "at")
    search_fields = ("driver__name", "message")
    list_filter = ("kind",)

@admin.register(AlertPreference)
class AlertPreferenceAdmin(admin.ModelAdmin):
    list_display = ("id", "driver", "approach_limit", "break_reminder", "weekly", "end_of_break")
    search_fields = ("driver__name", "notify_email")

@admin.register(HOSExceptionRecord)
class HOSExceptionRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "driver", "exception_type", "is_active", "started_at", "ended_at")
    search_fields = ("driver__name", "notes")
    list_filter = ("exception_type", "is_active")

@admin.register(ExportRecord)
class ExportRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "driver", "export_type", "status", "from_date", "to_date", "created_at")
    search_fields = ("driver__name", "file_name", "signature")
    list_filter = ("export_type", "status", "include_manual", "certified")
