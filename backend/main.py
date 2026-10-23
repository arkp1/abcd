"""
Root entrypoint for Vercel / ASGI runners.
Exposes the FastAPI instance 'app' from app.main.
"""
from app.main import app

__all__ = ["app"]
