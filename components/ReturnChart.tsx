'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { formatPct, formatCurrency } from '@/lib/utils';
import type { Position } from '@/lib/types';

interface Props {
  positions: Position[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { returnAbsEur: number; pct: number } }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const isPos = d.value >= 0;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      <p className={isPos ? 'text-emerald-600' : 'text-red-500'}>
        {formatPct(d.value)}
      </p>
      <p className="text-gray-500 text-xs">{formatCurrency(d.payload.returnAbsEur)} EUR</p>
    </div>
  );
}

export function ReturnChart({ positions }: Props) {
  const data = [...positions]
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((p) => ({
      name: p.ticker,
      pct: parseFloat(p.returnPct.toFixed(2)),
      returnAbsEur: p.returnAbsEur,
    }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Rentabilidad por posición (%)</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={28}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pct >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
