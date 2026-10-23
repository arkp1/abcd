# Deployment Guide: AEROPOW·UK Wind Forecast Dashboard

This document provides step-by-step instructions for deploying the AEROPOW·UK Wind Forecast application across local and cloud environments (Docker, Vercel, Heroku).

---

## 1. Quick Start: Local Docker (Recommended)

The entire application (FastAPI backend + React frontend via Nginx) is orchestrated via Docker Compose.

```bash
# Clone or navigate to the repository
cd "c:\Users\arkpr\Downloads\databricks assessment"

# Build and run containers
docker-compose up --build
```

* **Frontend UI:** Open your browser to `http://localhost:3000`
* **Backend API & Swagger Docs:** Open `http://localhost:8000/docs`
* **Health Check:** `http://localhost:8000/api/health`

---

## 2. Deploying to Heroku

### Option A: Heroku Git (Backend + Frontend or Backend Only)

#### Deploying the Python Backend to Heroku:
```bash
cd backend

# Log in to Heroku CLI
heroku login

# Create new Heroku app
heroku create aeropow-backend

# Deploy application code
git init
git add .
git commit -m "Deploy FastAPI Backend"
heroku git:remote -a aeropow-backend
git push heroku master

# Open health check
heroku open /api/health
```

#### Deploying via Heroku Container Registry:
```bash
# Log in to container registry
heroku container:login

# Build and push Docker image
cd backend
heroku container:push web -a aeropow-backend
heroku container:release web -a aeropow-backend
```

---

## 3. Deploying to Vercel

The React frontend is optimized for zero-configuration static deployment on Vercel.

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy Frontend
```bash
cd frontend

# Deploy preview build
vercel

# Deploy production build with Backend API environment variable
vercel --prod --build-env REACT_APP_API_URL=https://aeropow-backend.herokuapp.com
```

### Step 3: API Proxying
`frontend/vercel.json` contains route rewrites that automatically forward `/api/*` calls from the Vercel edge network directly to your hosted backend, preventing any CORS complications.

---

## 4. Local Manual Development (Without Docker)

### Backend (Terminal 1)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm start
# Automatically opens http://localhost:3000
```

---

## 5. Environment Variables

| Variable | Target | Default | Description |
|---|---|---|---|
| `REACT_APP_API_URL` | Frontend | `http://localhost:8000` | URL of the FastAPI backend service |
| `ELEXON_BASE_URL` | Backend | `https://data.elexon.co.uk/bmrs/api/v1` | Root URL for Elexon BMRS API |
| `PORT` | Backend | `8000` | Port listened to by Uvicorn (managed by Heroku dynamically) |

