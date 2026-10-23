"""
Configuration constants for the Wind Power Forecast Accuracy Dashboard backend.

Contains API endpoints, date ranges, and other application-wide settings
for connecting to the Elexon BMRS API.
"""

# ---------------------------------------------------------------------------
# Elexon BMRS API base URL (no API key required)
# ---------------------------------------------------------------------------
ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"

# ---------------------------------------------------------------------------
# Dataset-specific streaming endpoints
# ---------------------------------------------------------------------------
FUELHH_ENDPOINT: str = "/datasets/FUELHH/stream"
WINDFOR_ENDPOINT: str = "/datasets/WINDFOR/stream"

# ---------------------------------------------------------------------------
# Default analysis window – January 2026
# ---------------------------------------------------------------------------
TARGET_MONTH_START: str = "2026-01-01"
TARGET_MONTH_END: str = "2026-01-31"

# ---------------------------------------------------------------------------
# HTTP client settings
# ---------------------------------------------------------------------------
HTTP_TIMEOUT_SECONDS: int = 60
MAX_RETRIES: int = 3
CHUNK_DAYS: int = 7  # Fetch data in 7-day windows to avoid timeouts
