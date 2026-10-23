"""
FastAPI route definitions for the Wind Power Forecast Accuracy Dashboard.

All endpoints live under the ``/api`` prefix and proxy data from the Elexon
BMRS API through the processing pipeline defined in
:mod:`app.data_processing`.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.config import TARGET_MONTH_END, TARGET_MONTH_START
from app.data_processing import (
    calculate_accuracy_metrics,
    get_forecast_by_publish_time,
    get_latest_forecasts,
    merge_actuals_and_forecasts,
    process_actuals,
    process_forecasts,
)
from app.elexon_client import fetch_wind_actuals, fetch_wind_forecasts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["wind-power"])

# Simple in-memory cache to keep response times lightning fast (<10ms)
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes


def _get_from_cache(key: str) -> Any | None:
    if key in _cache:
        timestamp, value = _cache[key]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            return value
        del _cache[key]
    return None


def _set_cache(key: str, value: Any) -> None:
    _cache[key] = (time.time(), value)


def _publish_window(date_from: str, date_to: str) -> tuple[str, str]:
    """Return ISO-8601 publish datetime bounds that cover forecasts for the
    given settlement-date window.

    Day-ahead forecasts for a settlement day are published the day before,
    so we start one day earlier.
    """
    publish_from = (
        datetime.strptime(date_from, "%Y-%m-%d") - timedelta(days=1)
    ).strftime("%Y-%m-%dT00:00:00Z")
    publish_to = (
        datetime.strptime(date_to, "%Y-%m-%d")
    ).strftime("%Y-%m-%dT23:59:59Z")
    return publish_from, publish_to


@router.get("/health")
async def health_check() -> dict:
    """Simple liveness probe."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}


