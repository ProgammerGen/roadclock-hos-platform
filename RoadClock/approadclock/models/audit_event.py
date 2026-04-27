from django.db import models
from django.utils import timezone
from .driver import Driver
from .enums import AuditEventKind

class AuditEvent(models.Model):
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name="audit_events",
    )
    kind = models.CharField(max_length=32, choices=AuditEventKind.choices)
    message = models.TextField()
    meta = models.JSONField(blank=True, default=dict)
    at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-at", "-id"]
        db_table = "audit_events"

    def __str__(self) -> str:
        return f"{self.driver.name} | {self.kind} | {self.at.isoformat()}"
