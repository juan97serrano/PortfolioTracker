'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PricePoint, PriceRange } from '@/lib/types';

interface Props {
  ticker: string;
  avgCost: number;
  currency: string;
}

const RANGES: { value: PriceRange; label: string }[] = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y',  label: '1A' },
  { value: '5y',  label: '5A' },
  { value: 'max', label: 'Máx' },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string } }>;
  currency: string;
}

function CustomTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs">
      <div className="text-gray-500">{formatDate(p.payload.date)}</div>
      <div className="font-semibold text-gray-900 tabular-nums">
        {formatCurrency(p.value, currency)}
      </div>
    </div>
  );
}

export function PriceHistoryChart({ ticker, avgCost, currency }: Props) {
  const [range, setRange] = useState<PriceRange>('1y');
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/history/${encodeURIComponent(ticker)}?range=${range}`)
      .then(r => r.json())
      .then((res: { history: PricePoint[] }) => {
        if (!cancelled) setData(res.history ?? []);
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker, range]);

  const chartData = useMemo(
    () => data.map(p => ({ date: p.date, close: p.close })),
    [data],
  );

  const { min, max, color, changePct } = useMemo(() => {
    if (chartData.length === 0) {
      return { min: 0, max: 0, color: '#3b82f6', changePct: 0 };
    }
    let lo = Infinity, hi = -Infinity;
    for (const p of chartData) {
      if (p.close < lo) lo = p.close;
      if (p.close > hi) hi = p.close;
    }
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    const pct = first > 0 ? ((last / first) - 1) * 100 : 0;
    return {
      min: lo,
      max: hi,
      color: pct >= 0 ? '#10b981' : '#ef4444',
      changePct: pct,
    };
  }, [chartData]);

  const padding = (max - min) * 0.05;
  const yDomain: [number, number] = [
    Math.min(min - padding, avgCost > 0 ? avgCost * 0.98 : min),
    Math.max(max + padding, avgCost > 0 ? avgCost * 1.02 : max),
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Histórico de precio</h2>
          {chartData.length > 0 && (
            <p
              className={`text-xs mt-0.5 tabular-nums ${
                changePct >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}% en el periodo
            </p>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r.value
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Cargando histórico…
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No hay datos históricos disponibles.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => {
                  const dt = new Date(d);
                  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(dt);
                }}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={yDomain}
                tickFormatter={(v: number) => v.toFixed(0)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="none"
                fill={`url(#gradient-${ticker})`}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {avgCost > 0 && (
                <ReferenceLine
                  y={avgCost}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  label={{
                    value: `Tu coste: ${formatCurrency(avgCost, currency)}`,
                    position: 'insideTopRight',
                    fill: '#6366f1',
                    fontSize: 11,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
