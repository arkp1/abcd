import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fetchForecastEvolution } from '../api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { CalendarDays, Info, AlertCircle, CheckCircle } from 'lucide-react';

// Distinct colours for multiple forecast lines
const FORECAST_COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#14b8a6',
  '#8b5cf6', '#06b6d4', '#eab308', '#64748b',
  '#d946ef', '#84cc16', '#f43f5e', '#22d3ee',
];

const ForecastEvolution = ({ dateFrom }) => {
  const [targetDate, setTargetDate] = useState('2026-01-15');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchForecastEvolution(targetDate);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetDate]);

  // Build chart data: merge all forecast series + actual into a common time axis
  const { chartData, forecastSeries, insights } = useMemo(() => {
    if (!data) return { chartData: [], forecastSeries: [], insights: null };

    const forecasts = data.forecasts || data.forecast_series || [];
    const actuals = data.actuals || data.actual_data || [];

    // Build time-indexed map
    const timeMap = {};

    // Add actuals
    (Array.isArray(actuals) ? actuals : []).forEach((item) => {
      const time = item.startTime || item.start_time || item.timestamp || item.time;
      if (!time) return;
      if (!timeMap[time]) timeMap[time] = { time };
      timeMap[time].actual = Number(item.actual ?? item.value ?? item.generation);
    });

    // Build forecast series info
    const seriesInfo = [];
    if (Array.isArray(forecasts)) {
      forecasts.forEach((series, idx) => {
        const publishTime = series.publishTime || series.publish_time || series.created_at || `Forecast ${idx + 1}`;
        let publishLabel;
        try {
          const d = typeof publishTime === 'string' ? parseISO(publishTime) : new Date(publishTime);
          publishLabel = format(d, 'dd MMM HH:mm');
        } catch {
          publishLabel = String(publishTime).slice(0, 16);
        }
        const key = `forecast_${idx}`;
        seriesInfo.push({ key, publishTime, publishLabel, color: FORECAST_COLORS[idx % FORECAST_COLORS.length] });

        const points = series.data || series.points || series.values || [];
        points.forEach((pt) => {
          const time = pt.startTime || pt.start_time || pt.timestamp || pt.time;
          if (!time) return;
          if (!timeMap[time]) timeMap[time] = { time };
          timeMap[time][key] = Number(pt.forecast ?? pt.value ?? pt.generation);
        });
      });
    }

    const chartData = Object.values(timeMap).sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });

    // Calculate accuracy insights
    let insights = null;
    if (seriesInfo.length && chartData.some((d) => d.actual != null)) {
      const seriesErrors = seriesInfo.map((s) => {
        let sumAbsErr = 0;
        let count = 0;
        chartData.forEach((d) => {
          if (d.actual != null && d[s.key] != null) {
            sumAbsErr += Math.abs(d[s.key] - d.actual);
            count++;
          }
        });
        return { ...s, mae: count > 0 ? sumAbsErr / count : null, count };
      }).filter((s) => s.mae != null);

      if (seriesErrors.length) {
        seriesErrors.sort((a, b) => a.mae - b.mae);
        insights = {
          best: seriesErrors[0],
          worst: seriesErrors[seriesErrors.length - 1],
          allSeries: seriesErrors,
        };
      }
    }

    return { chartData, forecastSeries: seriesInfo, insights };
  }, [data]);

  const formatXAxis = (value) => {
    if (!value) return '';
    try {
      const d = typeof value === 'string' ? parseISO(value) : new Date(value);
      return format(d, 'HH:mm');
    } catch {
      return String(value).slice(11, 16);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    let formatted = label;
    try {
      const d = typeof label === 'string' ? parseISO(label) : new Date(label);
      formatted = format(d, 'dd MMM yyyy HH:mm');
    } catch { /* keep */ }
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{formatted}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="chart-tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {entry.value != null ? Number(entry.value).toFixed(1) : '—'} MW
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="forecast-evolution">
      {/* Date Picker */}
      <div className="card date-picker-card">
        <div className="date-picker-row">
          <CalendarDays size={18} className="date-picker-icon" />
          <label className="date-picker-label">Target Delivery Date:</label>
          <input
            type="date"
            className="date-input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min="2026-01-01"
            max="2026-01-31"
          />
          <span className="date-picker-hint">Select a date in January 2026 to see how forecasts evolved</span>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading forecast evolution data..." />}
      {error && <ErrorMessage message={error} onRetry={loadData} />}

      {!loading && !error && (
        <>
          {/* Insights */}
          {insights && (
            <div className="insights-bar">
              <div className="insight-item insight-item--best">
                <CheckCircle size={18} className="insight-icon" />
                <div>
                  <span className="insight-label">Most Accurate Forecast</span>
                  <span className="insight-value">
                    Published {insights.best.publishLabel} — MAE: {insights.best.mae.toFixed(1)} MW
                  </span>
                </div>
              </div>
              <div className="insight-item insight-item--worst">
                <AlertCircle size={18} className="insight-icon" />
                <div>
                  <span className="insight-label">Least Accurate Forecast</span>
                  <span className="insight-value">
                    Published {insights.worst.publishLabel} — MAE: {insights.worst.mae.toFixed(1)} MW
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Evolution Chart */}
          <div className="card chart-card">
            <div className="card-header">
              <h3 className="card-title">
                Forecast Evolution for {(() => {
                  try { return format(parseISO(targetDate), 'dd MMM yyyy'); }
                  catch { return targetDate; }
                })()}
              </h3>
              <p className="card-subtitle">
                <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Each line shows a forecast published at a different time. The green line is actual generation.
                Forecasts closer to delivery time are typically more accurate.
              </p>
            </div>
            <div className="chart-container chart-container--large">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                      label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={50}
                      iconType="plainline"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    {/* Actual line */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Generation"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                    />
                    {/* Forecast lines */}
                    {forecastSeries.map((series) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        name={`FC ${series.publishLabel}`}
                        stroke={series.color}
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        dot={false}
                        opacity={0.8}
                        activeDot={{ r: 3, stroke: series.color, strokeWidth: 2, fill: '#fff' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <Info size={32} className="empty-state-icon" />
                  <p>No forecast evolution data available for this date.</p>
                  <p className="empty-state-hint">Try selecting a different date within January 2026.</p>
                </div>
              )}
            </div>
          </div>

          {/* Series accuracy table */}
          {insights && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Forecast Accuracy by Publish Time</h3>
                <p className="card-subtitle">Ranked from most to least accurate</p>
              </div>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="data-table-th">Rank</th>
                      <th className="data-table-th">Publish Time</th>
                      <th className="data-table-th">MAE (MW)</th>
                      <th className="data-table-th">Data Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.allSeries.map((s, idx) => (
                      <tr key={s.key} className={idx % 2 === 0 ? 'data-table-row--even' : 'data-table-row--odd'}>
                        <td className="data-table-td">{idx + 1}</td>
                        <td className="data-table-td">
                          <span className="series-color-dot" style={{ backgroundColor: s.color }} />
                          {s.publishLabel}
                        </td>
                        <td className="data-table-td">{s.mae.toFixed(1)}</td>
                        <td className="data-table-td">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForecastEvolution;
