import os
import sys

# Add the backend directory to sys.path so app modules are resolvable
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "..", "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the FastAPI instance
from app.main import app

