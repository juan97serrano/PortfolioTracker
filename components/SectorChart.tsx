'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS, formatCurrency, formatPct } from '@/lib/utils';
import type { Position } from '@/lib/types';

interface Props {
  positions: Position[];
  mode: 'sector' | 'assetType';
  title: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { pct: number; value: number } }>;
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

export function GroupedAllocationChart({ positions, mode, title }: Props) {
  const data = useMemo(() => {
    const groups = new Map<string, number>();
    let total = 0;
    for (const p of positions) {
      const key =
        mode === 'sector'
          ? (p.sector ?? 'Sin clasificar')
          : p.assetType;
      groups.set(key, (groups.get(key) ?? 0) + p.currentValueEur);
      total += p.currentValueEur;
    }
    return Array.from(groups.entries())
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions, mode]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
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