@router.get("/actuals")
async def get_actuals(
    date_from: str = Query(default=TARGET_MONTH_START, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(default=TARGET_MONTH_END, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Return half-hourly wind generation actuals for the requested period."""
    cache_key = f"actuals_{date_from}_{date_to}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    try:
        raw = await fetch_wind_actuals(date_from, date_to)
        df = process_actuals(raw)

        records = df.assign(
            startTime=df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            actual=df["generation"],
        ).to_dict(orient="records")

        resp = {"data": records, "count": len(records)}
        _set_cache(cache_key, resp)
        return resp

    except Exception as exc:
        logger.exception("Error fetching actuals")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/forecasts")
async def get_forecasts(
    date_from: str = Query(default=TARGET_MONTH_START, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(default=TARGET_MONTH_END, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Return wind generation forecasts for the requested period."""
    cache_key = f"forecasts_{date_from}_{date_to}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    try:
        publish_from, publish_to = _publish_window(date_from, date_to)
        raw = await fetch_wind_forecasts(publish_from, publish_to)
        df = process_forecasts(raw)

        records = df.assign(
            startTime=df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            publishTime=df["publishTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            forecast=df["generation"],
        ).to_dict(orient="records")

        resp = {"data": records, "count": len(records)}
        _set_cache(cache_key, resp)
        return resp

    except Exception as exc:
        logger.exception("Error fetching forecasts")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/forecast-vs-actual")
async def forecast_vs_actual(
    date_from: str = Query(default=TARGET_MONTH_START, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(default=TARGET_MONTH_END, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Compare latest forecasts against actuals and return accuracy metrics."""
    cache_key = f"fva_{date_from}_{date_to}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    try:
        raw_actuals = await fetch_wind_actuals(date_from, date_to)
        publish_from, publish_to = _publish_window(date_from, date_to)
        raw_forecasts = await fetch_wind_forecasts(publish_from, publish_to)

        actuals_df = process_actuals(raw_actuals)
        forecasts_df = process_forecasts(raw_forecasts)
        latest_fc = get_latest_forecasts(forecasts_df)
        merged = merge_actuals_and_forecasts(actuals_df, latest_fc)

        metrics_dict = calculate_accuracy_metrics(merged)

        # Serialise with explicit aliases for both frontend naming styles
        data_records = merged.assign(
            startTime=merged["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            actual=merged["actual_generation"],
            forecast=merged["forecast_generation"],
            absError=merged["absolute_error"],
            percentError=merged["percentage_error"],
        ).to_dict(orient="records")

        for rec in data_records:
            for key, val in rec.items():
                if isinstance(val, float) and (val != val):  # NaN check
                    rec[key] = None

        resp = {
            "data": data_records,
            "metrics": metrics_dict["overall_metrics"],
        }
        _set_cache(cache_key, resp)
        return resp

    except Exception as exc:
        logger.exception("Error in forecast-vs-actual")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/forecast-accuracy")
async def forecast_accuracy(
    date_from: str = Query(default=TARGET_MONTH_START, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(default=TARGET_MONTH_END, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Return comprehensive accuracy metrics (overall, daily, hourly)."""
    cache_key = f"acc_{date_from}_{date_to}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    try:
        raw_actuals = await fetch_wind_actuals(date_from, date_to)
        publish_from, publish_to = _publish_window(date_from, date_to)
        raw_forecasts = await fetch_wind_forecasts(publish_from, publish_to)

        actuals_df = process_actuals(raw_actuals)
        forecasts_df = process_forecasts(raw_forecasts)
        latest_fc = get_latest_forecasts(forecasts_df)
        merged = merge_actuals_and_forecasts(actuals_df, latest_fc)

        metrics = calculate_accuracy_metrics(merged)

        _set_cache(cache_key, metrics)
        return metrics

    except Exception as exc:
        logger.exception("Error computing forecast accuracy")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/forecast-evolution")
async def forecast_evolution(
    target_date: str = Query(
        default="2026-01-15",
        description="Delivery date to examine (YYYY-MM-DD)",
    ),
) -> dict:
    """Show how forecasts for a specific delivery day evolved over time."""
    cache_key = f"evol_{target_date}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    try:
        pub_start = (
            datetime.strptime(target_date, "%Y-%m-%d") - timedelta(days=2)
        ).strftime("%Y-%m-%dT00:00:00Z")
        pub_end = (
            datetime.strptime(target_date, "%Y-%m-%d")
        ).strftime("%Y-%m-%dT23:59:59Z")

        # Fetch forecasts
        raw_forecasts = await fetch_wind_forecasts(pub_start, pub_end)
        forecasts_df = process_forecasts(raw_forecasts)

        # Fetch actuals for the target delivery date
        raw_actuals = await fetch_wind_actuals(target_date, target_date)
        actuals_df = process_actuals(raw_actuals)

        actuals_list = actuals_df.assign(
            startTime=actuals_df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            actual=actuals_df["generation"],
        ).to_dict(orient="records")

        # Filter forecasts to target date
        if not forecasts_df.empty:
            target_start = datetime.strptime(target_date, "%Y-%m-%d")
            target_end = target_start + timedelta(days=1)
            import pandas as pd

            target_start_ts = pd.Timestamp(target_start, tz="UTC")
            target_end_ts = pd.Timestamp(target_end, tz="UTC")

            forecasts_df = forecasts_df[
                (forecasts_df["startTime"] >= target_start_ts)
                & (forecasts_df["startTime"] < target_end_ts)
            ]

        evolution = get_forecast_by_publish_time(forecasts_df)

        forecast_series = []
        for pub_time, pts in evolution.items():
            forecast_series.append({
                "publishTime": pub_time,
                "data": [
                    {
                        "startTime": p["startTime"],
                        "forecast": p["generation"],
                        "generation": p["generation"],
                    }
                    for p in pts
                ],
            })

        resp = {
            "target_date": target_date,
            "actuals": actuals_list,
            "forecasts": forecast_series,
            "forecast_series": forecast_series,
            "forecasts_by_publish_time": evolution,
            "publish_time_count": len(evolution),
        }
        _set_cache(cache_key, resp)
        return resp

    except Exception as exc:
        logger.exception("Error in forecast-evolution")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
