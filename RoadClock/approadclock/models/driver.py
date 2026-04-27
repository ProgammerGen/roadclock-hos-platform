from django.db import models
from django.utils import timezone
from .enums import RuleSetId

class Driver(models.Model):
    """
    Primary driver profile used by HOS calculations and app settings.
    """

    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    carrier_name = models.CharField(max_length=120, default="Sunbelt Freight")
    home_terminal = models.CharField(max_length=120, blank=True, default="")
    co_driver_name = models.CharField(max_length=120, blank=True, default="")
    vehicle_numbers = models.CharField(max_length=120, blank=True, default="")
    shipping_document_number = models.CharField(max_length=120, blank=True, default="")

    rule_set_id = models.CharField(
        max_length=32,
        choices=RuleSetId.choices,
        default=RuleSetId.PROPERTY_70_8,
    )
    is_interstate = models.BooleanField(default=True)
    cdl_required = models.BooleanField(default=True)

                                                          
    hours_worked = models.IntegerField(default=0)

    last_34h_restart_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["name", "id"]
        db_table = "drivers"

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name
