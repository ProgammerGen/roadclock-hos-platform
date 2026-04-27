from rest_framework import serializers
from ..models import AuditEvent

class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = ["id", "driver", "kind", "message", "meta", "at"]
        read_only_fields = ["id", "at"]
