'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Legend,
} from 'recharts';
import { formatCurrency, formatDate, formatPct } from '@/lib/utils';
import type { Position, PriceRange, PricePoint } from '@/lib/types';

interface Props {
  positions: Position[];
  initialA?: string;
  initialB?: string;
}

const RANGES: { value: PriceRange; label: string }[] = [
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y',  label: '1A' },
  { value: '5y',  label: '5A' },
];

interface NormalizedPoint {
  date: string;
  a?: number;
  b?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs space-y-0.5">
      <div className="text-gray-500">{formatDate(label)}</div>
      {payload.map(p => (
        <div key={p.name} className="font-semibold tabular-nums" style={{ color: p.color }}>
          {p.name}: {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
        </div>
      ))}
    </div>
  );
}

function MetricRow({ label, a, b, better }: { label: string; a: string; b: string; better?: 'a' | 'b' | null }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 text-xs text-gray-500 uppercase tracking-wide">{label}</td>
      <td className={`py-2.5 text-right tabular-nums ${better === 'a' ? 'font-semibold text-emerald-600' : 'text-gray-900'}`}>
        {a}
      </td>
      <td className={`py-2.5 text-right tabular-nums ${better === 'b' ? 'font-semibold text-emerald-600' : 'text-gray-900'}`}>
        {b}
      </td>
    </tr>
  );
}

export function CompareView({ positions, initialA, initialB }: Props) {
  const sorted = useMemo(
    () => [...positions].sort((p1, p2) => p1.ticker.localeCompare(p2.ticker)),
    [positions],
  );
  const [tickerA, setTickerA] = useState(initialA ?? sorted[0]?.ticker ?? '');
  const [tickerB, setTickerB] = useState(initialB ?? sorted[1]?.ticker ?? '');
  const [range, setRange] = useState<PriceRange>('1y');
  const [historyA, setHistoryA] = useState<PricePoint[]>([]);
  const [historyB, setHistoryB] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);

  const posA = positions.find(p => p.ticker === tickerA);
  const posB = positions.find(p => p.ticker === tickerB);

  useEffect(() => {
    if (!tickerA || !tickerB) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/history/${encodeURIComponent(tickerA)}?range=${range}`).then(r => r.json()),
      fetch(`/api/history/${encodeURIComponent(tickerB)}?range=${range}`).then(r => r.json()),
    ])
      .then(([a, b]: [{ history: PricePoint[] }, { history: PricePoint[] }]) => {
        if (cancelled) return;
        setHistoryA(a.history ?? []);
        setHistoryB(b.history ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tickerA, tickerB, range]);

  const normalized: NormalizedPoint[] = useMemo(() => {
    if (historyA.length === 0 && historyB.length === 0) return [];
    const baseA = historyA[0]?.close ?? 0;
    const baseB = historyB[0]?.close ?? 0;
    const mapA = new Map(historyA.map(p => [p.date.slice(0, 10), p.close]));
    const mapB = new Map(historyB.map(p => [p.date.slice(0, 10), p.close]));
    const allDates = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();
    return allDates.map(date => ({
      date,
      a: mapA.has(date) && baseA > 0 ? ((mapA.get(date)! / baseA) - 1) * 100 : undefined,
      b: mapB.has(date) && baseB > 0 ? ((mapB.get(date)! / baseB) - 1) * 100 : undefined,
    }));
  }, [historyA, historyB]);

  function compareNum(va?: number, vb?: number, higherIsBetter = true): 'a' | 'b' | null {
    if (va == null || vb == null) return null;
    if (va === vb) return null;
    if (higherIsBetter) return va > vb ? 'a' : 'b';
    return va < vb ? 'a' : 'b';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Comparar posiciones</h1>
        <p className="text-sm text-gray-500">Dos activos lado a lado con su rendimiento normalizado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo A</label>
          <select
            value={tickerA}
            onChange={e => setTickerA(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          >
            {sorted.map(p => (
              <option key={p.ticker} value={p.ticker}>{p.ticker} — {p.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo B</label>
          <select
            value={tickerB}
            onChange={e => setTickerB(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          >
            {sorted.map(p => (
              <option key={p.ticker} value={p.ticker}>{p.ticker} — {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Rendimiento comparado (base 100)</h2>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r.value ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-500 hover:bg-gray-50'
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
              Cargando…
            </div>
          ) : normalized.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Sin datos disponibles para el periodo.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalized} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
                <Line type="monotone" dataKey="a" name={tickerA} stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line type="monotone" dataKey="b" name={tickerB} stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {posA && posB && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Comparativa de métricas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide" />
                <th className="py-2 text-right text-sm font-bold text-blue-600">{posA.ticker}</th>
                <th className="py-2 text-right text-sm font-bold text-amber-600">{posB.ticker}</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Nombre" a={posA.name} b={posB.name} />
              <MetricRow label="Tipo" a={posA.assetType} b={posB.assetType} />
              <MetricRow label="Sector" a={posA.sector ?? 'N/D'} b={posB.sector ?? 'N/D'} />
              <MetricRow
                label="Precio actual"
                a={formatCurrency(posA.currentPrice, posA.currency)}
                b={formatCurrency(posB.currentPrice, posB.currency)}
              />
              <MetricRow
                label="Variación día"
                a={formatPct(posA.dayChangePct)}
                b={formatPct(posB.dayChangePct)}
                better={compareNum(posA.dayChangePct, posB.dayChangePct, true)}
              />
              <MetricRow
                label="Tu rentabilidad %"
                a={formatPct(posA.returnPct)}
                b={formatPct(posB.returnPct)}
                better={compareNum(posA.returnPct, posB.returnPct, true)}
              />
              <MetricRow
                label="Tu rentabilidad €"
                a={formatCurrency(posA.returnAbsEur)}
                b={formatCurrency(posB.returnAbsEur)}
                better={compareNum(posA.returnAbsEur, posB.returnAbsEur, true)}
              />
              <MetricRow
                label="Valor actual"
                a={formatCurrency(posA.currentValueEur)}
                b={formatCurrency(posB.currentValueEur)}
              />
              <MetricRow
                label="Peso en cartera"
                a={formatPct(posA.weight, false)}
                b={formatPct(posB.weight, false)}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
