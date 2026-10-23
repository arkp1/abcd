import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({ title, value, unit, description, colorType = 'blue', trend }) => {
  const colorMap = {
    blue: { accent: 'var(--color-blue)', bg: 'var(--color-blue-bg)' },
    green: { accent: 'var(--color-green)', bg: 'var(--color-green-bg)' },
    amber: { accent: 'var(--color-amber)', bg: 'var(--color-amber-bg)' },
    red: { accent: 'var(--color-red)', bg: 'var(--color-red-bg)' },
  };

  const colors = colorMap[colorType] || colorMap.blue;

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp size={16} />;
    if (trend === 'down') return <TrendingDown size={16} />;
    return <Minus size={16} />;
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return typeof val === 'number' ? val.toFixed(1) : val;
  };

  return (
    <div className="metric-card" style={{ borderTopColor: colors.accent }}>
      <div className="metric-card-header">
        <span className="metric-card-title">{title}</span>
        {trend && (
          <span className={`metric-card-trend metric-card-trend--${trend}`}>
            {getTrendIcon()}
          </span>
        )}
      </div>
      <div className="metric-card-value" style={{ color: colors.accent }}>
        {formatValue(value)}
        {unit && <span className="metric-card-unit">{unit}</span>}
      </div>
      {description && (
        <p className="metric-card-description">{description}</p>
      )}
    </div>
  );
};

export default MetricCard;
