import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { format, parseISO, getHours, getDate } from 'date-fns';
import { fetchForecastAccuracy, fetchForecastVsActual } from '../api';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { Info } from 'lucide-react';

const AccuracyAnalysis = ({ dateFrom, dateTo }) => {
  const [accuracyData, setAccuracyData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accuracy, comparison] = await Promise.all([
        fetchForecastAccuracy(dateFrom, dateTo),
        fetchForecastVsActual(dateFrom, dateTo),
      ]);
      setAccuracyData(accuracy);
      setComparisonData(comparison);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

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

  // Process raw comparison data into per-day and per-hour stats
  const { dailyMetrics, hourlyProfile, errorDistribution, heatmapData } = useMemo(() => {
    if (!comparisonData?.data) return { dailyMetrics: [], hourlyProfile: [], errorDistribution: [], heatmapData: [] };

    const records = comparisonData.data.map((item) => {
      const actual = item.actual != null ? Number(item.actual) : null;
      const forecast = item.forecast != null ? Number(item.forecast) : null;
      const time = item.startTime || item.start_time || item.timestamp;
      const err = actual != null && forecast != null ? forecast - actual : null;
      let date;
      try { date = typeof time === 'string' ? parseISO(time) : new Date(time); } catch { date = null; }
      return { actual, forecast, error: err, absError: err != null ? Math.abs(err) : null, date, time };
    }).filter((r) => r.date && r.error != null);

    // Daily metrics
    const byDay = {};
    records.forEach((r) => {
      const day = format(r.date, 'yyyy-MM-dd');
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(r);
    });
    const dailyMetrics = Object.entries(byDay).map(([day, items]) => {
      const errors = items.map((i) => i.error);
      const absErrors = items.map((i) => i.absError);
      const mae = absErrors.reduce((a, b) => a + b, 0) / absErrors.length;
      const rmse = Math.sqrt(errors.map((e) => e * e).reduce((a, b) => a + b, 0) / errors.length);
      return { day, dayLabel: format(parseISO(day), 'dd MMM'), mae, rmse, count: items.length };
    }).sort((a, b) => a.day.localeCompare(b.day));

    // Hourly profile
    const byHour = {};
    records.forEach((r) => {
      const hour = getHours(r.date);
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(r);
    });
    const hourlyProfile = Array.from({ length: 24 }, (_, hour) => {
      const items = byHour[hour] || [];
      if (!items.length) return { hour, hourLabel: `${String(hour).padStart(2, '0')}:00`, avgError: 0, avgAbsError: 0, count: 0 };
      const avgError = items.reduce((a, i) => a + i.error, 0) / items.length;
      const avgAbsError = items.reduce((a, i) => a + i.absError, 0) / items.length;
      return { hour, hourLabel: `${String(hour).padStart(2, '0')}:00`, avgError, avgAbsError, count: items.length };
    });

    // Error distribution (histogram)
    const allErrors = records.map((r) => r.error);
    const minErr = Math.min(...allErrors);
    const maxErr = Math.max(...allErrors);
    const bucketCount = 25;
    const bucketSize = (maxErr - minErr) / bucketCount || 1;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      rangeStart: minErr + i * bucketSize,
      rangeEnd: minErr + (i + 1) * bucketSize,
      label: `${(minErr + i * bucketSize).toFixed(0)}`,
      count: 0,
    }));
    allErrors.forEach((err) => {
      const idx = Math.min(Math.floor((err - minErr) / bucketSize), bucketCount - 1);
      buckets[idx].count++;
    });

    // Heatmap data: day x hour
    const heatmapData = [];
    records.forEach((r) => {
      const day = getDate(r.date);
      const hour = getHours(r.date);
      heatmapData.push({ day, hour, absError: r.absError, error: r.error });
    });
    // Aggregate by day-hour
    const heatmapAgg = {};
    heatmapData.forEach((h) => {
      const key = `${h.day}-${h.hour}`;
      if (!heatmapAgg[key]) heatmapAgg[key] = { day: h.day, hour: h.hour, errors: [] };
      heatmapAgg[key].errors.push(h.absError);
    });
    const heatmapFinal = Object.values(heatmapAgg).map((h) => ({
      day: h.day,
      hour: h.hour,
      avgAbsError: h.errors.reduce((a, b) => a + b, 0) / h.errors.length,
    }));

    return { dailyMetrics, hourlyProfile, errorDistribution: buckets, heatmapData: heatmapFinal };
  }, [comparisonData]);

  // Heatmap color scale
  const getHeatmapColor = (value, max) => {
    if (!value || !max) return '#f0fdf4';
    const ratio = Math.min(value / max, 1);
    if (ratio < 0.25) return '#d1fae5';
    if (ratio < 0.5) return '#fef08a';
    if (ratio < 0.75) return '#fdba74';
    return '#fca5a5';
  };

  const maxHeatmapError = useMemo(() => {
    if (!heatmapData.length) return 1;
    return Math.max(...heatmapData.map((h) => h.avgAbsError));
  }, [heatmapData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="chart-tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {Number(entry.value).toFixed(1)} MW
          </p>
        ))}
      </div>
    );
  };

  if (loading) return <LoadingSpinner message="Analysing forecast accuracy..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="accuracy-analysis">
      {/* Metrics */}
      <div className="metrics-grid">
        <MetricCard title="MAE" value={metrics?.mae} unit="MW" description="Mean Absolute Error" colorType={metrics?.mae < 500 ? 'green' : metrics?.mae < 1000 ? 'amber' : 'red'} />
        <MetricCard title="RMSE" value={metrics?.rmse} unit="MW" description="Root Mean Square Error" colorType={metrics?.rmse < 600 ? 'green' : metrics?.rmse < 1200 ? 'amber' : 'red'} />
        <MetricCard title="MAPE" value={metrics?.mape} unit="%" description="Mean Abs. Percentage Error" colorType={metrics?.mape < 10 ? 'green' : metrics?.mape < 20 ? 'amber' : 'red'} />
        <MetricCard title="MBE" value={metrics?.mbe} unit="MW" description="Mean Bias Error" colorType="blue" />
      </div>

      {/* Daily MAE/RMSE */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Daily Forecast Accuracy</h3>
          <p className="card-subtitle">MAE and RMSE by day — identifies days with largest forecast misses</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dailyMetrics} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="mae" name="MAE" fill="#0891b2" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="rmse" name="RMSE" fill="#f59e0b" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Profile */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Hourly Error Profile</h3>
          <p className="card-subtitle">
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Average forecast error by hour of day — reveals systematic timing biases
          </p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyProfile} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hourLabel" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Avg Error (MW)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="avgError" name="Avg Bias (MW)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
              <Line type="monotone" dataKey="avgAbsError" name="Avg |Error| (MW)" stroke="#0891b2" strokeWidth={2} dot={{ r: 3, fill: '#0891b2' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Distribution */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Error Distribution</h3>
          <p className="card-subtitle">Histogram of forecast errors — centred near zero indicates low bias</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={errorDistribution} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} label={{ value: 'Error (MW)', position: 'insideBottom', offset: -5, style: { fill: '#6b7280', fontSize: 12 } }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }} />
              <Tooltip formatter={(value) => [value, 'Occurrences']} />
              <Bar dataKey="count" name="Frequency" radius={[3, 3, 0, 0]}>
                {errorDistribution.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.rangeStart >= 0 ? '#0891b2' : '#ef4444'}
                    opacity={0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Error Heatmap: Day × Hour</h3>
          <p className="card-subtitle">
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Colour intensity indicates absolute error magnitude — darker = larger error
          </p>
        </div>
        <div className="heatmap-container">
          <div className="heatmap-legend">
            <span className="heatmap-legend-label">Low Error</span>
            <div className="heatmap-legend-bar">
              <span style={{ backgroundColor: '#d1fae5' }} />
              <span style={{ backgroundColor: '#fef08a' }} />
              <span style={{ backgroundColor: '#fdba74' }} />
              <span style={{ backgroundColor: '#fca5a5' }} />
            </div>
            <span className="heatmap-legend-label">High Error</span>
          </div>
          <div className="heatmap-grid">
            {/* Hour labels */}
            <div className="heatmap-row heatmap-row--header">
              <div className="heatmap-cell heatmap-cell--label" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="heatmap-cell heatmap-cell--header">
                  {h}
                </div>
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: 31 }, (_, d) => d + 1).map((day) => {
              const dayItems = heatmapData.filter((h) => h.day === day);
              if (!dayItems.length) return null;
              return (
                <div key={day} className="heatmap-row">
                  <div className="heatmap-cell heatmap-cell--label">Jan {day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = dayItems.find((i) => i.hour === h);
                    return (
                      <div
                        key={h}
                        className="heatmap-cell"
                        style={{ backgroundColor: cell ? getHeatmapColor(cell.avgAbsError, maxHeatmapError) : '#f9fafb' }}
                        title={cell ? `Jan ${day}, ${String(h).padStart(2, '0')}:00 — Avg |Error|: ${cell.avgAbsError.toFixed(0)} MW` : ''}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccuracyAnalysis;
