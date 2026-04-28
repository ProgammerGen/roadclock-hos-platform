# RoadClock UI

React + Vite frontend for RoadClock (FMCSA Hours of Service tracker).

## Stack

- React 19
- Vite 8
- TypeScript
- TanStack Router
- Tailwind CSS v4
- Radix UI
- Sonner
- Vitest + Testing Library

## Runtime Route Map

- `/` -> Dashboard
- `/logs` -> Daily logs table
- `/calculator` -> Limits calculator
- `/daily-log` -> Daily log grid and segment editor
- `/export` -> Export CSV/PDF workflow
- `/rods-history` -> Historical logs + saved exports

## Project Layout

```text
RoadClock_ui/
  src/
    components/
      app/
      ui/
    contexts/
      HOSContext.tsx
    lib/
      api.ts
      utils.ts
    routes/
      __root.tsx
      index.tsx
      logs.tsx
      calculator.tsx
      daily-log.tsx
      export.tsx
      rods-history.tsx
    router.tsx
    routeTree.ts
    main.tsx
  package.json
  vercel.json
  .env.example
  .env.production.example
```

Ignore rules are managed by the monorepo root `.gitignore`.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment

Required:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Production example:

```env
VITE_API_BASE_URL=https://your-railway-app.up.railway.app/api
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run preview
```

## API Integration

Frontend API client is in `src/lib/api.ts`. It expects backend endpoints under the `/api` prefix and handles:

- Driver bootstrap and rule-set updates
- Duty entries CRUD
- HOS summary and status transitions
- Alert preferences
- Audit event loading
- Export record history

If `VITE_API_BASE_URL` is missing in production, the app throws a runtime error by design.

## Deployment (Vercel)

Vercel config is defined in `vercel.json`:

- Framework: `vite`
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrite to `index.html`
