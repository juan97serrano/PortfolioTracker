'use client';

import { formatLargeNumber } from '@/lib/utils';
import type { FinancialRatios } from '@/lib/types';

interface RatioItem {
  label: string;
  value: string | undefined;
  hint?: string;
}

function RatioCard({ label, value, hint }: RatioItem) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900 tabular-nums">
        {value ?? <span className="text-gray-300 text-sm">N/D</span>}
      </div>
      {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function pct(v?: number): string | undefined {
  return v != null ? `${(v * 100).toFixed(2)}%` : undefined;
}
function num(v?: number, decimals = 2): string | undefined {
  return v != null ? v.toFixed(decimals) : undefined;
}
function money(v?: number): string | undefined {
  return v != null ? formatLargeNumber(v) : undefined;
}

interface Props {
  ratios: FinancialRatios;
}

export function RatioGrid({ ratios }: Props) {
  const valuation: RatioItem[] = [
    { label: 'P/E (TTM)', value: num(ratios.pe), hint: 'Precio / Beneficio' },
    { label: 'P/E Forward', value: num(ratios.forwardPE), hint: 'Precio / Beneficio est.' },
    { label: 'PEG', value: num(ratios.peg), hint: 'P/E ajustado al crecimiento' },
    { label: 'Precio / Libro', value: num(ratios.priceToBook), hint: 'Price to Book' },
    { label: 'Precio / Ventas', value: num(ratios.priceToSales), hint: 'Price to Sales' },
    { label: 'EPS (TTM)', value: num(ratios.eps), hint: 'Beneficio por acción' },
  ];

  const fundamentals: RatioItem[] = [
    { label: 'Capitalización', value: money(ratios.marketCap), hint: 'Market Cap' },
    { label: 'Beta', value: num(ratios.beta), hint: 'Volatilidad vs mercado' },
    { label: 'Dividendo', value: pct(ratios.dividendYield), hint: 'Rentabilidad por dividendo' },
    { label: 'Margen neto', value: pct(ratios.profitMargin), hint: 'Profit Margin' },
    { label: 'Crecimiento ingresos', value: pct(ratios.revenueGrowth), hint: 'YoY Revenue Growth' },
    { label: 'Crecimiento beneficio', value: pct(ratios.earningsGrowth), hint: 'YoY Earnings Growth' },
  ];

  const trading: RatioItem[] = [
    { label: 'Volumen', value: money(ratios.volume), hint: 'Volumen del día' },
    { label: 'Vol. medio 3m', value: money(ratios.avgVolume), hint: 'Volumen medio 3 meses' },
    { label: 'Media 50 días', value: num(ratios.fiftyDayAvg), hint: '50-day SMA' },
    { label: 'Media 200 días', value: num(ratios.twoHundredDayAvg), hint: '200-day SMA' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Valoración</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {valuation.map(r => <RatioCard key={r.label} {...r} />)}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fundamentales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fundamentals.map(r => <RatioCard key={r.label} {...r} />)}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trading</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trading.map(r => <RatioCard key={r.label} {...r} />)}
        </div>
      </div>
    </div>
  );
}
