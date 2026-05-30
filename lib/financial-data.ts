import type { QuoteResult, FinancialRatios, NewsItem, PricePoint, PriceRange, DividendEvent } from './types';

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

interface YFCalendarEarnings {
  earningsDate?: YFRawValue[];
  earningsAverage?: YFRawValue;
}

interface YFCalendarEvents {
  earnings?: YFCalendarEarnings;
  exDividendDate?: YFRawValue;
  dividendDate?: YFRawValue;
}

interface YFSummaryResult {
  summaryDetail?: Record<string, YFRawValue>;
  defaultKeyStatistics?: Record<string, YFRawValue>;
  financialData?: Record<string, YFRawValue | string | undefined>;
  price?: Record<string, YFRawValue | string | undefined>;
  assetProfile?: Record<string, string | undefined>;
  calendarEvents?: YFCalendarEvents;
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

// Yahoo's /v10 quoteSummary endpoint requires a session cookie + crumb token.
// We cache both in-memory per server process and refresh on auth failure.
let authCache: { cookie: string; crumb: string; ts: number } | null = null;
const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

async function getYahooAuth(force = false): Promise<{ cookie: string; crumb: string } | null> {
  if (!force && authCache && Date.now() - authCache.ts < AUTH_TTL_MS) {
    return { cookie: authCache.cookie, crumb: authCache.crumb };
  }
  try {
    const cookieRes = await fetch('https://fc.yahoo.com/', {
      headers: { 'User-Agent': YF_HEADERS['User-Agent'] },
      redirect: 'manual',
      cache: 'no-store',
    });
    const setCookies = cookieRes.headers.getSetCookie?.() ?? [cookieRes.headers.get('set-cookie') ?? ''];
    const a3 = setCookies.map(c => c.match(/A3=[^;]+/)?.[0]).find(Boolean);
    if (!a3) return null;

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': YF_HEADERS['User-Agent'], Cookie: a3 },
      cache: 'no-store',
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.length > 50) return null;

    authCache = { cookie: a3, crumb, ts: Date.now() };
    return { cookie: a3, crumb };
  } catch {
    return null;
  }
}

async function fetchQuoteSummary(ticker: string, modules: string): Promise<YFSummaryResponse | null> {
  const url = (crumb: string) =>
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const auth = await getYahooAuth(attempt === 1);
    if (!auth) return null;

    const res = await fetch(url(auth.crumb), {
      headers: { ...YF_HEADERS, Cookie: auth.cookie },
      next: { revalidate: 3600 },
    });

    if (res.status === 401 || res.status === 403) {
      authCache = null;
      continue;
    }
    if (!res.ok) return null;
    return (await res.json()) as YFSummaryResponse;
  }
  return null;
}

export async function getAssetProfile(ticker: string): Promise<{ sector?: string; industry?: string } | null> {
  try {
    const data = await fetchQuoteSummary(ticker, 'assetProfile');
    const ap = data?.quoteSummary?.result?.[0]?.assetProfile ?? {};
    return { sector: ap['sector'], industry: ap['industry'] };
  } catch {
    return null;
  }
}

export async function getRatios(ticker: string): Promise<FinancialRatios | null> {
  try {
    const modules = 'summaryDetail,defaultKeyStatistics,financialData,price,assetProfile,calendarEvents';
    const data = await fetchQuoteSummary(ticker, modules);
    if (!data) return null;

    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const sd = result.summaryDetail        ?? {};
    const ks = result.defaultKeyStatistics ?? {};
    const fd = result.financialData        ?? {};
    const pr = result.price                ?? {};
    const ap = result.assetProfile         ?? {};
    const ce = result.calendarEvents       ?? {};

    function raw(obj: Record<string, YFRawValue | string | undefined>, key: string): number | undefined {
      const v = obj[key];
      return typeof v === 'object' && v !== null ? v.raw : undefined;
    }

    function str(obj: Record<string, YFRawValue | string | undefined>, key: string): string | undefined {
      const v = obj[key];
      return typeof v === 'string' ? v : undefined;
    }

    // Yahoo returns Unix seconds; turn into ISO string. earningsDate is an
    // array (can be a single date or a [start, end] estimated range — take the
    // earliest future date, or fall back to the first entry).
    function tsToIso(ts: number | undefined): string | undefined {
      if (!ts || ts <= 0) return undefined;
      return new Date(ts * 1000).toISOString();
    }

    const earningsDates = (ce.earnings?.earningsDate ?? [])
      .map(d => d?.raw)
      .filter((n): n is number => typeof n === 'number' && n > 0)
      .sort((a, b) => a - b);
    const now = Date.now() / 1000;
    const nextEarningsTs =
      earningsDates.find(d => d >= now) ?? earningsDates[0];

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
      marketCap:           raw(pr, 'marketCap'),
      fiftyTwoWeekHigh:    raw(sd, 'fiftyTwoWeekHigh'),
      fiftyTwoWeekLow:     raw(sd, 'fiftyTwoWeekLow'),
      fiftyDayAvg:         raw(sd, 'fiftyDayAverage'),
      twoHundredDayAvg:    raw(sd, 'twoHundredDayAverage'),
      revenueGrowth:       raw(fd, 'revenueGrowth'),
      earningsGrowth:      raw(fd, 'earningsGrowth'),
      profitMargin:        raw(fd, 'profitMargins'),
      currentPrice:        raw(pr, 'regularMarketPrice'),
      dayChange:           raw(pr, 'regularMarketChange'),
      dayChangePct:        raw(pr, 'regularMarketChangePercent'),
      volume:              raw(pr, 'regularMarketVolume'),
      avgVolume:           raw(pr, 'averageDailyVolume3Month'),
      currency:            str(pr, 'currency'),
      exchange:            str(pr, 'exchangeName'),
      sector:              ap['sector'],
      industry:            ap['industry'],
      nextEarningsDate:    tsToIso(nextEarningsTs),
      earningsEstimate:    ce.earnings?.earningsAverage?.raw,
      targetMeanPrice:     raw(fd, 'targetMeanPrice'),
      targetHighPrice:     raw(fd, 'targetHighPrice'),
      targetLowPrice:      raw(fd, 'targetLowPrice'),
      numberOfAnalystOpinions: raw(fd, 'numberOfAnalystOpinions'),
      recommendationKey:   str(fd, 'recommendationKey'),
      recommendationMean:  raw(fd, 'recommendationMean'),
      roe:                 raw(fd, 'returnOnEquity'),
      debtToEquity:        raw(fd, 'debtToEquity'),
      enterpriseToEbitda:  raw(ks, 'enterpriseToEbitda'),
    };
  } catch {
    return null;
  }
}

