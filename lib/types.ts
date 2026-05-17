export type AssetType = 'Acción' | 'ETF' | 'Cripto' | 'Bono' | 'REIT' | 'Otro';
export type OperationType = 'Compra' | 'Venta';

export interface Transaction {
  date: string; // ISO date string
  ticker: string;
  name: string;
  assetType: AssetType;
  operation: OperationType;
  quantity: number;
  price: number;
  commission: number;
  currency: string;
}

export interface Position {
  ticker: string;
  name: string;
  assetType: AssetType;
  shares: number;
  avgCost: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  currentValueEur: number;
  returnAbs: number;
  returnAbsEur: number;
  returnPct: number;
  currency: string;
  weight: number;
  dayChangePct: number;
  transactions: Transaction[];
}

export interface PortfolioSummary {
  totalValueEur: number;
  totalInvestedEur: number;
  totalReturnEur: number;
  totalReturnPct: number;
  positions: Position[];
  lastUpdated: string;
  bestPosition: Position | null;
  worstPosition: Position | null;
}

export interface FinancialRatios {
  ticker: string;
  name?: string;
  pe?: number;
  forwardPE?: number;
  peg?: number;
  priceToBook?: number;
  priceToSales?: number;
  dividendYield?: number;
  eps?: number;
  forwardEps?: number;
  beta?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAvg?: number;
  twoHundredDayAvg?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  profitMargin?: number;
  currentPrice?: number;
  dayChange?: number;
  dayChangePct?: number;
  volume?: number;
  avgVolume?: number;
  currency?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
}

export interface QuoteResult {
  price: number;
  dayChangePct: number;
  currency: string;
}
