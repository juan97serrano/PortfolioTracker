'use client';

import { Fragment, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { formatCurrency, formatPct, formatDate } from '@/lib/utils';
import { ReturnBadge } from './ReturnBadge';
import type { YearlyPerformance as YearlyPerf, ClosedLot } from '@/lib/types';

interface Props {
  yearly: YearlyPerf[];
  totalRealizedEur: number;
  avgAnnualReturnPct: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { year: number; realizedEur: number; operations: number };
  }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const isPos = d.value >= 0;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.payload.year}</p>
      <p className={isPos ? 'text-emerald-600' : 'text-red-500'}>
        {formatPct(d.value)}
      </p>
      <p className="text-gray-500 text-xs">
        {formatCurrency(d.payload.realizedEur)} realizado
      </p>
      <p className="text-gray-400 text-xs">
        {d.payload.operations} op. cerradas
      </p>
    </div>
  );
}

function ExpandedLots({ lots }: { lots: ClosedLot[] }) {
  return (
    <div className="bg-gray-50 px-4 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left py-1 font-medium">Activo</th>
            <th className="text-left py-1 font-medium">Compra</th>
            <th className="text-left py-1 font-medium">Venta</th>
            <th className="text-right py-1 font-medium">Cantidad</th>
            <th className="text-right py-1 font-medium">Coste</th>
            <th className="text-right py-1 font-medium">Cobrado</th>
            <th className="text-right py-1 font-medium">Rentab.</th>
            <th className="text-right py-1 font-medium">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lots.map((lot, i) => (
            <tr key={`${lot.ticker}-${lot.buyDate}-${lot.sellDate}-${i}`} className="text-gray-700">
              <td className="py-1.5 font-semibold text-gray-900">{lot.ticker}</td>
              <td className="py-1.5 text-gray-500">{formatDate(lot.buyDate)}</td>
              <td className="py-1.5 text-gray-500">{formatDate(lot.sellDate)}</td>
              <td className="py-1.5 text-right tabular-nums">{lot.quantity}</td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(lot.costEur)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(lot.proceedsEur)}</td>
              <td className={`py-1.5 text-right tabular-nums font-medium ${lot.realizedEur >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(lot.realizedEur)}
              </td>
              <td className="py-1.5 text-right">
                <ReturnBadge value={lot.returnPct} size="sm" showIcon={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YearlyPerformance({ yearly, totalRealizedEur, avgAnnualReturnPct }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (yearly.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Rendimiento anual</h2>
        </div>
        <p className="text-sm text-gray-500">
          Aún no hay ventas registradas en tu cartera. Cuando vendas posiciones, aquí verás el rendimiento realizado por año.
        </p>
      </div>
    );
  }

  const chartData = yearly.map(y => ({
    year: y.year,
    pct: parseFloat(y.returnPct.toFixed(2)),
    realizedEur: y.realizedEur,
    operations: y.operations,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Rendimiento anual (posiciones cerradas)
          </h2>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400">Total realizado</div>
            <div className={`text-sm font-semibold ${totalRealizedEur >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(totalRealizedEur)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400">Media anual</div>
            <ReturnBadge value={avgAnnualReturnPct} size="sm" />
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={36}>
            <XAxis
              dataKey="year"
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
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.pct >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Año</th>
              <th className="px-4 py-3 text-right">Operaciones</th>
              <th className="px-4 py-3 text-right">Invertido</th>
              <th className="px-4 py-3 text-right">Cobrado</th>
              <th className="px-4 py-3 text-right">Beneficio</th>
              <th className="px-4 py-3 text-right">Rentabilidad</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...yearly].reverse().map((y) => {
              const isOpen = expanded === y.year;
              return (
                <Fragment key={y.year}>
                  <tr
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : y.year)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{y.year}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {y.operations}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {formatCurrency(y.investedEur)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {formatCurrency(y.proceedsEur)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${y.realizedEur >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(y.realizedEur)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ReturnBadge value={y.returnPct} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {isOpen ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <ExpandedLots lots={y.lots} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
