from rest_framework import serializers
from ..models import AlertPreference

class AlertPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertPreference
        fields = [
            "id",
            "driver",
            "webhook_url",
            "notify_email",
            "approach_limit",
            "break_reminder",
            "weekly",
            "end_of_break",
            "adverse_conditions",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
