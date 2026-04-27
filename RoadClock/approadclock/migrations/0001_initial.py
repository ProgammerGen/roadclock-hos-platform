                                                

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Driver",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=120)),
                ("email", models.EmailField(blank=True, max_length=254, null=True)),
                (
                    "carrier_name",
                    models.CharField(default="Sunbelt Freight", max_length=120),
                ),
                (
                    "home_terminal",
                    models.CharField(blank=True, default="", max_length=120),
                ),
                (
                    "co_driver_name",
                    models.CharField(blank=True, default="", max_length=120),
                ),
                (
                    "vehicle_numbers",
                    models.CharField(blank=True, default="", max_length=120),
                ),
                (
                    "shipping_document_number",
                    models.CharField(blank=True, default="", max_length=120),
                ),
                (
                    "rule_set_id",
                    models.CharField(
                        choices=[
                            ("property_70_8", "Property — 11/14, 70h/8d"),
                            ("property_60_7", "Property — 11/14, 60h/7d"),
                            ("passenger_70_8", "Passenger — 10/15, 70h/8d"),
                            ("passenger_60_7", "Passenger — 10/15, 60h/7d"),
                        ],
                        default="property_70_8",
                        max_length=32,
                    ),
                ),
                ("is_interstate", models.BooleanField(default=True)),
                ("cdl_required", models.BooleanField(default=True)),
                ("hours_worked", models.IntegerField(default=0)),
                ("last_34h_restart_at", models.DateTimeField(blank=True, null=True)),
                (
                    "created_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now, editable=False
                    ),
                ),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                "db_table": "drivers",
                "ordering": ["name", "id"],
            },
        ),
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("status_change", "Status Change"),
                            ("manual_entry", "Manual Entry"),
                            ("alert", "Alert"),
                            ("edit", "Edit"),
                            ("export", "Export"),
                            ("rule_change", "Rule Change"),
                            ("exception", "Exception"),
                        ],
                        max_length=32,
                    ),
                ),
                ("message", models.TextField()),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "driver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="audit_events",
                        to="approadclock.driver",
                    ),
                ),
            ],
            options={
                "db_table": "audit_events",
                "ordering": ["-at", "-id"],
            },
        ),
        migrations.CreateModel(
            name="AlertPreference",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("webhook_url", models.URLField(blank=True, null=True)),
                (
                    "notify_email",
                    models.EmailField(blank=True, max_length=254, null=True),
                ),
                ("approach_limit", models.BooleanField(default=True)),
                ("break_reminder", models.BooleanField(default=True)),
                ("weekly", models.BooleanField(default=True)),
                ("end_of_break", models.BooleanField(default=True)),
                ("adverse_conditions", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "driver",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alert_preference",
                        to="approadclock.driver",
                    ),
                ),
            ],
            options={
                "db_table": "alert_preferences",
            },
        ),
        migrations.CreateModel(
            name="ExportRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "export_type",
                    models.CharField(
                        choices=[("csv", "CSV"), ("pdf", "PDF")], max_length=8
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("from_date", models.DateField()),
                ("to_date", models.DateField()),
                ("include_manual", models.BooleanField(default=True)),
                ("certified", models.BooleanField(default=False)),
                ("signature", models.CharField(blank=True, default="", max_length=120)),
                ("file_name", models.CharField(blank=True, default="", max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "driver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="export_records",
                        to="approadclock.driver",
                    ),
                ),
            ],
            options={
                "db_table": "export_records",
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.CreateModel(
            name="HOSExceptionRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "exception_type",
                    models.CharField(
                        choices=[
                            ("adverse_driving", "Adverse Driving Conditions"),
                            ("cdl_short_haul", "CDL Short-Haul Exception"),
                            ("non_cdl_short_haul", "Non-CDL Short-Haul Exception"),
                            ("short_haul_16_hour", "16-Hour Short-Haul Exception"),
                            ("agricultural", "Agricultural Operations"),
                            ("local_government", "Local Government Vehicles"),
                            ("construction", "Construction Vehicles"),
                            ("emergency_relief", "Emergency/Relief Vehicles"),
                            ("utility_service", "Utility Service Vehicles"),
                            ("oilfield", "Oilfield Operations"),
                            ("movie_tv", "Movie/Television Production"),
                            ("school_bus", "School Bus Drivers"),
                        ],
                        max_length=40,
                    ),
                ),
                ("started_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "driver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="hos_exceptions",
                        to="approadclock.driver",
                    ),
                ),
            ],
            options={
                "db_table": "hos_exceptions",
                "ordering": ["-started_at", "-id"],
            },
        ),
        migrations.CreateModel(
            name="DutyLogEntry",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("off", "Off Duty"),
                            ("sleeper", "Sleeper Berth"),
                            ("driving", "Driving"),
                            ("onduty", "On Duty (Not Driving)"),
                        ],
                        max_length=16,
                    ),
                ),
                ("started_at", models.DateTimeField()),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("location", models.CharField(blank=True, default="", max_length=200)),
                ("note", models.TextField(blank=True, default="")),
                ("manual", models.BooleanField(default=False)),
                ("signature", models.CharField(blank=True, default="", max_length=120)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("eld", "ELD Automatic"),
                            ("manual", "Manual"),
                            ("personal_conveyance", "Personal Conveyance"),
                            ("yard_move", "Yard Move"),
                        ],
                        default="eld",
                        max_length=24,
                    ),
                ),
                ("is_personal_conveyance", models.BooleanField(default=False)),
                ("is_yard_move", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "driver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="duty_entries",
                        to="approadclock.driver",
                    ),
                ),
            ],
            options={
                "db_table": "duty_logs",
                "ordering": ["started_at", "id"],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(
                            ("ended_at__isnull", True),
                            ("ended_at__gt", models.F("started_at")),
                            _connector="OR",
                        ),
                        name="duty_log_entry_end_after_start",
                    )
                ],
            },
        ),
    ]
