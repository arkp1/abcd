"""
Pydantic response models for the Wind Power Forecast Accuracy Dashboard API.

Every endpoint returns data wrapped in one of these schemas so that clients
receive a predictable, well-typed JSON structure.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Individual record schemas
# ---------------------------------------------------------------------------

class ActualRecord(BaseModel):
    """A single half-hourly wind generation actual reading."""

    startTime: str = Field(..., description="ISO-8601 start time of the settlement period")
    generation: float = Field(..., description="Actual wind generation in MW")


class ForecastRecord(BaseModel):
    """A single wind generation forecast record."""

    startTime: str = Field(..., description="ISO-8601 start time of the forecasted period")
    publishTime: str = Field(..., description="ISO-8601 time the forecast was published")
    generation: float = Field(..., description="Forecasted wind generation in MW")


class MergedRecord(BaseModel):
    """Merged actual-vs-forecast record with computed error fields."""

    startTime: str = Field(..., description="ISO-8601 start time")
    actual_generation: float = Field(..., description="Actual wind generation in MW")
    forecast_generation: float = Field(..., description="Forecasted wind generation in MW")
    error: float = Field(..., description="Forecast − Actual (MW)")
    absolute_error: float = Field(..., description="|Forecast − Actual| (MW)")
    percentage_error: Optional[float] = Field(
        None, description="((Forecast − Actual) / Actual) × 100"
    )


# ---------------------------------------------------------------------------
# Accuracy metric schemas
# ---------------------------------------------------------------------------

class AccuracyMetrics(BaseModel):
    """Overall forecast accuracy metrics."""

    mae: float = Field(..., description="Mean Absolute Error (MW)")
    rmse: float = Field(..., description="Root Mean Square Error (MW)")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%)")
    mbe: float = Field(..., description="Mean Bias Error (MW)")
    correlation: Optional[float] = Field(None, description="Pearson correlation coefficient")


class DailyMetric(BaseModel):
    """Forecast accuracy metrics aggregated to a single calendar day."""

    date: str = Field(..., description="Calendar date (YYYY-MM-DD)")
    mae: float
    rmse: float
    mape: Optional[float] = None
    mbe: float


class HourlyMetric(BaseModel):
    """Forecast accuracy metrics aggregated by hour of day (0–23)."""

    hour: int = Field(..., ge=0, le=23, description="Hour of day (0–23)")
    mae: float
    rmse: float
    mape: Optional[float] = None
    mbe: float


# ---------------------------------------------------------------------------
# Composite response schemas
# ---------------------------------------------------------------------------

class ForecastVsActualResponse(BaseModel):
    """Response for the /api/forecast-vs-actual endpoint."""

    data: list[MergedRecord]
    metrics: AccuracyMetrics


class ForecastAccuracyResponse(BaseModel):
    """Response for the /api/forecast-accuracy endpoint."""

    overall_metrics: AccuracyMetrics
    daily_metrics: list[DailyMetric]
    hourly_metrics: list[HourlyMetric]
