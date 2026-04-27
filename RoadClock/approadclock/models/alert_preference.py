from django.db import models
from .driver import Driver

class AlertPreference(models.Model):
    driver = models.OneToOneField(
        Driver,
        on_delete=models.CASCADE,
        related_name="alert_preference",
    )
    webhook_url = models.URLField(blank=True, null=True)
    notify_email = models.EmailField(blank=True, null=True)
    approach_limit = models.BooleanField(default=True)
    break_reminder = models.BooleanField(default=True)
    weekly = models.BooleanField(default=True)
    end_of_break = models.BooleanField(default=True)
    adverse_conditions = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "alert_preferences"

    def __str__(self) -> str:
        return f"Alerts for {self.driver.name}"
