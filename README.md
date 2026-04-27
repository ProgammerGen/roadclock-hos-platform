# RoadClock

RoadClock is a full-stack FMCSA Hours of Service (HOS) project for electronic duty status tracking, daily log review, alerts, and export history.

This repository contains:

- `RoadClock` -> Django + Django REST Framework + PostgreSQL backend
- `RoadClock_ui` -> React + Vite + TypeScript frontend

## Architecture

- Backend deployment target: Heroku
- Frontend deployment target: Vercel
- Frontend talks to backend through `VITE_API_BASE_URL` and uses the `/api` prefix
- Deployment is configured from repository root (single-repo deployment workflow)

Root deployment files:

- `Procfile`
- `requirements.txt`
- `runtime.txt`
- `vercel.json`
- `app.json`

Current deployment documentation:

- `DEPLOYMENT_HEROKU_VERCEL.md`
- `RoadClock/.env.heroku.example`
- `RoadClock_ui/.env.production.example`

Repository hygiene:

- Root ignore file: `.gitignore` (main ignore policy for the entire monorepo)

## Product Features

- Live HOS dashboard with duty status and limits
- Duty status transitions with transition validation
- Duty log entry CRUD (manual and automatic-style records)
- Daily log grid view for a selected date
- Rule set switching for property/passenger configurations
- HOS calculator projection endpoint + interactive calculator UI
- Alert preference storage (webhook/email and reminder toggles)
- Audit event history
- Export records (CSV/PDF tracking metadata)
- RODS history with date-based export workflow

## Tech Stack

Backend (`RoadClock`):

- Python 3.11
- Django 5.2
- Django REST Framework
- PostgreSQL
- `django-environ` for environment config
- `django-cors-headers` for CORS
- Gunicorn + WhiteNoise for Heroku runtime

Frontend (`RoadClock_ui`):

- React 19
- Vite 8
- TypeScript
- TanStack Router
- Tailwind CSS v4
- Radix UI
- Vitest + Testing Library

## Repository Structure

```text
Assesment/
  .gitignore
  README.md
  DEPLOYMENT_HEROKU_VERCEL.md
  Procfile
  requirements.txt
  runtime.txt
  vercel.json
  app.json
  RoadClock/
    manage.py
    roadclock/           # Django project settings/urls
    approadclock/        # app models, serializers, views, services
    requirements.txt
    Procfile
    runtime.txt
    .env.example
    .env.heroku.example
  RoadClock_ui/
    src/
      routes/            # dashboard, logs, calculator, daily-log, export, rods-history
      contexts/          # HOS state provider
      lib/api.ts         # backend API client
    package.json
    vercel.json
    .env.example
    .env.production.example
```

## Frontend Routes

- `/` -> Dashboard
- `/logs` -> Daily Logs table
- `/calculator` -> FMCSA limits calculator
- `/daily-log` -> Driver daily log sheet
- `/export` -> Export workflow UI
- `/rods-history` -> Historical RODS with saved exports

## Backend API Overview

Base URL examples:

- Local backend root: `http://127.0.0.1:8000`
- API root: `http://127.0.0.1:8000/api`

Core REST endpoints:

- `/api/drivers/`
- `/api/duty-log-entries/`
- `/api/audit-events/` (read only)
- `/api/alert-preferences/`
- `/api/hos-exceptions/`
- `/api/export-records/`
- `/api/hos/`

Custom endpoints used by frontend:

- `GET /api/drivers/{driver_id}/hos-summary/`
- `POST /api/drivers/{id}/set_rule_set/`
- `GET /api/drivers/total_hours/`
- `POST /api/hos/can-transition/`
- `POST /api/hos/change-status/`
- `GET /api/hos/daily-log/`
- `POST /api/hos/calculator/`
- `GET /api/hos/dashboard/` (alias `summary`)

## Data Model Summary

Main tables in app `approadclock`:

- `drivers`
- `duty_logs`
- `alert_preferences`
- `audit_events`
- `hos_exceptions`
- `export_records`

Important model notes:

- `DutyLogEntry` enforces one active entry per driver and overlap protection.
- Supported rule sets: `property_70_8`, `property_60_7`, `passenger_70_8`, `passenger_60_7`.

## Local Development Setup

### 1) Backend setup (`RoadClock`)

```bash
cd RoadClock
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Create local DB if needed:

```bash
createdb roadclockdb
```

Run migrations and start API:

```bash
python manage.py migrate
python manage.py runserver
```

### 2) Frontend setup (`RoadClock_ui`)

In a new terminal:

```bash
cd RoadClock_ui
npm install
cp .env.example .env
npm run dev
```

Local frontend env should include:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Environment Variables

Backend (`RoadClock/.env.example`):

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL` (optional, takes precedence when present)
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

Frontend (`RoadClock_ui/.env.example`):

- `VITE_API_BASE_URL`

## Git Ignore Policy

- This repository uses one main ignore file at project root: `.gitignore`.
- It covers Python, Django, Node, Vite, virtual environments, build output, logs, and local env files.

## Commands

Backend (`RoadClock`):

```bash
python manage.py check
python manage.py migrate
python manage.py test --keepdb --noinput
```

Frontend (`RoadClock_ui`):

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run preview
```

## Deployment

Target setup:

- Backend on Heroku
- Frontend on Vercel
- Single monorepo deploy from root directory

Use the complete runbook:

- `DEPLOYMENT_HEROKU_VERCEL.md`

Production env templates:

- Backend: `RoadClock/.env.heroku.example`
- Frontend: `RoadClock_ui/.env.production.example`

## Security and MVP Notes

- Most API viewsets are currently configured with `AllowAny` for MVP/demo workflows.
- Before production hardening, add authentication/authorization per driver/account and enforce access controls.

## Troubleshooting

`Frontend cannot call API`

- Confirm backend is running and reachable.
- Confirm frontend env points to `/api` base.
- Restart frontend after env changes.

`Database connection errors`

- Verify local PostgreSQL service and credentials.
- Re-check `RoadClock/.env` DB variables.

`CORS or CSRF errors in production`

- Ensure Heroku backend has correct `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.
- If using Vercel previews, configure `CORS_ALLOWED_ORIGIN_REGEXES`.
# roadclock-hos-platform
