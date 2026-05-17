import type { QuoteResult, FinancialRatios } from './types';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};

interface YFMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

interface YFChartResponse {
  chart?: { result?: Array<{ meta?: YFMeta }> };
}

interface YFRawValue {
  raw?: number;
}

interface YFSummaryResult {
  summaryDetail?: Record<string, YFRawValue>;
  defaultKeyStatistics?: Record<string, YFRawValue>;
  financialData?: Record<string, YFRawValue>;
  price?: Record<string, YFRawValue | string | undefined>;
  assetProfile?: Record<string, string | undefined>;
}

interface YFSummaryResponse {
  quoteSummary?: { result?: YFSummaryResult[] };
}

export async function getQuote(ticker: string): Promise<QuoteResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: YF_HEADERS,
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YFChartResponse;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    return {
      price: meta.regularMarketPrice ?? meta.previousClose ?? 0,
      dayChangePct: meta.regularMarketChangePercent ?? 0,
      currency: meta.currency ?? 'USD',
    };
  } catch {
    return null;
  }
}

export async function getRatios(ticker: string): Promise<FinancialRatios | null> {
  try {
    const modules = 'summaryDetail,defaultKeyStatistics,financialData,price,assetProfile';
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;

    const res = await fetch(url, {
      headers: YF_HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YFSummaryResponse;
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const sd = result.summaryDetail        ?? {};
    const ks = result.defaultKeyStatistics ?? {};
    const fd = result.financialData        ?? {};
    const pr = result.price                ?? {};
    const ap = result.assetProfile         ?? {};

    function raw(obj: Record<string, YFRawValue>, key: string): number | undefined {
      return obj[key]?.raw;
    }

    function str(obj: Record<string, YFRawValue | string | undefined>, key: string): string | undefined {
      const v = obj[key];
      return typeof v === 'string' ? v : undefined;
    }

    return {
      ticker,
      name:                str(pr, 'longName') ?? str(pr, 'shortName'),
      pe:                  raw(sd, 'trailingPE'),
      forwardPE:           raw(sd, 'forwardPE'),
      peg:                 raw(ks, 'pegRatio'),
      priceToBook:         raw(ks, 'priceToBook'),
      priceToSales:        raw(ks, 'priceToSalesTrailing12Months'),
      dividendYield:       raw(sd, 'dividendYield'),
      eps:                 raw(ks, 'trailingEps'),
      forwardEps:          raw(ks, 'forwardEps'),
      beta:                raw(sd, 'beta'),
      marketCap:           raw(pr as Record<string, YFRawValue>, 'marketCap'),
      fiftyTwoWeekHigh:    raw(sd, 'fiftyTwoWeekHigh'),
      fiftyTwoWeekLow:     raw(sd, 'fiftyTwoWeekLow'),
      fiftyDayAvg:         raw(sd, 'fiftyDayAverage'),
      twoHundredDayAvg:    raw(sd, 'twoHundredDayAverage'),
      revenueGrowth:       raw(fd, 'revenueGrowth'),
      earningsGrowth:      raw(fd, 'earningsGrowth'),
      profitMargin:        raw(fd, 'profitMargins'),
      currentPrice:        raw(pr as Record<string, YFRawValue>, 'regularMarketPrice'),
      dayChange:           raw(pr as Record<string, YFRawValue>, 'regularMarketChange'),
      dayChangePct:        raw(pr as Record<string, YFRawValue>, 'regularMarketChangePercent'),
      volume:              raw(pr as Record<string, YFRawValue>, 'regularMarketVolume'),
      avgVolume:           raw(pr as Record<string, YFRawValue>, 'averageDailyVolume3Month'),
      currency:            str(pr, 'currency'),
      exchange:            str(pr, 'exchangeName'),
      sector:              ap['sector'],
      industry:            ap['industry'],
    };
  } catch {
    return null;
  }
}

// Exchange rates relative to EUR
let ratesCache: { rates: Record<string, number>; ts: number } | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (ratesCache && now - ratesCache.ts < 3_600_000) return ratesCache.rates;

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rates = data.rates ?? {};
    ratesCache = { rates, ts: now };
    return rates;
  } catch {
    return {};
  }
}

export function convertToEur(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'EUR') return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount / rate;
}
