import type { Transaction, PriceRange } from './types';
import { getPriceHistory, getExchangeRates, convertToEur } from './financial-data';

export interface PortfolioHistoryPoint {
  date: string; // ISO
  valueEur: number;
  investedEur: number;
}

const RANGE_DAYS: Record<PriceRange, number> = {
  '1mo': 31,
  '3mo': 93,
  '6mo': 186,
  '1y':  366,
  '5y':  366 * 5,
  'max': Number.POSITIVE_INFINITY,
};

interface Holding {
  shares: number;
  invested: number; // cost basis in native currency
  currency: string;
}

/**
 * Reconstructs the portfolio's total EUR value over time by walking each
 * ticker's holdings day-by-day and multiplying by its historical close price.
 * Uses current exchange rates for all dates — a simplification to avoid
 * needing historical FX series, and consistent with how the rest of the app
 * already reports EUR figures.
 */
export async function computePortfolioHistory(
  transactions: Transaction[],
  range: PriceRange = '1y',
): Promise<PortfolioHistoryPoint[]> {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const firstTxDate = new Date(sorted[0].date);
  const today = new Date();

  const rangeDays = RANGE_DAYS[range];
  const startCandidate = new Date(today.getTime() - rangeDays * 86_400_000);
  const startDate = startCandidate > firstTxDate ? startCandidate : firstTxDate;

  const tickers = Array.from(new Set(sorted.map(t => t.ticker)));

  // Fetch price history for every unique ticker in parallel.
  const yahooRange: PriceRange =
    range === '1mo' || range === '3mo' || range === '6mo' || range === '1y'
      ? '1y'
      : range === '5y'
        ? '5y'
        : 'max';

  const [priceMap, rates] = await Promise.all([
    Promise.all(tickers.map(t => getPriceHistory(t, yahooRange).then(h => [t, h] as const))),
    getExchangeRates(),
  ]);
  const prices = new Map(priceMap);

  // Build holdings timeline keyed by date (ISO yyyy-mm-dd).
  const holdingChanges = new Map<string, Transaction[]>();
  for (const tx of sorted) {
    const day = tx.date.slice(0, 10);
    if (!holdingChanges.has(day)) holdingChanges.set(day, []);
    holdingChanges.get(day)!.push(tx);
  }

  // Walk weekly snapshots from start to today, updating holdings incrementally.
  const holdings = new Map<string, Holding>();
  // Apply all transactions that happened BEFORE startDate to seed initial holdings.
  const startKey = startDate.toISOString().slice(0, 10);
  for (const tx of sorted) {
    if (tx.date.slice(0, 10) >= startKey) break;
    applyTx(holdings, tx);
  }

  const points: PortfolioHistoryPoint[] = [];
  const stepDays = range === '1mo' ? 1 : range === '3mo' ? 2 : range === '6mo' ? 3 : range === '1y' ? 7 : range === '5y' ? 14 : 30;

  for (let t = startDate.getTime(); t <= today.getTime(); t += stepDays * 86_400_000) {
    const dayIso = new Date(t).toISOString().slice(0, 10);

    // Apply any transactions that fell within (previousDay, dayIso].
    for (const [day, txs] of holdingChanges) {
      if (day > dayIso) continue;
      if (day < startKey) continue;
      // Mark applied by removing from map (mutating in-loop is fine because
      // we're iterating a snapshot of the Map's entries).
      for (const tx of txs) applyTx(holdings, tx);
      holdingChanges.delete(day);
    }

    let valueEur = 0;
    let investedEur = 0;
    for (const [ticker, h] of holdings) {
      if (h.shares <= 0) continue;
      const history = prices.get(ticker) ?? [];
      const close = priceAt(history, dayIso);
      if (close == null) continue;
      const native = close * h.shares;
      valueEur += convertToEur(native, h.currency, rates);
      investedEur += convertToEur(h.invested, h.currency, rates);
    }

    points.push({ date: new Date(t).toISOString(), valueEur, investedEur });
  }

  return points;
}

function applyTx(holdings: Map<string, Holding>, tx: Transaction) {
  if (!holdings.has(tx.ticker)) {
    holdings.set(tx.ticker, { shares: 0, invested: 0, currency: tx.currency });
  }
  const h = holdings.get(tx.ticker)!;
  if (tx.operation === 'Compra') {
    h.shares += tx.quantity;
    h.invested += tx.quantity * tx.price + tx.commission;
  } else if (h.shares > 0) {
    const pctRemaining = (h.shares - tx.quantity) / h.shares;
    h.invested = h.invested * Math.max(0, pctRemaining);
    h.shares -= tx.quantity;
  }
}

function priceAt(history: { date: string; close: number }[], dayIso: string): number | null {
  if (history.length === 0) return null;
  // Binary search would be cleaner but the series is small and the linear
  // walk is fine for ~260 points × ~50 tickers × ~50 snapshots.
  let last: number | null = null;
  for (const p of history) {
    if (p.date.slice(0, 10) > dayIso) break;
    last = p.close;
  }
  return last;
}
