from rest_framework import serializers
from ..models import Driver, RuleSetId

class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = [
            "id",
            "name",
            "email",
            "carrier_name",
            "home_terminal",
            "co_driver_name",
            "vehicle_numbers",
            "shipping_document_number",
            "rule_set_id",
            "is_interstate",
            "cdl_required",
            "hours_worked",
            "last_34h_restart_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_rule_set_id(self, value):
        if value not in RuleSetId.values:
            raise serializers.ValidationError("Invalid rule_set_id.")
        return value
