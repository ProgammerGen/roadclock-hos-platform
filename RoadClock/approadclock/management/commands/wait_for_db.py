import time

from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, connections


class Command(BaseCommand):
    help = "Wait until the configured database accepts connections."

    def add_arguments(self, parser):
        parser.add_argument("--retries", type=int, default=30)
        parser.add_argument("--delay", type=float, default=2.0)

    def handle(self, *args, **options):
        retries = options["retries"]
        delay = options["delay"]

        for attempt in range(1, retries + 1):
            try:
                connections["default"].ensure_connection()
            except OperationalError as exc:
                if attempt == retries:
                    raise CommandError(
                        f"Database unavailable after {retries} attempts: {exc}"
                    ) from exc

                self.stdout.write(
                    f"Database unavailable, retrying in {delay:g}s "
                    f"({attempt}/{retries})..."
                )
                time.sleep(delay)
            else:
                self.stdout.write(self.style.SUCCESS("Database is available."))
                return
