import type { Transaction, Position, PortfolioSummary, AssetType } from './types';

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

export function buildPortfolioSummary(positions: Position[]): PortfolioSummary {
  const totalValueEur = positions.reduce((s, p) => s + p.currentValueEur, 0);
  const totalInvestedEur = positions.reduce((s, p) => s + p.costBasis, 0);
  const totalReturnEur = totalValueEur - totalInvestedEur;
  const totalReturnPct = totalInvestedEur > 0 ? (totalReturnEur / totalInvestedEur) * 100 : 0;

  const withWeights = positions.map(p => ({
    ...p,
    weight: totalValueEur > 0 ? (p.currentValueEur / totalValueEur) * 100 : 0,
  }));

  const sorted = [...withWeights].sort((a, b) => b.returnPct - a.returnPct);

  return {
    totalValueEur,
    totalInvestedEur,
    totalReturnEur,
    totalReturnPct,
    positions: withWeights,
    lastUpdated: new Date().toISOString(),
    bestPosition: sorted.length > 0 ? sorted[0] : null,
    worstPosition: sorted.length > 0 ? sorted[sorted.length - 1] : null,
  };
}
