from django.db import models
from django.utils import timezone
from .driver import Driver
from .enums import HOSExceptionType

class HOSExceptionRecord(models.Model):
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name="hos_exceptions",
    )
    exception_type = models.CharField(max_length=40, choices=HOSExceptionType.choices)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    metadata = models.JSONField(blank=True, default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at", "-id"]
        db_table = "hos_exceptions"

    def __str__(self) -> str:
        return f"{self.driver.name} | {self.exception_type}"
