'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PriceRange } from '@/lib/types';
import type { PortfolioHistoryPoint } from '@/lib/portfolio-history';

const RANGES: { value: PriceRange; label: string }[] = [
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y',  label: '1A' },
  { value: '5y',  label: '5A' },
  { value: 'max', label: 'Máx' },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value: number; color: string; payload: { date: string; valueEur: number; investedEur: number } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const diff = p.payload.valueEur - p.payload.investedEur;
  const diffPct = p.payload.investedEur > 0 ? (diff / p.payload.investedEur) * 100 : 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs space-y-0.5">
      <div className="text-gray-500">{formatDate(p.payload.date)}</div>
      <div className="font-semibold text-gray-900 tabular-nums">
        Valor: {formatCurrency(p.payload.valueEur)}
      </div>
      <div className="text-gray-500 tabular-nums">
        Invertido: {formatCurrency(p.payload.investedEur)}
      </div>
      <div className={`tabular-nums font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
      </div>
    </div>
  );
}

export function PortfolioHistoryChart() {
  const [range, setRange] = useState<PriceRange>('1y');
  const [data, setData] = useState<PortfolioHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/portfolio/history?range=${range}`)
      .then(r => r.json())
      .then((res: { history: PortfolioHistoryPoint[] }) => {
        if (!cancelled) setData(res.history ?? []);
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const summary = useMemo(() => {
    if (data.length === 0) return null;
    const first = data[0];
    const last = data[data.length - 1];
    const startValue = first.valueEur || first.investedEur;
    const change = last.valueEur - startValue;
    const changePct = startValue > 0 ? (change / startValue) * 100 : 0;
    return { startValue, endValue: last.valueEur, change, changePct };
  }, [data]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Evolución de la cartera</h2>
          {summary && (
            <p
              className={`text-xs mt-0.5 tabular-nums ${
                summary.change >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {summary.change >= 0 ? '+' : ''}{formatCurrency(summary.change)}
              {' '}({summary.changePct >= 0 ? '+' : ''}{summary.changePct.toFixed(2)}%) en el periodo
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

      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Calculando histórico…
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No hay datos suficientes para mostrar el histórico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolio-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(new Date(d))}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="valueEur"
                stroke="none"
                fill="url(#portfolio-grad)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="investedEur"
                stroke="#9ca3af"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                name="Invertido"
              />
              <Line
                type="monotone"
                dataKey="valueEur"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Valor"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
