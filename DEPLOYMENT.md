# Deployment Guide: AEROPOW·UK Wind Forecast Dashboard

This guide covers all deployment options for AEROPOW·UK:
1. **Unified Vercel Deployment** (Frontend + Python Backend together on Vercel)
2. **Split Deployment** (Vercel Frontend + Heroku/Render Backend)
3. **Local Docker Compose** (Full stack in containers)
4. **Local Development** (Manual Node + Python)

---

## 1. Unified Deployment on Vercel (Frontend + Python Backend Together)

Yes! You can deploy **both** the React frontend and the Python FastAPI backend directly on Vercel in a **single deployment**:

### How It Works Under the Hood
* Vercel builds the React frontend via `@vercel/static-build` from `frontend/package.json`.
* Vercel turns the FastAPI app in `api/index.py` into a Serverless Function via `@vercel/python`.
* Requests to `/api/*` automatically route to the FastAPI backend without any CORS issues.
* Everything is configured in the root `vercel.json`.

### Step-by-Step Deployment:

#### Option A: Via GitHub (Recommended - 1 Click)
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Import your GitHub repository: `https://github.com/arkp1/abcd`.
4. Keep the default settings (Root Directory as `./`).
5. Click **Deploy**.
6. Vercel will:
   * Build the React frontend into static assets.
   * Provision the Python runtime for `api/index.py` with FastAPI & Pandas.
   * Give you a live URL like `https://abcd-arkp1.vercel.app`.

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# From the root directory:
cd "c:\Users\arkpr\Downloads\databricks assessment"

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Important Vercel Serverless Notes:
* **Hobby (Free) Tier Timeout:** Vercel serverless functions on the free Hobby plan have a maximum execution timeout of **10 to 15 seconds**.
* **Cold Starts:** Initial calls after idle periods take 1–3 seconds to spin up Python and load Pandas.
* **Query Range Tip:** Querying 7-day or 14-day ranges loads well within the timeout. Full 31-day queries can take ~8–12s on first fetch before hitting the in-memory cache.

---

## 2. Split Deployment: Vercel (Frontend) + Heroku (Backend)

For trading desks requiring persistent server instances with zero cold starts and no 15-second timeout limits:

### Step 1: Deploy Backend to Heroku
```bash
cd backend
heroku login
heroku create aeropow-backend
git init
git add .
git commit -m "Deploy FastAPI Backend"
heroku git:remote -a aeropow-backend
git push heroku master
```

### Step 2: Deploy Frontend to Vercel
```bash
cd frontend
vercel --prod --build-env REACT_APP_API_URL=https://aeropow-backend.herokuapp.com
```

---

## 3. Local Docker Compose (Full Stack)

```bash
docker-compose up --build
```
* **Frontend:** `http://localhost:3000`
* **Backend:** `http://localhost:8000`
* **Swagger Docs:** `http://localhost:8000/docs`

---

## 4. Local Manual Development

### Terminal 1: Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm start
```
