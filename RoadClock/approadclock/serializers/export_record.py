from rest_framework import serializers
from ..models import ExportRecord

class ExportRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportRecord
        fields = [
            "id",
            "driver",
            "export_type",
            "status",
            "from_date",
            "to_date",
            "include_manual",
            "certified",
            "signature",
            "file_name",
            "metadata",
            "created_at",
            "completed_at",
        ]
        read_only_fields = ["id", "created_at", "completed_at"]

    def validate(self, attrs):
        from_date = attrs.get("from_date")
        to_date = attrs.get("to_date")
        if from_date and to_date and to_date < from_date:
            raise serializers.ValidationError("to_date must be on or after from_date.")
        return attrs
