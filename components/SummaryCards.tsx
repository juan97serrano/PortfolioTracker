'use client';

import { formatCurrency, formatPct } from '@/lib/utils';
import { ReturnBadge } from './ReturnBadge';
import type { PortfolioSummary } from '@/lib/types';
import { Wallet, TrendingUp, PiggyBank, Award } from 'lucide-react';

interface Props {
  summary: PortfolioSummary;
}

export function SummaryCards({ summary }: Props) {
  const cards = [
    {
      label: 'Valor cartera',
      value: formatCurrency(summary.totalValueEur),
      sub: `Invertido: ${formatCurrency(summary.totalInvestedEur)}`,
      icon: Wallet,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Rentab. no realizada',
      value: formatCurrency(summary.totalReturnEur),
      sub: 'Posiciones abiertas',
      badge: summary.totalReturnPct,
      icon: TrendingUp,
      accent: summary.totalReturnEur >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
    },
    {
      label: 'Rentab. realizada',
      value: formatCurrency(summary.totalRealizedEur),
      sub:
        summary.yearlyPerformance.length > 0
          ? `${summary.yearlyPerformance.length} año${summary.yearlyPerformance.length === 1 ? '' : 's'} con ventas`
          : 'Sin ventas registradas',
      badge: summary.avgAnnualReturnPct,
      icon: Award,
      accent: summary.totalRealizedEur >= 0 ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-500',
    },
    {
      label: 'Posiciones abiertas',
      value: String(summary.positions.length),
      sub: `${summary.positions.filter(p => p.returnPct >= 0).length} en positivo`,
      icon: PiggyBank,
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
            <span className={`p-2 rounded-xl ${card.accent}`}>
              <card.icon className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 truncate">{card.value}</div>
          {card.badge !== undefined && (
            <ReturnBadge value={card.badge} className="mt-1" size="sm" />
          )}
          {card.sub && (
            <div className="text-xs text-gray-400 mt-1 truncate">{card.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
