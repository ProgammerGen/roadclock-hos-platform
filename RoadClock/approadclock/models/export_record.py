from django.db import models
from .driver import Driver
from .enums import ExportType, ExportStatus

class ExportRecord(models.Model):
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name="export_records",
    )
    export_type = models.CharField(max_length=8, choices=ExportType.choices)
    status = models.CharField(
        max_length=16,
        choices=ExportStatus.choices,
        default=ExportStatus.PENDING,
    )
    from_date = models.DateField()
    to_date = models.DateField()
    include_manual = models.BooleanField(default=True)
    certified = models.BooleanField(default=False)
    signature = models.CharField(max_length=120, blank=True, default="")
    file_name = models.CharField(max_length=255, blank=True, default="")
    metadata = models.JSONField(blank=True, default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        db_table = "export_records"

    def __str__(self) -> str:
        return f"{self.driver.name} | {self.export_type} | {self.status}"