interface YFNewsThumbnail {
  resolutions?: Array<{ url?: string; width?: number; height?: number; tag?: string }>;
}

interface YFNewsItem {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  type?: string;
  thumbnail?: YFNewsThumbnail;
  relatedTickers?: string[];
}

interface YFSearchResponse {
  news?: YFNewsItem[];
}

export async function getNews(ticker: string, count = 6): Promise<NewsItem[]> {
  try {
    // We over-fetch (count * 4) so we can filter out unrelated stories and still
    // have enough left to show `count` items.
    const fetchCount = Math.max(count * 4, 20);
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=${fetchCount}&quotesCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: YF_HEADERS,
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as YFSearchResponse;
    const items = data.news ?? [];

    // Yahoo's search returns mixed results — only keep stories that Yahoo
    // explicitly tagged with this ticker (or its exchange-stripped base).
    const upper = ticker.toUpperCase();
    const base = upper.split('.')[0];
    const isRelated = (it: YFNewsItem) => {
      const related = (it.relatedTickers ?? []).map(t => t.toUpperCase());
      return related.includes(upper) || related.includes(base);
    };

    return items
      .filter(it => it.title && it.link && it.providerPublishTime && it.type === 'STORY')
      .filter(isRelated)
      .slice(0, count)
      .map((it, idx) => {
        const resolutions = it.thumbnail?.resolutions ?? [];
        const thumb =
          resolutions.find(r => r.tag === '140x140')?.url ??
          resolutions[0]?.url;
        return {
          id: it.uuid ?? `${ticker}-${idx}`,
          title: it.title!,
          publisher: it.publisher,
          link: it.link!,
          publishedAt: new Date((it.providerPublishTime ?? 0) * 1000).toISOString(),
          thumbnail: thumb,
        };
      });
  } catch {
    return [];
  }
}

interface YFChartIndicators {
  quote?: Array<{ close?: (number | null)[] }>;
}

interface YFChartEvents {
  dividends?: Record<string, { amount?: number; date?: number }>;
}

interface YFChartResult {
  meta?: YFMeta;
  timestamp?: number[];
  indicators?: YFChartIndicators;
  events?: YFChartEvents;
}

interface YFChartFullResponse {
  chart?: { result?: YFChartResult[] };
}

const RANGE_INTERVAL: Record<PriceRange, string> = {
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y':  '1d',
  '5y':  '1wk',
  'max': '1mo',
};

export async function getPriceHistory(ticker: string, range: PriceRange = '1y'): Promise<PricePoint[]> {
  try {
    const interval = RANGE_INTERVAL[range];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: YF_HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as YFChartFullResponse;
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const close = closes[i];
      if (typeof close !== 'number' || !Number.isFinite(close)) continue;
      points.push({
        date: new Date(ts * 1000).toISOString(),
        close,
      });
    }
    return points;
  } catch {
    return [];
  }
}

export async function getDividendHistory(ticker: string, range: PriceRange = '5y'): Promise<DividendEvent[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}&events=div`;
    const res = await fetch(url, {
      headers: YF_HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as YFChartFullResponse;
    const dividends = data.chart?.result?.[0]?.events?.dividends ?? {};
    return Object.values(dividends)
      .filter(d => typeof d.amount === 'number' && typeof d.date === 'number')
      .map(d => ({
        date: new Date(d.date! * 1000).toISOString(),
        amount: d.amount!,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
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
