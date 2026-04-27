from rest_framework import serializers
from ..models import HOSExceptionRecord

class HOSExceptionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = HOSExceptionRecord
        fields = [
            "id",
            "driver",
            "exception_type",
            "started_at",
            "ended_at",
            "is_active",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
