import React, { useId } from 'react';
import { Droplets, Thermometer } from 'lucide-react';

const getGaugePercent = (value, min, max) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const range = max - min || 100;
  return Math.max(0, Math.min(100, Math.round(((numericValue - min) / range) * 100)));
};

const formatReading = (value, unit) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 'N/A';
  return `${Math.round(numericValue)} ${unit}`;
};

const EnvironmentGaugeCard = ({ tag, metric, onMetricChange }) => {
  const temperature = tag?.temperature;
  const humidity = tag?.humidity;
  const showingHumidity = metric === 'humidity';
  const value = showingHumidity ? humidity : temperature;
  const unit = showingHumidity ? '%' : 'C';
  const label = showingHumidity ? 'Humidity' : 'Temperature';
  const min = 0;
  const max = showingHumidity ? 100 : 50;
  const percent = getGaugePercent(value, min, max);
  const Icon = showingHumidity ? Droplets : Thermometer;
  const color = showingHumidity ? '#2f6fed' : '#ff5a3d';
  const room = tag?.location_name || tag?.position_ref || 'Room';
  const deviceId = tag?.device_id || 'No tag selected';

  return (
    <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-500">{room}</div>
          <div className="mt-1 truncate font-mono text-sm font-semibold text-slate-900">{deviceId}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5">
        <button
          type="button"
          onClick={() => onMetricChange('temperature')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            metric === 'temperature'
              ? 'bg-[#006CDD] text-white shadow-md'
              : 'bg-slate-50 text-slate-600 hover:bg-blue-50'
          }`}
        >
          Temperature
        </button>
        <button
          type="button"
          onClick={() => onMetricChange('humidity')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            metric === 'humidity'
              ? 'bg-[#006CDD] text-white shadow-md'
              : 'bg-slate-50 text-slate-600 hover:bg-blue-50'
          }`}
        >
          Humidity
        </button>
      </div>

      <div className="pt-7 text-center">
        <Icon className="mx-auto h-8 w-8" style={{ color }} />
        <div className="mt-2 text-sm font-semibold text-slate-700">Current {label}</div>
      </div>

      <div className="flex justify-center px-5 py-5">
        <LiquidGauge percent={percent} value={value} unit={unit} color={color} label={label} />
      </div>

      <div className="mx-5 mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Temp</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{formatReading(temperature, 'C')}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Humidity</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{formatReading(humidity, '%')}</div>
        </div>
      </div>
    </div>
  );
};

const LiquidGauge = ({ percent, value, unit, color, label }) => {
  const id = useId().replace(/:/g, '');
  const size = 210;
  const radius = size / 2;
  const level = size - (percent / 100) * size;
  const hasValue = Number.isFinite(Number(value));
  const displayValue = hasValue ? Math.round(Number(value)) : 'N/A';
  const textColor = percent > 42 ? '#fff' : '#1f2937';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${displayValue} ${unit} ${label}`}>
      <defs>
        <clipPath id={`gauge-clip-${id}`}>
          <circle cx={radius} cy={radius} r={radius} />
        </clipPath>
        <linearGradient id={`gauge-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.86" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>

      <circle cx={radius} cy={radius} r={radius} fill="#f1f5f9" />
      <g clipPath={`url(#gauge-clip-${id})`}>
        <g style={{ transform: `translateY(${level}px)`, transition: 'transform 0.8s ease' }}>
          <path fill={`url(#gauge-fill-${id})`} opacity="0.95">
            <animate
              attributeName="d"
              dur="4s"
              repeatCount="indefinite"
              values={`
                M -120 12 Q -60 0 0 12 T 120 12 T 240 12 T 360 12 V ${size} H -120 Z;
                M -120 12 Q -60 24 0 12 T 120 12 T 240 12 T 360 12 V ${size} H -120 Z;
                M -120 12 Q -60 0 0 12 T 120 12 T 240 12 T 360 12 V ${size} H -120 Z
              `}
            />
          </path>
        </g>
      </g>

      <text
        x={radius}
        y={radius + 13}
        textAnchor="middle"
        fontSize={hasValue ? 46 : 34}
        fontWeight="800"
        fill={textColor}
        fontFamily="'Segoe UI', system-ui, sans-serif"
      >
        {displayValue}
        {hasValue ? (
          <tspan fontSize="20" dy="-14">
            {unit}
          </tspan>
        ) : null}
      </text>
    </svg>
  );
};

export default EnvironmentGaugeCard;
