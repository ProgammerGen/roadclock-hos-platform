# RoadClock Backend

Django + DRF backend for RoadClock (FMCSA Hours of Service tracking).

## Stack

- Python 3.11 (`runtime.txt`)
- Django 5.2
- Django REST Framework
- PostgreSQL
- `django-environ`
- `django-cors-headers`
- Gunicorn + WhiteNoise

## Project Layout

```text
RoadClock/
  manage.py
  roadclock/
    settings.py
    urls.py
    wsgi.py
  approadclock/
    models/
    serializers/
    views/
    services.py
  requirements.txt
  Procfile
  runtime.txt
  .env.example
  .env.railway.example
```

Ignore rules are managed by the monorepo root `.gitignore`.

## Environment Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Required Environment Variables

From `.env.example`:

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL` (optional, overrides `DATABASE_*` when set)
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `CORS_ALLOWED_ORIGINS`
- `CORS_ALLOWED_ORIGIN_REGEXES` (optional)
- `CSRF_TRUSTED_ORIGINS`
- `SESSION_COOKIE_SECURE`
- `CSRF_COOKIE_SECURE`
- `SECURE_SSL_REDIRECT`

## Local Development

Run checks:

```bash
python manage.py check
```

Run migrations:

```bash
python manage.py migrate
```

Run tests:

```bash
python manage.py test --keepdb --noinput
```

Start server:

```bash
python manage.py runserver
```

## Deployment (Railway)

Railway reads the backend production command from `RoadClock/Procfile`:

```text
web: gunicorn roadclock.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
```

Set production env vars using `.env.railway.example` as a template.

## API Surface

Base:

- `http://127.0.0.1:8000/api`

Resources:

- `/api/drivers/`
- `/api/duty-log-entries/`
- `/api/audit-events/`
- `/api/alert-preferences/`
- `/api/hos-exceptions/`
- `/api/export-records/`
- `/api/hos/`

Custom endpoints:

- `GET /api/drivers/{id}/hos-summary/`
- `POST /api/drivers/{id}/set_rule_set/`
- `GET /api/drivers/total_hours/`
- `POST /api/hos/can-transition/`
- `POST /api/hos/change-status/`
- `GET /api/hos/daily-log/`
- `POST /api/hos/calculator/`

## Data Tables

- `drivers`
- `duty_logs`
- `alert_preferences`
- `audit_events`
- `hos_exceptions`
- `export_records`

## Security Note

Several viewsets currently use `AllowAny` for MVP/demo flow. Add authentication/authorization and tenancy checks before public production use.
