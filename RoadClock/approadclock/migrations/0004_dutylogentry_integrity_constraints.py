                                          

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("approadclock", "0003_remove_trip_and_stateboundary"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="dutylogentry",
            index=models.Index(
                fields=["driver", "started_at"],
                name="dlog_drv_start_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="dutylogentry",
            index=models.Index(
                fields=["driver", "ended_at"],
                name="dlog_drv_end_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="dutylogentry",
            index=models.Index(
                fields=["driver", "status", "started_at"],
                name="dlog_drv_status_start_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="dutylogentry",
            constraint=models.UniqueConstraint(
                condition=models.Q(ended_at__isnull=True),
                fields=("driver",),
                name="duty_log_entry_single_active_per_driver",
            ),
        ),
    ]
