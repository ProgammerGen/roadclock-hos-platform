from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .driver import Driver
from .enums import DutyStatus, EntrySource

class DutyLogEntry(models.Model):
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name="duty_entries",
    )
    status = models.CharField(max_length=16, choices=DutyStatus.choices)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, default="")
    note = models.TextField(blank=True, default="")
    manual = models.BooleanField(default=False)
    signature = models.CharField(max_length=120, blank=True, default="")
    source = models.CharField(
        max_length=24,
        choices=EntrySource.choices,
        default=EntrySource.ELD,
    )
    is_personal_conveyance = models.BooleanField(default=False)
    is_yard_move = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["started_at", "id"]
        db_table = "duty_logs"
        indexes = [
            models.Index(fields=["driver", "started_at"], name="dlog_drv_start_idx"),
            models.Index(fields=["driver", "ended_at"], name="dlog_drv_end_idx"),
            models.Index(fields=["driver", "status", "started_at"], name="dlog_drv_status_start_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(ended_at__isnull=True) | models.Q(ended_at__gt=models.F("started_at")),
                name="duty_log_entry_end_after_start",
            ),
            models.UniqueConstraint(
                fields=["driver"],
                condition=models.Q(ended_at__isnull=True),
                name="duty_log_entry_single_active_per_driver",
            ),
        ]

    def clean(self):
        super().clean()
        if self.ended_at and self.ended_at <= self.started_at:
            raise ValidationError("ended_at must be greater than started_at.")

        overlap_queryset = DutyLogEntry.objects.filter(driver=self.driver)
        if self.pk:
            overlap_queryset = overlap_queryset.exclude(pk=self.pk)

        candidate_end = self.ended_at or timezone.now()
        overlapping_entry = (
            overlap_queryset.filter(started_at__lt=candidate_end)
            .filter(models.Q(ended_at__isnull=True) | models.Q(ended_at__gt=self.started_at))
            .exists()
        )
        if overlapping_entry:
            raise ValidationError("Duty log overlaps an existing entry for this driver.")

    @property
    def effective_end(self):
        return self.ended_at or timezone.now()

    @property
    def duration_seconds(self) -> int:
        return max(0, int((self.effective_end - self.started_at).total_seconds()))

    def __str__(self) -> str:
        return f"{self.driver.name} | {self.status} | {self.started_at.isoformat()}"
