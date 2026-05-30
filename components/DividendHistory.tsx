import { formatCurrency, formatDate } from '@/lib/utils';
import type { DividendEvent } from '@/lib/types';

interface Props {
  dividends: DividendEvent[];
  shares: number;
  currency: string;
}

export function DividendHistory({ dividends, shares, currency }: Props) {
  if (dividends.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Sin dividendos registrados en los últimos 5 años.
      </p>
    );
  }

  const byYear = new Map<number, DividendEvent[]>();
  for (const d of dividends) {
    const year = new Date(d.date).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(d);
  }

  const years = Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);
  const totalPerShare = dividends.reduce((s, d) => s + d.amount, 0);
  const totalEstimated = totalPerShare * shares;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-500">Total estimado cobrado</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums">
            {formatCurrency(totalEstimated, currency)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            ≈ {shares.toFixed(2)} acciones × {formatCurrency(totalPerShare, currency)}/acc
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-500">Total por acción</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums">
            {formatCurrency(totalPerShare, currency)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {dividends.length} pagos · últimos 5 años
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {years.map(([year, divs]) => {
          const yearTotal = divs.reduce((s, d) => s + d.amount, 0);
          return (
            <div key={year}>
              <div className="flex items-baseline justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{year}</h4>
                <div className="text-xs text-gray-400 tabular-nums">
                  {formatCurrency(yearTotal, currency)}/acc
                  {' · '}
                  {formatCurrency(yearTotal * shares, currency)} total
                </div>
              </div>
              <div className="space-y-1">
                {divs.map((d, i) => (
                  <div key={`${d.date}-${i}`} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-gray-50">
                    <span className="text-gray-600">{formatDate(d.date)}</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {formatCurrency(d.amount, currency)}/acc
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
