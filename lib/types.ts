export type AssetType = 'Acción' | 'ETF' | 'Cripto' | 'Bono' | 'REIT' | 'Liquidez' | 'Otro';
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
  sector?: string;
  industry?: string;
}

export interface ClosedLot {
  ticker: string;
  name: string;
  assetType: AssetType;
  buyDate: string;
  sellDate: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  currency: string;
  costEur: number;
  proceedsEur: number;
  realizedEur: number;
  returnPct: number;
}

export interface YearlyPerformance {
  year: number;
  realizedEur: number;
  investedEur: number;
  proceedsEur: number;
  returnPct: number;
  operations: number;
  lots: ClosedLot[];
}

export interface OpenPerformance {
  totalInvestedEur: number;
  totalValueEur: number;
  totalReturnEur: number;
  totalReturnPct: number;
  positions: number;
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
  yearlyPerformance: YearlyPerformance[];
  open: OpenPerformance;
  totalRealizedEur: number;
  avgAnnualReturnPct: number;
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
  // Earnings & analyst data
  nextEarningsDate?: string; // ISO date string
  earningsEstimate?: number;
  targetMeanPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  numberOfAnalystOpinions?: number;
  recommendationKey?: string;
  recommendationMean?: number;
  // Extra fundamentals
  roe?: number;
  debtToEquity?: number;
  enterpriseToEbitda?: number;
}

export interface QuoteResult {
  price: number;
  dayChangePct: number;
  currency: string;
}

export interface PricePoint {
  date: string; // ISO date string
  close: number;
}

export type PriceRange = '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max';

export interface DividendEvent {
  date: string;
  amount: number;
}

export interface NewsItem {
  id: string;
  title: string;
  publisher?: string;
  link: string;
  publishedAt: string; // ISO date string
  thumbnail?: string;
}

// ── Live dashboard ────────────────────────────────────────────────────────────

export interface IntradayPoint {
  t: number; // unix seconds
  p: number;
}

export interface IntradayQuote {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  currency: string;
  isOpen: boolean;
  sessionStart?: number; // unix seconds, current/last regular session
  sessionEnd?: number;
  points: IntradayPoint[];
}

export type MarketGroupId = 'indices' | 'rates' | 'fx' | 'commodities' | 'crypto';

export interface LiveQuote extends IntradayQuote {
  label: string;
  decimals: number;
  // Yields are shown with change in basis points instead of %.
  kind: 'price' | 'yield';
}

export interface MarketSession {
  id: string;
  label: string;
  timeZone: string;
  isOpen: boolean;
  sessionStart?: number;
  sessionEnd?: number;
}

export interface LivePosition {
  ticker: string;
  name: string;
  assetType: AssetType;
  valueEur: number;
  weight: number;
  dayPnlEur: number;
  dayChangePct: number;
  returnPct: number;
  isOpen: boolean;
}

export interface LivePortfolio {
  valueEur: number;
  investedEur: number;
  unrealizedEur: number;
  unrealizedPct: number;
  dayPnlEur: number;
  dayPnlPct: number;
  cashEur: number;
  positions: LivePosition[];
  pnlCurve: { t: number; v: number }[];
}

export interface LiveSnapshot {
  generatedAt: string;
  portfolio: LivePortfolio | null;
  portfolioError?: string;
  markets: Record<MarketGroupId, LiveQuote[]>;
  sessions: MarketSession[];
}

export interface LiveNewsItem extends NewsItem {
  ticker: string;
}

export interface LiveEarnings {
  ticker: string;
  name: string;
  date: string; // ISO
  epsEstimate?: number;
}

export interface CentralBankMeeting {
  bank: string;
  date: string; // ISO date (decision day)
}

export interface LiveFeed {
  generatedAt: string;
  news: LiveNewsItem[];
  earnings: LiveEarnings[];
  centralBanks: CentralBankMeeting[];
}
