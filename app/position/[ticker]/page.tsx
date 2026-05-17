import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPortfolio } from '@/lib/data';
import { getRatios } from '@/lib/financial-data';
import { formatCurrency, formatShares, formatDateTime, ASSET_TYPE_COLORS } from '@/lib/utils';
import { ReturnBadge } from '@/components/ReturnBadge';
import { PriceRangeBar } from '@/components/PriceRangeBar';
import { RatioGrid } from '@/components/RatioGrid';
import { TransactionHistory } from '@/components/TransactionHistory';
import { ArrowLeft } from 'lucide-react';
import type { Position } from '@/lib/types';

export const revalidate = 0;

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-gray-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

async function PositionContent({ ticker }: { ticker: string }) {
  const [summary, ratios] = await Promise.all([
    fetchPortfolio(),
    getRatios(ticker),
  ]);

  const position: Position | undefined = summary.positions.find(
    p => p.ticker === ticker
  );

  if (!position) notFound();

  const badgeColor = ASSET_TYPE_COLORS[position.assetType] ?? '#6b7280';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{position.ticker}</h1>
              <span
                className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                style={{ backgroundColor: badgeColor }}
              >
                {position.assetType}
              </span>
            </div>
            <p className="text-gray-500">{position.name}</p>
            {ratios?.sector && (
              <p className="text-xs text-gray-400 mt-0.5">
                {ratios.sector}{ratios.industry ? ` · ${ratios.industry}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 tabular-nums">
            {formatCurrency(position.currentPrice, position.currency)}
          </div>
          <ReturnBadge value={position.dayChangePct} size="md" />
          <div className="text-xs text-gray-400 mt-0.5">{position.currency}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Acciones"
          value={formatShares(position.shares)}
        />
        <MetricCard
          label="Precio medio"
          value={formatCurrency(position.avgCost, position.currency)}
          sub={`Base: ${formatCurrency(position.costBasis, position.currency)}`}
        />
        <MetricCard
          label="Valor actual"
          value={formatCurrency(position.currentValueEur)}
          sub="en EUR"
        />
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Rentabilidad</div>
          <div className={`text-xl font-bold tabular-nums ${position.returnAbsEur >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(position.returnAbsEur)}
          </div>
          <ReturnBadge value={position.returnPct} size="sm" />
        </div>
        <MetricCard
          label="Peso en cartera"
          value={`${position.weight.toFixed(1)}%`}
        />
      </div>

      {/* 52-week range */}
      {ratios?.fiftyTwoWeekLow != null && ratios?.fiftyTwoWeekHigh != null && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Rango 52 semanas</h2>
          <PriceRangeBar
            low={ratios.fiftyTwoWeekLow}
            high={ratios.fiftyTwoWeekHigh}
            current={position.currentPrice}
            currency={position.currency}
          />
        </div>
      )}

      {/* Financial ratios */}
      {ratios && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Ratios financieros</h2>
          <RatioGrid ratios={ratios} />
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Historial de operaciones ({position.transactions.length})
        </h2>
        <TransactionHistory transactions={position.transactions} />
      </div>

      <p className="text-xs text-gray-400 text-right">
        Actualizado: {formatDateTime(summary.lastUpdated)}
      </p>
    </div>
  );
}

export default async function PositionPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker).toUpperCase();

  return (
    <>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la cartera
        </Link>
      </div>
      <PositionContent ticker={ticker} />
    </>
  );
}
