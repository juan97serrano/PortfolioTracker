import type {
  Transaction,
  Position,
  PortfolioSummary,
  AssetType,
  YearlyPerformance,
  ClosedLot,
  OpenPerformance,
} from './types';
import { convertToEur } from './financial-data';

interface RawPosition {
  ticker: string;
  name: string;
  assetType: AssetType;
  shares: number;
  costBasis: number;
  currency: string;
  transactions: Transaction[];
}

export function aggregatePositions(transactions: Transaction[]): RawPosition[] {
  const map = new Map<string, RawPosition>();

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  for (const tx of sorted) {
    if (!map.has(tx.ticker)) {
      map.set(tx.ticker, {
        ticker: tx.ticker,
        name: tx.name,
        assetType: tx.assetType,
        shares: 0,
        costBasis: 0,
        currency: tx.currency,
        transactions: [],
      });
    }

    const pos = map.get(tx.ticker)!;
    pos.transactions.push(tx);

    if (tx.operation === 'Compra') {
      pos.shares += tx.quantity;
      pos.costBasis += tx.quantity * tx.price + tx.commission;
    } else {
      // FIFO-style: reduce cost basis proportionally when selling
      if (pos.shares > 0) {
        const pctRemaining = (pos.shares - tx.quantity) / pos.shares;
        pos.costBasis = pos.costBasis * pctRemaining;
        pos.shares -= tx.quantity;
      }
    }
  }

  return Array.from(map.values()).filter(p => p.shares > 0.000001);
}

interface Lot {
  date: string;
  shares: number;
  costPerShare: number; // includes prorated commission
  currency: string;
}

/**
 * Walks transactions per ticker chronologically and matches sells against
 * earlier buys using FIFO. Returns the list of closed lots (each row = one
 * matched buy ↔ sell pair). The sell date determines the realization year.
 */
export function computeClosedLots(
  transactions: Transaction[],
  rates: Record<string, number>,
): ClosedLot[] {
  const byTicker = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!byTicker.has(tx.ticker)) byTicker.set(tx.ticker, []);
    byTicker.get(tx.ticker)!.push(tx);
  }

  const closed: ClosedLot[] = [];

  for (const [, txs] of byTicker) {
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const lots: Lot[] = [];

    for (const tx of sorted) {
      if (tx.operation === 'Compra') {
        const costPerShare =
          tx.quantity > 0
            ? tx.price + tx.commission / tx.quantity
            : tx.price;
        lots.push({
          date: tx.date,
          shares: tx.quantity,
          costPerShare,
          currency: tx.currency,
        });
        continue;
      }

      // Venta — match against oldest lots first (FIFO)
      let remaining = tx.quantity;
      const sellCommissionPerShare =
        tx.quantity > 0 ? tx.commission / tx.quantity : 0;

      while (remaining > 0.000001 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(lot.shares, remaining);

        const costNative = take * lot.costPerShare;
        const proceedsNative = take * tx.price - take * sellCommissionPerShare;

        const costEur = convertToEur(costNative, lot.currency, rates);
        const proceedsEur = convertToEur(proceedsNative, tx.currency, rates);
        const realizedEur = proceedsEur - costEur;
        const returnPct = costEur > 0 ? (realizedEur / costEur) * 100 : 0;

        closed.push({
          ticker: tx.ticker,
          name: tx.name,
          assetType: tx.assetType,
          buyDate: lot.date,
          sellDate: tx.date,
          quantity: take,
          buyPrice: lot.costPerShare,
          sellPrice: tx.price,
          currency: tx.currency,
          costEur,
          proceedsEur,
          realizedEur,
          returnPct,
        });

        lot.shares -= take;
        remaining -= take;
        if (lot.shares <= 0.000001) lots.shift();
      }
      // If remaining > 0 it's an oversold (no matching buy) — ignored
    }
  }

  return closed.sort((a, b) => a.sellDate.localeCompare(b.sellDate));
}

export function buildYearlyPerformance(closed: ClosedLot[]): YearlyPerformance[] {
  const byYear = new Map<number, ClosedLot[]>();
  for (const lot of closed) {
    const year = new Date(lot.sellDate).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(lot);
  }

  const years: YearlyPerformance[] = [];
  for (const [year, lots] of byYear) {
    const investedEur = lots.reduce((s, l) => s + l.costEur, 0);
    const proceedsEur = lots.reduce((s, l) => s + l.proceedsEur, 0);
    const realizedEur = proceedsEur - investedEur;
    const returnPct = investedEur > 0 ? (realizedEur / investedEur) * 100 : 0;
    years.push({
      year,
      realizedEur,
      investedEur,
      proceedsEur,
      returnPct,
      operations: lots.length,
      lots,
    });
  }

  return years.sort((a, b) => a.year - b.year);
}

export function buildPortfolioSummary(
  positions: Position[],
  yearlyPerformance: YearlyPerformance[],
): PortfolioSummary {
  const totalValueEur = positions.reduce((s, p) => s + p.currentValueEur, 0);
  const totalInvestedEur = positions.reduce((s, p) => s + p.costBasis, 0);
  const totalReturnEur = totalValueEur - totalInvestedEur;
  const totalReturnPct = totalInvestedEur > 0 ? (totalReturnEur / totalInvestedEur) * 100 : 0;

  const withWeights = positions.map(p => ({
    ...p,
    weight: totalValueEur > 0 ? (p.currentValueEur / totalValueEur) * 100 : 0,
  }));

  const sorted = [...withWeights].sort((a, b) => b.returnPct - a.returnPct);

  const totalRealizedEur = yearlyPerformance.reduce((s, y) => s + y.realizedEur, 0);
  const avgAnnualReturnPct =
    yearlyPerformance.length > 0
      ? yearlyPerformance.reduce((s, y) => s + y.returnPct, 0) / yearlyPerformance.length
      : 0;

  const open: OpenPerformance = {
    totalInvestedEur,
    totalValueEur,
    totalReturnEur,
    totalReturnPct,
    positions: withWeights.length,
  };

  return {
    totalValueEur,
    totalInvestedEur,
    totalReturnEur,
    totalReturnPct,
    positions: withWeights,
    lastUpdated: new Date().toISOString(),
    bestPosition: sorted.length > 0 ? sorted[0] : null,
    worstPosition: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    yearlyPerformance,
    open,
    totalRealizedEur,
    avgAnnualReturnPct,
  };
}
