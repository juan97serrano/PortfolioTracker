'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS, formatCurrency, formatPct } from '@/lib/utils';
import type { Position } from '@/lib/types';

interface Props {
  positions: Position[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { currency: string; pct: number; value: number } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{d.name}</p>
      <p className="text-gray-600">{formatCurrency(d.payload.value)}</p>
      <p className="text-gray-500">{formatPct(d.payload.pct, false)} del total</p>
    </div>
  );
}

export function AllocationChart({ positions }: Props) {
  const data = positions
    .sort((a, b) => b.currentValueEur - a.currentValueEur)
    .slice(0, 10)
    .map((p) => ({
      name: p.ticker,
      fullName: p.name,
      value: p.currentValueEur,
      pct: p.weight,
    }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribución</h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
