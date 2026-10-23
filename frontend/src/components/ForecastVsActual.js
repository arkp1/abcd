import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { fetchForecastVsActual } from '../api';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { Calendar } from 'lucide-react';

const ForecastVsActual = ({ dateFrom, dateTo }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // 'full' or week index
  const [weeks, setWeeks] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchForecastVsActual(dateFrom, dateTo);
      setData(result);

      // Calculate available weeks
      if (result?.data?.length) {
        const dates = result.data
          .map((d) => d.startTime || d.start_time || d.timestamp)
          .filter(Boolean)
          .map((d) => (typeof d === 'string' ? parseISO(d) : new Date(d)));
        if (dates.length) {
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          const weekList = [];
          let weekStart = startOfWeek(minDate, { weekStartsOn: 1 });
          while (weekStart <= maxDate) {
            weekList.push({
              start: weekStart,
              end: endOfWeek(weekStart, { weekStartsOn: 1 }),
              label: `${format(weekStart, 'dd MMM')} – ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd MMM')}`,
            });
            weekStart = addWeeks(weekStart, 1);
          }
          setWeeks(weekList);
        }
      }
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
    if (!data?.data) return [];
    let items = data.data.map((item) => {
      const actual = item.actual != null ? Number(item.actual) : null;
      const forecast = item.forecast != null ? Number(item.forecast) : null;
      const err = actual != null && forecast != null ? forecast - actual : null;
      const pctErr = actual != null && actual !== 0 && err != null ? (err / actual) * 100 : null;
      return {
        ...item,
        time: item.startTime || item.start_time || item.timestamp,
        actual,
        forecast,
        error: err,
        absError: err != null ? Math.abs(err) : null,
        percentError: pctErr,
      };
    });

    // Filter by week if needed
    if (viewMode !== 'full' && weeks[viewMode]) {
      const week = weeks[viewMode];
      items = items.filter((item) => {
        try {
          const date = typeof item.time === 'string' ? parseISO(item.time) : new Date(item.time);
          return isWithinInterval(date, { start: week.start, end: week.end });
        } catch {
          return false;
        }
      });
    }

    return items;
  }, [data, viewMode, weeks]);

  const tableColumns = [
    {
      key: 'time',
      label: 'Time',
      format: (v) => {
        try {
          const d = typeof v === 'string' ? parseISO(v) : new Date(v);
          return format(d, 'dd MMM HH:mm');
        } catch {
          return String(v).slice(0, 16);
        }
      },
    },
    { key: 'actual', label: 'Actual (MW)', format: (v) => v != null ? `${Number(v).toFixed(1)}` : '—' },
    { key: 'forecast', label: 'Forecast (MW)', format: (v) => v != null ? `${Number(v).toFixed(1)}` : '—' },
    {
      key: 'error',
      label: 'Error (MW)',
      format: (v) => v != null ? `${Number(v).toFixed(1)}` : '—',
      className: 'data-table-td--error',
    },
    {
      key: 'percentError',
      label: 'Error (%)',
      format: (v) => v != null ? `${Number(v).toFixed(1)}%` : '—',
    },
  ];

  const formatXAxis = (value) => {
    if (!value) return '';
    try {
      const date = typeof value === 'string' ? parseISO(value) : new Date(value);
      return viewMode === 'full' ? format(date, 'dd MMM') : format(date, 'dd MMM HH:mm');
    } catch {
      return String(value).slice(0, 10);
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

  if (loading) return <LoadingSpinner message="Loading forecast comparison data..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="forecast-vs-actual">
      {/* View Toggle */}
      <div className="view-toggle">
        <Calendar size={16} />
        <button
          className={`view-toggle-btn ${viewMode === 'full' ? 'view-toggle-btn--active' : ''}`}
          onClick={() => setViewMode('full')}
        >
          Full Month
        </button>
        {weeks.map((week, idx) => (
          <button
            key={idx}
            className={`view-toggle-btn ${viewMode === idx ? 'view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode(idx)}
          >
            {week.label}
          </button>
        ))}
      </div>

      {/* Time Series Chart */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Forecast vs Actual Generation</h3>
          <p className="card-subtitle">Solid green = actual generation, dashed blue = forecast</p>
        </div>
        <div className="chart-container chart-container--large">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="errorBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="plainline" />
              <Area
                type="monotone"
                dataKey="absError"
                name="Error Band"
                fill="url(#errorBand)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#0891b2"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, stroke: '#0891b2', strokeWidth: 2, fill: '#fff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Over Time Chart */}
      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Forecast Error Over Time</h3>
          <p className="card-subtitle">Positive = over-forecast, Negative = under-forecast</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                label={{ value: 'Error (MW)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
              <Bar
                dataKey="error"
                name="Forecast Error"
                fill="#ef4444"
                opacity={0.7}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Detailed Records</h3>
          <p className="card-subtitle">{chartData.length} settlement periods</p>
        </div>
        <DataTable columns={tableColumns} data={chartData} />
      </div>
    </div>
  );
};

export default ForecastVsActual;
