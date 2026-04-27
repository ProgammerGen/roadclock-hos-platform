# Deployment Guide (One Repo: Heroku + Vercel)

This repository is deployed from the main root directory.

- Backend app code: `RoadClock/`
- Frontend app code: `RoadClock_ui/`

Root deployment files:

- `Procfile` (Heroku web + release commands)
- `requirements.txt` (points to `RoadClock/requirements.txt`)
- `runtime.txt` (Python runtime)
- `vercel.json` (build frontend from `RoadClock_ui`)
- `app.json` (optional Heroku app manifest)

## 1) Deploy Backend to Heroku (from repo root)

The root `Procfile` runs:

- `release: python RoadClock/manage.py migrate --noinput`
- `web: gunicorn --chdir RoadClock roadclock.wsgi:application ...`

Required Heroku config vars:

```env
SECRET_KEY=<strong-random-secret>
DEBUG=False
ALLOWED_HOSTS=<your-heroku-app>.herokuapp.com
CORS_ALLOWED_ORIGINS=https://<your-vercel-production-domain>
CSRF_TRUSTED_ORIGINS=https://<your-vercel-production-domain>
```

Optional for Vercel preview domains:

```env
CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$
CSRF_TRUSTED_ORIGINS=https://<your-vercel-production-domain>,https://*.vercel.app
```

Heroku CLI:

```bash
heroku login
heroku create <your-heroku-app>
heroku addons:create heroku-postgresql:mini -a <your-heroku-app>
heroku config:set SECRET_KEY='<strong-random-secret>' DEBUG=False -a <your-heroku-app>
heroku config:set ALLOWED_HOSTS='<your-heroku-app>.herokuapp.com' -a <your-heroku-app>
heroku config:set CORS_ALLOWED_ORIGINS='https://<your-vercel-production-domain>' -a <your-heroku-app>
heroku config:set CSRF_TRUSTED_ORIGINS='https://<your-vercel-production-domain>' -a <your-heroku-app>
```

Deploy directly from main branch:

```bash
heroku git:remote -a <your-heroku-app>
git push heroku main
```

If your branch is `master`, use `git push heroku master`.

## 2) Deploy Frontend to Vercel (from repo root)

Use root `vercel.json`, then set:

- Build command: auto from `vercel.json`
- Output directory: auto from `vercel.json`

Set Vercel env var:

```env
VITE_API_BASE_URL=https://<your-heroku-app>.herokuapp.com/api
```

Redeploy after setting env vars.

## 3) Verify Production

1. Open your Vercel production URL.
2. Confirm API calls go to `https://<your-heroku-app>.herokuapp.com/api/...`.
3. If CORS fails, verify `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEXES`.
4. If CSRF fails, verify `CSRF_TRUSTED_ORIGINS`.
5. If host validation fails, verify `ALLOWED_HOSTS`.
