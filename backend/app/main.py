"""
FastAPI application entry-point for the Wind Power Forecast Accuracy Dashboard.

Configures CORS middleware (permissive for local development) and mounts the
API router defined in ``app.routes``.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router

app = FastAPI(
    title="Wind Power Forecast Accuracy Dashboard API",
    description=(
        "Backend service that fetches wind generation actuals and forecasts "
        "from the Elexon BMRS API, computes accuracy metrics, and exposes "
        "them via a RESTful interface."
    ),
    version="1.0.0",
)

# ------------------------------------------------------------------
# CORS – allow all origins during development
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Mount API router
# ------------------------------------------------------------------
app.include_router(router)
