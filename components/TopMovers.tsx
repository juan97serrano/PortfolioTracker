import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPct } from '@/lib/utils';
import type { Position } from '@/lib/types';

interface Props {
  positions: Position[];
}

function MoverRow({ pos }: { pos: Position }) {
  const positive = pos.dayChangePct >= 0;
  return (
    <Link
      href={`/position/${encodeURIComponent(pos.ticker)}`}
      className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-semibold text-sm text-gray-900 truncate">{pos.ticker}</div>
        <div className="text-xs text-gray-400 truncate">{pos.name}</div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <div
          className={`text-sm font-semibold tabular-nums ${
            positive ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {formatPct(pos.dayChangePct)}
        </div>
        <div className="text-xs text-gray-400 tabular-nums">
          {formatCurrency(pos.currentValueEur)}
        </div>
      </div>
    </Link>
  );
}

export function TopMovers({ positions }: Props) {
  const movers = positions.filter(p => Number.isFinite(p.dayChangePct) && p.dayChangePct !== 0);
  if (movers.length === 0) return null;

  const sorted = [...movers].sort((a, b) => b.dayChangePct - a.dayChangePct);
  const winners = sorted.slice(0, 3);
  const losers = sorted.slice(-3).reverse();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Movimientos del día</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Mejores
          </div>
          <div className="divide-y divide-gray-50">
            {winners.map(p => <MoverRow key={p.ticker} pos={p} />)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
            <TrendingDown className="h-3.5 w-3.5" /> Peores
          </div>
          <div className="divide-y divide-gray-50">
            {losers.map(p => <MoverRow key={p.ticker} pos={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
