'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Search } from 'lucide-react';
import { formatCurrency, formatShares, formatPct, ASSET_TYPE_COLORS } from '@/lib/utils';
import { ReturnBadge } from './ReturnBadge';
import type { Position } from '@/lib/types';

type SortKey = 'name' | 'weight' | 'currentValueEur' | 'returnPct' | 'returnAbsEur' | 'dayChangePct';
type SortDir = 'asc' | 'desc';

interface Props {
  positions: Position[];
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
  return dir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-blue-500" />
    : <ArrowDown className="h-3.5 w-3.5 text-blue-500" />;
}

function TypeBadge({ type }: { type: string }) {
  const color = ASSET_TYPE_COLORS[type] ?? '#6b7280';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium"
      style={{ backgroundColor: color }}
    >
      {type}
    </span>
  );
}

export function PositionTable({ positions }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('currentValueEur');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const assetTypes = useMemo(
    () => Array.from(new Set(positions.map(p => p.assetType))).sort(),
    [positions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return positions.filter(p => {
      if (typeFilter !== 'all' && p.assetType !== typeFilter) return false;
      if (!q) return true;
      return (
        p.ticker.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    });
  }, [positions, query, typeFilter]);

  const sorted = [...filtered].sort((a, b) => {
    let av: number | string = a[sortKey] as number | string;
    let bv: number | string = b[sortKey] as number | string;
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function Th({ label, sortable, sk }: { label: string; sortable?: SortKey; sk?: SortKey }) {
    const isActive = sortKey === (sortable ?? sk);
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap
          ${sortable ? 'cursor-pointer select-none hover:text-gray-800' : ''}`}
        onClick={sortable ? () => toggleSort(sortable) : undefined}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortable && <SortIcon active={isActive} dir={sortDir} />}
        </span>
      </th>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Posiciones ({sorted.length}{sorted.length !== positions.length && `/${positions.length}`})
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar ticker o nombre…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-56"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          >
            <option value="all">Todos</option>
            {assetTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th label="Activo" sortable="name" />
              <Th label="Tipo" />
              <Th label="Acciones" />
              <Th label="Precio medio" />
              <Th label="Precio actual" />
              <Th label="Valor (EUR)" sortable="currentValueEur" />
              <Th label="Peso" sortable="weight" />
              <Th label="Rent. EUR" sortable="returnAbsEur" />
              <Th label="Rent. %" sortable="returnPct" />
              <Th label="Hoy" sortable="dayChangePct" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((pos) => (
              <tr key={pos.ticker} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-gray-900">{pos.ticker}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[140px]">{pos.name}</div>
                </td>
                <td className="px-4 py-3.5">
                  <TypeBadge type={pos.assetType} />
                </td>
                <td className="px-4 py-3.5 tabular-nums text-gray-700">
                  {formatShares(pos.shares)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-gray-700">
                  {formatCurrency(pos.avgCost, pos.currency)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-gray-900 font-medium">
                  {formatCurrency(pos.currentPrice, pos.currency)}
                </td>
                <td className="px-4 py-3.5 tabular-nums font-semibold text-gray-900">
                  {formatCurrency(pos.currentValueEur)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-gray-600">
                  {formatPct(pos.weight, false)}
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  <span className={pos.returnAbsEur >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {formatCurrency(pos.returnAbsEur)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <ReturnBadge value={pos.returnPct} size="sm" />
                </td>
                <td className="px-4 py-3.5">
                  <ReturnBadge value={pos.dayChangePct} size="sm" showIcon={false} />
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    href={`/position/${encodeURIComponent(pos.ticker)}`}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
