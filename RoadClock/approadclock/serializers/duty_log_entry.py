from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from ..models import DutyLogEntry

class DutyLogEntrySerializer(serializers.ModelSerializer):
    duration_ms = serializers.SerializerMethodField()

    class Meta:
        model = DutyLogEntry
        fields = [
            "id",
            "driver",
            "status",
            "started_at",
            "ended_at",
            "duration_ms",
            "location",
            "note",
            "manual",
            "signature",
            "source",
            "is_personal_conveyance",
            "is_yard_move",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "duration_ms", "created_at", "updated_at"]
        extra_kwargs = {
            "driver": {"required": True},
            "status": {"required": True},
            "started_at": {"required": True},
            "source": {"required": True},
        }

    def get_duration_ms(self, obj: DutyLogEntry):
        return obj.duration_seconds * 1000

    def validate(self, attrs):
        driver = attrs.get("driver", getattr(self.instance, "driver", None))
        started_at = attrs.get("started_at", getattr(self.instance, "started_at", None))
        ended_at = attrs.get("ended_at", getattr(self.instance, "ended_at", None))
        status = attrs.get("status", getattr(self.instance, "status", None))
        source = attrs.get("source", getattr(self.instance, "source", None))

        errors = {}
        if driver is None:
            errors["driver"] = "This field is required."
        if status is None:
            errors["status"] = "This field is required."
        if started_at is None:
            errors["started_at"] = "This field is required."
        if source is None:
            errors["source"] = "This field is required."
        if errors:
            raise serializers.ValidationError(errors)

        probe = DutyLogEntry(
            pk=getattr(self.instance, "pk", None),
            driver=driver,
            status=status,
            started_at=started_at,
            ended_at=ended_at,
            location=attrs.get("location", getattr(self.instance, "location", "")),
            note=attrs.get("note", getattr(self.instance, "note", "")),
            manual=attrs.get("manual", getattr(self.instance, "manual", False)),
            signature=attrs.get("signature", getattr(self.instance, "signature", "")),
            source=source,
            is_personal_conveyance=attrs.get(
                "is_personal_conveyance",
                getattr(self.instance, "is_personal_conveyance", False),
            ),
            is_yard_move=attrs.get(
                "is_yard_move",
                getattr(self.instance, "is_yard_move", False),
            ),
        )
        try:
            probe.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs
