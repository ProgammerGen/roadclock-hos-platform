from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from ..models import DutyLogEntry

class TransitionRequestSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=DutyLogEntry._meta.get_field("status").choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    location = serializers.CharField(required=False, allow_blank=True, max_length=200)
    signature = serializers.CharField(required=False, allow_blank=True, max_length=120)

class CanTransitionRequestSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=DutyLogEntry._meta.get_field("status").choices)

class CalculatorProjectionSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField(min_value=1)
    extra_driving_hours = serializers.FloatField(min_value=0, default=0)
    extra_on_duty_hours = serializers.FloatField(min_value=0, default=0)

class DailyLogQuerySerializer(serializers.Serializer):
    driver_id = serializers.IntegerField(min_value=1)
    date = serializers.DateField(required=False)

    def validate_date(self, value):
        if value > timezone.localdate() + timedelta(days=365):
            raise serializers.ValidationError("date is too far in the future.")
        return value
