import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { formatPct } from '@/lib/utils';
import type { Position } from '@/lib/types';

interface Props {
  positions: Position[];
  threshold?: number;
}

export function ConcentrationAlert({ positions, threshold = 20 }: Props) {
  const concentrated = positions
    .filter(p => p.weight >= threshold)
    .sort((a, b) => b.weight - a.weight);

  if (concentrated.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-amber-900">
          Concentración elevada
        </h3>
        <p className="text-xs text-amber-700 mt-0.5">
          {concentrated.length === 1
            ? `Esta posición supera el ${threshold}% de tu cartera:`
            : `Estas posiciones superan el ${threshold}% de tu cartera:`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {concentrated.map(p => (
            <Link
              key={p.ticker}
              href={`/position/${encodeURIComponent(p.ticker)}`}
              className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-2.5 py-1 text-xs hover:border-amber-400 transition-colors"
            >
              <span className="font-semibold text-gray-900">{p.ticker}</span>
              <span className="text-amber-700 tabular-nums">{formatPct(p.weight, false)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
