import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fetchForecastVsActual, fetchForecastAccuracy } from '../api';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { Zap, Target, TrendingUp, BarChart3 } from 'lucide-react';

const Overview = ({ dateFrom, dateTo }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [accuracyData, setAccuracyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [comparison, accuracy] = await Promise.all([
        fetchForecastVsActual(dateFrom, dateTo),
        fetchForecastAccuracy(dateFrom, dateTo),
      ]);
      setComparisonData(comparison);
      setAccuracyData(accuracy);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const chartData = useMemo(() => {
    if (!comparisonData?.data) return [];
    return comparisonData.data.map((item) => ({
      ...item,
      time: item.startTime || item.start_time || item.timestamp,
      actual: item.actual != null ? Number(item.actual) : null,
      forecast: item.forecast != null ? Number(item.forecast) : null,
    }));
  }, [comparisonData]);

  const summaryStats = useMemo(() => {
    if (!chartData.length) return null;
    const actuals = chartData.filter((d) => d.actual != null).map((d) => d.actual);
    const forecasts = chartData.filter((d) => d.forecast != null).map((d) => d.forecast);
    if (!actuals.length) return null;
    return {
      avgActual: actuals.reduce((a, b) => a + b, 0) / actuals.length,
      maxActual: Math.max(...actuals),
      minActual: Math.min(...actuals),
      avgForecast: forecasts.length ? forecasts.reduce((a, b) => a + b, 0) / forecasts.length : null,
      totalRecords: chartData.length,
    };
  }, [chartData]);

  const metrics = useMemo(() => {
    if (!accuracyData) return null;
    const m = accuracyData.metrics || accuracyData;
    return {
      mae: m.mae ?? m.MAE,
      rmse: m.rmse ?? m.RMSE,
      mape: m.mape ?? m.MAPE,
      mbe: m.mbe ?? m.MBE ?? m.mean_bias_error,
    };
  }, [accuracyData]);

  const formatXAxis = (value) => {
    if (!value) return '';
    try {
      const date = typeof value === 'string' ? parseISO(value) : new Date(value);
      return format(date, 'dd MMM HH:mm');
    } catch {
      return String(value).slice(0, 16);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    let formattedLabel = label;
    try {
      const date = typeof label === 'string' ? parseISO(label) : new Date(label);
      formattedLabel = format(date, 'dd MMM yyyy HH:mm');
    } catch { /* keep as-is */ }
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{formattedLabel}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="chart-tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {entry.value != null ? Number(entry.value).toFixed(1) : '—'} MW
          </p>
        ))}
      </div>
    );
  };

  if (loading) return <LoadingSpinner message="Loading overview data..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="overview">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="MAE"
          value={metrics?.mae}
          unit="MW"
          description="Mean Absolute Error — average magnitude of forecast errors"
          colorType={metrics?.mae < 500 ? 'green' : metrics?.mae < 1000 ? 'amber' : 'red'}
        />
        <MetricCard
          title="RMSE"
          value={metrics?.rmse}
          unit="MW"
          description="Root Mean Square Error — penalises large forecast misses"
          colorType={metrics?.rmse < 600 ? 'green' : metrics?.rmse < 1200 ? 'amber' : 'red'}
        />
        <MetricCard
          title="MAPE"
          value={metrics?.mape}
          unit="%"
          description="Mean Absolute Percentage Error — relative forecast accuracy"
          colorType={metrics?.mape < 10 ? 'green' : metrics?.mape < 20 ? 'amber' : 'red'}
        />
        <MetricCard
          title="MBE"
          value={metrics?.mbe}
          unit="MW"
          description="Mean Bias Error — positive = over-forecast, negative = under-forecast"
          colorType="blue"
          trend={metrics?.mbe > 50 ? 'up' : metrics?.mbe < -50 ? 'down' : 'neutral'}
        />
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="summary-bar">
          <div className="summary-item">
            <Zap size={16} className="summary-icon" />
            <span className="summary-label">Avg Generation</span>
            <span className="summary-value">{summaryStats.avgActual.toFixed(1)} MW</span>
          </div>
          <div className="summary-item">
            <TrendingUp size={16} className="summary-icon" />
            <span className="summary-label">Peak Generation</span>
            <span className="summary-value">{summaryStats.maxActual.toFixed(1)} MW</span>
          </div>
          <div className="summary-item">
            <BarChart3 size={16} className="summary-icon" />
            <span className="summary-label">Min Generation</span>
            <span className="summary-value">{summaryStats.minActual.toFixed(1)} MW</span>
          </div>
          <div className="summary-item">
            <Target size={16} className="summary-icon" />
            <span className="summary-label">Data Points</span>
            <span className="summary-value">{summaryStats.totalRecords.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Wind Generation: Forecast vs Actual</h3>
          <p className="card-subtitle">Half-hourly wind power generation across the UK grid</p>
        </div>
        <div className="chart-container chart-container--large">
          <ResponsiveContainer width="100%" height={420}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradientForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0891b2" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="plainline"
                formatter={(value) => <span style={{ color: '#374151', fontSize: 13 }}>{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Generation"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradientActual)"
                dot={false}
                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#0891b2"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#gradientForecast)"
                dot={false}
                activeDot={{ r: 4, stroke: '#0891b2', strokeWidth: 2, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Overview;
