"""
Data-processing utilities for the Wind Power Forecast Accuracy Dashboard.

All heavy lifting (deduplication, merging, metric computation) happens here
so that the route handlers stay thin and testable.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# DataFrame construction & cleaning
# ---------------------------------------------------------------------------

def process_actuals(raw_data: list[dict]) -> pd.DataFrame:
    """Convert raw FUELHH records into a clean actuals DataFrame.

    Parameters
    ----------
    raw_data : list[dict]
        Records returned by :func:`elexon_client.fetch_wind_actuals`.

    Returns
    -------
    pd.DataFrame
        Columns: ``startTime`` (datetime64), ``generation`` (float).
        Sorted by ``startTime`` with duplicates removed (keeps last).
    """
    if not raw_data:
        return pd.DataFrame(columns=["startTime", "generation"])

    df = pd.DataFrame(raw_data)
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df[["startTime", "generation"]].copy()
    df.sort_values("startTime", inplace=True)
    df.drop_duplicates(subset=["startTime"], keep="last", inplace=True)
    df.reset_index(drop=True, inplace=True)

    return df


def process_forecasts(raw_data: list[dict]) -> pd.DataFrame:
    """Convert raw WINDFOR records into a clean forecasts DataFrame.

    Parameters
    ----------
    raw_data : list[dict]
        Records returned by :func:`elexon_client.fetch_wind_forecasts`.

    Returns
    -------
    pd.DataFrame
        Columns: ``startTime``, ``publishTime`` (both datetime64),
        ``generation`` (float).  Sorted by ``startTime`` then
        ``publishTime``.
    """
    if not raw_data:
        return pd.DataFrame(columns=["startTime", "publishTime", "generation"])

    df = pd.DataFrame(raw_data)
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df[["startTime", "publishTime", "generation"]].copy()
    df.sort_values(["startTime", "publishTime"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    return df


# ---------------------------------------------------------------------------
# Forecast selection helpers
# ---------------------------------------------------------------------------

def get_latest_forecasts(forecasts_df: pd.DataFrame) -> pd.DataFrame:
    """Select the most-recently-published forecast for each delivery period.

    For each unique ``startTime`` the forecast row with the latest
    ``publishTime`` is retained.

    Parameters
    ----------
    forecasts_df : pd.DataFrame
        Output of :func:`process_forecasts`.

    Returns
    -------
    pd.DataFrame
        Columns: ``startTime``, ``forecast_generation``, ``publishTime``.
    """
    if forecasts_df.empty:
        return pd.DataFrame(columns=["startTime", "forecast_generation", "publishTime"])

    idx = forecasts_df.groupby("startTime")["publishTime"].idxmax()
    latest = forecasts_df.loc[idx].copy()
    latest.rename(columns={"generation": "forecast_generation"}, inplace=True)
    latest = latest[["startTime", "forecast_generation", "publishTime"]].copy()
    latest.sort_values("startTime", inplace=True)
    latest.reset_index(drop=True, inplace=True)

    return latest


def get_forecast_by_publish_time(
    forecasts_df: pd.DataFrame,
    publish_times: list[str] | None = None,
) -> dict[str, list[dict]]:
    """Group forecast series by their publish-time window.

    Parameters
    ----------
    forecasts_df : pd.DataFrame
        Output of :func:`process_forecasts`.
    publish_times : list[str] | None
        Optional list of specific publish-time strings (ISO-8601) to
        include.  When ``None`` all distinct publish times are used.

    Returns
    -------
    dict[str, list[dict]]
        Mapping from publish-time label to a list of
        ``{"startTime": …, "generation": …}`` dicts.
    """
    if forecasts_df.empty:
        return {}

    df = forecasts_df.copy()

    if publish_times is not None:
        target_times = pd.to_datetime(publish_times, utc=True)
        df = df[df["publishTime"].isin(target_times)]

    result: dict[str, list[dict]] = {}
    for pub_time, group in df.groupby("publishTime"):
        key = str(pub_time)
        records = (
            group[["startTime", "generation"]]
            .sort_values("startTime")
            .assign(startTime=lambda d: d["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"))
            .to_dict(orient="records")
        )
        result[key] = records

    return result


# ---------------------------------------------------------------------------
# Merging actuals & forecasts
# ---------------------------------------------------------------------------

def merge_actuals_and_forecasts(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
) -> pd.DataFrame:
    """Inner-join actuals with latest forecasts and compute error columns.

    Parameters
    ----------
    actuals_df : pd.DataFrame
        Output of :func:`process_actuals`.
    forecasts_df : pd.DataFrame
        Output of :func:`get_latest_forecasts`.

    Returns
    -------
    pd.DataFrame
        Columns: ``startTime``, ``actual_generation``,
        ``forecast_generation``, ``error``, ``absolute_error``,
        ``percentage_error``.
    """
    if actuals_df.empty or forecasts_df.empty:
        return pd.DataFrame(
            columns=[
                "startTime",
                "actual_generation",
                "forecast_generation",
                "error",
                "absolute_error",
                "percentage_error",
            ]
        )

    merged = pd.merge(
        actuals_df.rename(columns={"generation": "actual_generation"}),
        forecasts_df[["startTime", "forecast_generation"]],
        on="startTime",
        how="inner",
    )

    merged["error"] = merged["forecast_generation"] - merged["actual_generation"]
    merged["absolute_error"] = merged["error"].abs()

    # Percentage error – guard against division by zero
    merged["percentage_error"] = np.where(
        merged["actual_generation"] != 0,
        (merged["error"] / merged["actual_generation"]) * 100,
        np.nan,
    )

    merged.sort_values("startTime", inplace=True)
    merged.reset_index(drop=True, inplace=True)

    return merged


# ---------------------------------------------------------------------------
# Accuracy metrics
# ---------------------------------------------------------------------------

def _compute_metrics_for_series(
    errors: pd.Series,
    abs_errors: pd.Series,
    pct_errors: pd.Series,
    actuals: pd.Series | None = None,
    forecasts: pd.Series | None = None,
) -> dict[str, Any]:
    """Compute MAE, RMSE, MAPE, MBE, and correlation for a set of errors.

    Parameters
    ----------
    errors : pd.Series
        Signed forecast errors (forecast − actual).
    abs_errors : pd.Series
        Absolute forecast errors.
    pct_errors : pd.Series
        Percentage errors (may contain NaN).
    actuals, forecasts : pd.Series | None
        Raw values used for correlation.

    Returns
    -------
    dict
        Keys: ``mae``, ``rmse``, ``mape``, ``mbe``, ``correlation``.
    """
    mae = float(abs_errors.mean()) if len(abs_errors) else 0.0
    rmse = float(np.sqrt((errors ** 2).mean())) if len(errors) else 0.0
    mbe = float(errors.mean()) if len(errors) else 0.0

    valid_pct = pct_errors.dropna()
    mape = float(valid_pct.abs().mean()) if len(valid_pct) else None

    correlation: float | None = None
    if actuals is not None and forecasts is not None and len(actuals) > 1:
        corr = actuals.corr(forecasts)
        correlation = float(corr) if pd.notna(corr) else None

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape": round(mape, 2) if mape is not None else None,
        "mbe": round(mbe, 2),
        "correlation": round(correlation, 4) if correlation is not None else None,
    }


def calculate_accuracy_metrics(merged_df: pd.DataFrame) -> dict[str, Any]:
    """Calculate comprehensive forecast accuracy metrics.

    Parameters
    ----------
    merged_df : pd.DataFrame
        Output of :func:`merge_actuals_and_forecasts`.

    Returns
    -------
    dict
        Keys:
        - ``overall_metrics`` – :class:`dict` with MAE, RMSE, etc.
        - ``daily_metrics`` – ``list[dict]``, one entry per calendar day.
        - ``hourly_metrics`` – ``list[dict]``, one entry per hour (0–23).
    """
    if merged_df.empty:
        empty_metrics = {
            "mae": 0.0,
            "rmse": 0.0,
            "mape": None,
            "mbe": 0.0,
            "correlation": None,
        }
        return {
            "overall_metrics": empty_metrics,
            "daily_metrics": [],
            "hourly_metrics": [],
        }

    # --- Overall ----------------------------------------------------------
    overall = _compute_metrics_for_series(
        merged_df["error"],
        merged_df["absolute_error"],
        merged_df["percentage_error"],
        merged_df["actual_generation"],
        merged_df["forecast_generation"],
    )

    # --- Daily ------------------------------------------------------------
    df = merged_df.copy()
    df["date"] = df["startTime"].dt.date

    daily_metrics: list[dict] = []
    for date, grp in df.groupby("date"):
        m = _compute_metrics_for_series(
            grp["error"],
            grp["absolute_error"],
            grp["percentage_error"],
            grp["actual_generation"],
            grp["forecast_generation"],
        )
        daily_metrics.append({"date": str(date), **m})

    # --- Hourly -----------------------------------------------------------
    df["hour"] = df["startTime"].dt.hour

    hourly_metrics: list[dict] = []
    for hour, grp in df.groupby("hour"):
        m = _compute_metrics_for_series(
            grp["error"],
            grp["absolute_error"],
            grp["percentage_error"],
            grp["actual_generation"],
            grp["forecast_generation"],
        )
        hourly_metrics.append({"hour": int(hour), **m})

    return {
        "overall_metrics": overall,
        "daily_metrics": daily_metrics,
        "hourly_metrics": hourly_metrics,
    }
