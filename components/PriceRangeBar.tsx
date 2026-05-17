'use client';

import { formatCurrency } from '@/lib/utils';

interface Props {
  low: number;
  high: number;
  current: number;
  currency?: string;
}

export function PriceRangeBar({ low, high, current, currency = 'USD' }: Props) {
  const range = high - low;
  const pct = range > 0 ? ((current - low) / range) * 100 : 50;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Mín 52s: {formatCurrency(low, currency)}</span>
        <span>Máx 52s: {formatCurrency(high, currency)}</span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full">
        <div
          className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
          style={{ width: `${clamped}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow"
          style={{ left: `calc(${clamped}% - 6px)` }}
        />
      </div>
      <div className="text-center mt-1.5 text-xs text-gray-500">
        Actual: <span className="font-medium text-gray-800">{formatCurrency(current, currency)}</span>
        {' · '}
        <span className="text-gray-400">{clamped.toFixed(0)}% del rango anual</span>
      </div>
    </div>
  );
}
