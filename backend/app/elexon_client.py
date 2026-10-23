"""
Async HTTP client for the Elexon BMRS API.

Provides two public helpers:

* :func:`fetch_wind_actuals` – retrieves half-hourly wind generation actuals
  (FUELHH dataset).
* :func:`fetch_wind_forecasts` – retrieves wind generation forecasts (WINDFOR
  dataset).

Both functions chunk large date ranges into 7-day windows and include retry
logic with exponential back-off to handle transient failures.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

import httpx
from dateutil import parser as dtparser

from app.config import (
    CHUNK_DAYS,
    ELEXON_BASE_URL,
    FUELHH_ENDPOINT,
    HTTP_TIMEOUT_SECONDS,
    MAX_RETRIES,
    WINDFOR_ENDPOINT,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _date_windows(
    start: str,
    end: str,
    days: int = CHUNK_DAYS,
    *,
    as_datetime: bool = False,
) -> list[tuple[str, str]]:
    """Split a date range into *days*-wide windows.

    Parameters
    ----------
    start : str
        Start date / datetime (ISO-8601).
    end : str
        End date / datetime (ISO-8601).
    days : int, optional
        Maximum width of each chunk in days (default ``CHUNK_DAYS``).
    as_datetime : bool, optional
        If ``True`` format window bounds as ISO-8601 datetime strings,
        otherwise as ``YYYY-MM-DD``.

    Returns
    -------
    list[tuple[str, str]]
        List of ``(window_start, window_end)`` pairs.
    """
    dt_start = dtparser.parse(start)
    dt_end = dtparser.parse(end)

    windows: list[tuple[str, str]] = []
    cursor = dt_start
    while cursor <= dt_end:
        window_end = min(cursor + timedelta(days=days - 1), dt_end)
        if as_datetime:
            windows.append((
                cursor.strftime("%Y-%m-%dT%H:%M:%SZ"),
                (window_end + timedelta(days=1) - timedelta(seconds=1)).strftime(
                    "%Y-%m-%dT%H:%M:%SZ"
                ),
            ))
        else:
            windows.append((cursor.strftime("%Y-%m-%d"), window_end.strftime("%Y-%m-%d")))
        cursor = window_end + timedelta(days=1)

    return windows


async def _fetch_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any],
    *,
    retries: int = MAX_RETRIES,
) -> list[dict]:
    """GET *url* with *params*, retrying on failure with exponential back-off.

    Parameters
    ----------
    client : httpx.AsyncClient
        Pre-configured async HTTP client.
    url : str
        Fully-qualified URL.
    params : dict
        Query-string parameters.
    retries : int, optional
        Maximum number of retry attempts (default ``MAX_RETRIES``).

    Returns
    -------
    list[dict]
        Parsed JSON response (expected to be a JSON array).

    Raises
    ------
    httpx.HTTPStatusError
        If all retry attempts are exhausted.
    """
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            # The stream endpoints return a JSON array directly.
            if isinstance(data, list):
                return data
            # Some endpoints wrap in an object – fallback.
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            return data if isinstance(data, list) else []
        except (httpx.HTTPStatusError, httpx.ReadTimeout, httpx.ConnectTimeout) as exc:
            last_exc = exc
            wait = 2 ** attempt  # 1 s, 2 s, 4 s …
            logger.warning(
                "Attempt %d/%d for %s failed (%s). Retrying in %ds …",
                attempt + 1,
                retries + 1,
                url,
                exc,
                wait,
            )
            await asyncio.sleep(wait)
    # All retries exhausted – re-raise the last exception.
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_wind_actuals(date_from: str, date_to: str) -> list[dict]:
    """Fetch half-hourly wind generation actuals from the FUELHH dataset.

    The date range is automatically chunked into 7-day windows to avoid
    API timeouts when requesting a full month of data.

    Parameters
    ----------
    date_from : str
        Settlement start date (``YYYY-MM-DD``).
    date_to : str
        Settlement end date (``YYYY-MM-DD``).

    Returns
    -------
    list[dict]
        Raw records, each containing at least ``startTime`` and
        ``generation`` fields.
    """
    url = f"{ELEXON_BASE_URL}{FUELHH_ENDPOINT}"
    all_records: list[dict] = []

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        for win_start, win_end in _date_windows(date_from, date_to):
            params = {
                "settlementDateFrom": win_start,
                "settlementDateTo": win_end,
                "fuelType": "WIND",
            }
            logger.info("Fetching FUELHH actuals %s → %s", win_start, win_end)
            records = await _fetch_with_retry(client, url, params)
            all_records.extend(records)
            logger.info("  … received %d records", len(records))

    return all_records


async def fetch_wind_forecasts(publish_from: str, publish_to: str) -> list[dict]:
    """Fetch wind generation forecasts from the WINDFOR dataset.

    Forecasts are published up to 8 times per day.  The date range is
    chunked into 7-day windows keyed on ``publishDateTimeFrom`` /
    ``publishDateTimeTo``.

    Parameters
    ----------
    publish_from : str
        Earliest publish datetime (ISO-8601, e.g.
        ``2025-12-31T00:00:00Z``).
    publish_to : str
        Latest publish datetime (ISO-8601).

    Returns
    -------
    list[dict]
        Raw records, each containing at least ``startTime``,
        ``publishTime``, and ``generation`` fields.
    """
    url = f"{ELEXON_BASE_URL}{WINDFOR_ENDPOINT}"
    all_records: list[dict] = []

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        for win_start, win_end in _date_windows(
            publish_from, publish_to, as_datetime=True
        ):
            params = {
                "publishDateTimeFrom": win_start,
                "publishDateTimeTo": win_end,
            }
            logger.info("Fetching WINDFOR forecasts %s → %s", win_start, win_end)
            records = await _fetch_with_retry(client, url, params)
            all_records.extend(records)
            logger.info("  … received %d records", len(records))

    return all_records
