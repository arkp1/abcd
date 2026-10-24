# Deployment Guide: AEROPOW·UK Wind Forecast Dashboard

## Production: Unified Vercel Services deployment (canonical)

Frontend (React/CRA) and backend (FastAPI) deploy together as **one Vercel
project** using [Vercel Services](https://vercel.com/docs/services), behind a
single domain.

- **Live URL:** https://abcd-citf.vercel.app
- **Config:** root `vercel.json` declares two services:
  - `frontend` — root `frontend/`, framework `create-react-app`
  - `backend` — root `backend/`, framework `fastapi`, entrypoint `main:app`
    (which re-exports the app from `backend/app/main.py`)
- **Routing:** top-level rewrites in the root `vercel.json` send `/api/*` to
  the backend service and everything else to the frontend service. Rewrites
  preserve the path, so the backend's existing `/api/...` routes match as-is.
- **API calls:** the frontend uses same-origin relative URLs
  (`frontend/src/api.js` defaults the base URL to `''`), so the browser calls
  e.g. `/api/health` on the same domain. **No environment variables and no
  CORS configuration are needed in production.** Never default the API base
  to `http://localhost:8000` — CRA bakes `REACT_APP_*` values into the bundle
  at build time, and in a visitor's browser `localhost` is their machine.

### Required Vercel project settings

These must match, or the root `vercel.json` is ignored and only part of the
app deploys:

- **Root Directory:** repository root (empty / `./`) — *not* `frontend` or
  `backend`
- **Framework Preset:** Services
- **Production branch:** `main` (every merge to `main` auto-deploys)
- **Environment variables:** none

> History note: this repo previously had three Vercel projects (frontend-only,
> backend-only, and the Services one) all deploying from `main`, plus a stale
> `frontend/vercel.json` rewrite to a non-existent Heroku app. The duplicates
> were deleted; keep exactly one project (the Services one above).

### Verify a deployment

```bash
curl https://abcd-citf.vercel.app/api/health
curl "https://abcd-citf.vercel.app/api/actuals?date_from=2026-01-15&date_to=2026-01-16"
```

Then open https://abcd-citf.vercel.app and check the dashboard loads data.

### Serverless notes

- First request after idle has a cold start (Python + Pandas load).
- The default view queries all of January 2026; the backend fetches Elexon
  data in sequential 7-day chunks and caches per serverless instance
  (in-memory, 10 min TTL in `backend/app/routes.py`), so a cold full-month
  query can take several seconds. The frontend allows up to 90s per request.

---

## Local Docker Compose (full stack)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000 (nginx serves the static build and proxies
  `/api/` to the backend container — see `frontend/nginx.conf`)
- Backend: http://localhost:8000/api/health · Swagger: http://localhost:8000/docs

The static frontend bundle calls relative `/api/*`, so no API URL env var is
needed (a runtime env var could not change already-built JS anyway).

---

## Local manual development

### Terminal 1: Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend

```bash
cd frontend
# point the dev server at the local backend (dev only — never commit this)
echo "REACT_APP_API_URL=http://localhost:8000" > .env.local
npm install
npm start                        # http://localhost:3000
```

---

## Alternative: persistent backend host (Render / Railway / Fly / Heroku)

Only needed if serverless cold starts ever become a problem. The backend is a
standard ASGI app: `backend/Procfile` (`uvicorn app.main:app --host 0.0.0.0
--port ${PORT:-8000}`) and `backend/Dockerfile` both work (`uvicorn` is in
`requirements.txt`). If you split the deployment this way, either build the
frontend with `REACT_APP_API_URL=https://<your-backend-host>` or add a rewrite
proxying `/api/*` to that host — and remember CRA env vars are baked in at
build time, so a redeploy is required after changing them.
