import { fetchPortfolio } from './data';
import { getIntraday, getExchangeRates, convertToEur, getNews, getRatios } from './financial-data';
import type {
  IntradayQuote,
  LiveFeed,
  LiveNewsItem,
  LiveEarnings,
  LivePortfolio,
  LivePosition,
  LiveQuote,
  LiveSnapshot,
  MarketGroupId,
  MarketSession,
  CentralBankMeeting,
} from './types';

interface InstrumentDef {
  symbol: string;
  label: string;
  decimals?: number;
  kind?: LiveQuote['kind'];
}

export const MARKET_GROUPS: Record<MarketGroupId, InstrumentDef[]> = {
  indices: [
    { symbol: '^GSPC',     label: 'S&P 500' },
    { symbol: '^IXIC',     label: 'Nasdaq' },
    { symbol: '^DJI',      label: 'Dow Jones' },
    { symbol: '^RUT',      label: 'Russell 2000' },
    { symbol: '^STOXX50E', label: 'Euro Stoxx 50' },
    { symbol: '^IBEX',     label: 'IBEX 35' },
    { symbol: '^GDAXI',    label: 'DAX' },
    { symbol: '^FCHI',     label: 'CAC 40' },
    { symbol: '^FTSE',     label: 'FTSE 100' },
    { symbol: '^N225',     label: 'Nikkei 225' },
    { symbol: '^HSI',      label: 'Hang Seng' },
    { symbol: '000001.SS', label: 'Shanghai' },
  ],
  // Ordered by maturity — the yield-curve chart relies on this order.
  rates: [
    { symbol: '^IRX', label: 'EE. UU. 3M',  kind: 'yield', decimals: 3 },
    { symbol: '^FVX', label: 'EE. UU. 5A',  kind: 'yield', decimals: 3 },
    { symbol: '^TNX', label: 'EE. UU. 10A', kind: 'yield', decimals: 3 },
    { symbol: '^TYX', label: 'EE. UU. 30A', kind: 'yield', decimals: 3 },
    { symbol: '^VIX', label: 'VIX' },
    { symbol: 'DX-Y.NYB', label: 'Dólar (DXY)' },
  ],
  fx: [
    { symbol: 'EURUSD=X', label: 'EUR/USD', decimals: 4 },
    { symbol: 'EURGBP=X', label: 'EUR/GBP', decimals: 4 },
    { symbol: 'EURCHF=X', label: 'EUR/CHF', decimals: 4 },
    { symbol: 'EURJPY=X', label: 'EUR/JPY' },
  ],
  commodities: [
    { symbol: 'GC=F', label: 'Oro' },
    { symbol: 'SI=F', label: 'Plata' },
    { symbol: 'BZ=F', label: 'Brent' },
    { symbol: 'CL=F', label: 'WTI' },
    { symbol: 'NG=F', label: 'Gas natural', decimals: 3 },
    { symbol: 'HG=F', label: 'Cobre', decimals: 3 },
  ],
  crypto: [
    { symbol: 'BTC-USD', label: 'Bitcoin', decimals: 0 },
    { symbol: 'ETH-USD', label: 'Ethereum' },
  ],
};

// Each session is read from a representative index's trading period.
const SESSIONS: { id: string; label: string; timeZone: string; symbol: string }[] = [
  { id: 'ny',  label: 'Nueva York', timeZone: 'America/New_York', symbol: '^GSPC' },
  { id: 'lon', label: 'Londres',    timeZone: 'Europe/London',    symbol: '^FTSE' },
  { id: 'mad', label: 'Madrid',     timeZone: 'Europe/Madrid',    symbol: '^IBEX' },
  { id: 'tky', label: 'Tokio',      timeZone: 'Asia/Tokyo',       symbol: '^N225' },
  { id: 'hk',  label: 'Hong Kong',  timeZone: 'Asia/Hong_Kong',   symbol: '^HSI' },
];

// Scheduled monetary-policy decision days. No free API publishes these, so
// they are maintained by hand — update once a year from federalreserve.gov
// and ecb.europa.eu.
const CENTRAL_BANK_MEETINGS: CentralBankMeeting[] = [
  ...['2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09']
    .map(date => ({ bank: 'Fed', date })),
  ...['2026-02-05', '2026-03-19', '2026-04-30', '2026-06-11', '2026-07-23', '2026-09-10', '2026-10-29', '2026-12-17']
    .map(date => ({ bank: 'BCE', date })),
];

async function buildMarkets(): Promise<Record<MarketGroupId, LiveQuote[]>> {
  const groups = Object.entries(MARKET_GROUPS) as [MarketGroupId, InstrumentDef[]][];
  const resolved = await Promise.all(
    groups.map(async ([id, defs]) => {
      const quotes = await Promise.all(
        defs.map(async (def): Promise<LiveQuote | null> => {
          const q = await getIntraday(def.symbol);
          if (!q) return null;
          return { ...q, label: def.label, decimals: def.decimals ?? 2, kind: def.kind ?? 'price' };
        }),
      );
      return [id, quotes.filter((q): q is LiveQuote => q !== null)] as const;
    }),
  );
  return Object.fromEntries(resolved) as Record<MarketGroupId, LiveQuote[]>;
}

function buildSessions(markets: Record<MarketGroupId, LiveQuote[]>): MarketSession[] {
  const bySymbol = new Map(markets.indices.map(q => [q.symbol, q]));
  return SESSIONS.map(s => {
    const q = bySymbol.get(s.symbol);
    return {
      id: s.id,
      label: s.label,
      timeZone: s.timeZone,
      isOpen: q?.isOpen ?? false,
      sessionStart: q?.sessionStart,
      sessionEnd: q?.sessionEnd,
    };
  });
}

const BUCKET_S = 300;

// Day P&L over time: for every 5-minute bucket, sum each position's
// (last price at or before t − previous close) × shares. Positions whose
// market has not traded yet in the window contribute their last known move,
// so the curve always ends at the headline day P&L.
function buildPnlCurve(
  legs: { quote: IntradayQuote | null; shares: number; fallbackPnlEur: number }[],
  rates: Record<string, number>,
): { t: number; v: number }[] {
  const series = legs.filter(l => l.quote && l.quote.points.length > 0);
  if (series.length === 0) return [];

  const latest = Math.max(...series.map(l => l.quote!.points[l.quote!.points.length - 1].t));
  const windowStart = latest - 20 * 3600;

  const bucketSet = new Set<number>();
  for (const l of series) {
    for (const pt of l.quote!.points) {
      if (pt.t >= windowStart) bucketSet.add(Math.floor(pt.t / BUCKET_S) * BUCKET_S);
    }
  }
  const buckets = [...bucketSet].sort((a, b) => a - b);

  const constant = legs
    .filter(l => !l.quote || l.quote.points.length === 0)
    .reduce((acc, l) => acc + l.fallbackPnlEur, 0);

  const totals = buckets.map(() => constant);
  for (const l of series) {
    const q = l.quote!;
    let i = 0;
    let price = q.prevClose;
    buckets.forEach((b, idx) => {
      while (i < q.points.length && Math.floor(q.points[i].t / BUCKET_S) * BUCKET_S <= b) {
        price = q.points[i].p;
        i++;
      }
      totals[idx] += convertToEur((price - q.prevClose) * l.shares, q.currency, rates);
    });
  }

  // Pin the last point to the live price so curve and headline agree exactly.
  const final = constant + series.reduce(
    (acc, l) => acc + convertToEur((l.quote!.price - l.quote!.prevClose) * l.shares, l.quote!.currency, rates),
    0,
  );
  totals[totals.length - 1] = final;

  return buckets.map((t, idx) => ({ t, v: totals[idx] }));
}

async function buildPortfolio(): Promise<LivePortfolio> {
  const [summary, rates] = await Promise.all([fetchPortfolio(), getExchangeRates()]);

  const legs = await Promise.all(
    summary.positions.map(async (p) => {
      const isCash = p.assetType === 'Liquidez';
      const quote = isCash ? null : await getIntraday(p.ticker);
      const costBasisEur = p.currentValueEur - p.returnAbsEur;

      let valueEur = p.currentValueEur;
      let dayPnlEur = isCash ? 0 : valueEur - valueEur / (1 + p.dayChangePct / 100);
      if (quote) {
        valueEur = convertToEur(quote.price * p.shares, quote.currency, rates);
        dayPnlEur = convertToEur(quote.change * p.shares, quote.currency, rates);
      }
      return { position: p, quote, costBasisEur, valueEur, dayPnlEur, isCash };
    }),
  );

  const valueEur = legs.reduce((a, l) => a + l.valueEur, 0);
  const investedEur = legs.reduce((a, l) => a + l.costBasisEur, 0);
  const dayPnlEur = legs.reduce((a, l) => a + l.dayPnlEur, 0);
  const cashEur = legs.filter(l => l.isCash).reduce((a, l) => a + l.valueEur, 0);
  const unrealizedEur = valueEur - investedEur;
  const prevValue = valueEur - dayPnlEur;

  const positions: LivePosition[] = legs
    .map(l => ({
      ticker: l.position.ticker,
      name: l.position.name,
      assetType: l.position.assetType,
      valueEur: l.valueEur,
      weight: valueEur > 0 ? (l.valueEur / valueEur) * 100 : 0,
      dayPnlEur: l.dayPnlEur,
      dayChangePct: l.quote ? l.quote.changePct : l.isCash ? 0 : l.position.dayChangePct,
      returnPct: l.costBasisEur > 0 ? ((l.valueEur - l.costBasisEur) / l.costBasisEur) * 100 : 0,
      isOpen: l.quote?.isOpen ?? false,
    }))
    .sort((a, b) => b.valueEur - a.valueEur);

  return {
    valueEur,
    investedEur,
    unrealizedEur,
    unrealizedPct: investedEur > 0 ? (unrealizedEur / investedEur) * 100 : 0,
    dayPnlEur,
    dayPnlPct: prevValue > 0 ? (dayPnlEur / prevValue) * 100 : 0,
    cashEur,
    positions,
    pnlCurve: buildPnlCurve(
      legs
        .filter(l => !l.isCash)
        .map(l => ({ quote: l.quote, shares: l.position.shares, fallbackPnlEur: l.dayPnlEur })),
      rates,
    ),
  };
}

export async function buildLiveSnapshot(): Promise<LiveSnapshot> {
  const [markets, portfolioResult] = await Promise.all([
    buildMarkets(),
    buildPortfolio().then(
      p => ({ ok: true as const, p }),
      (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : 'Error desconocido' }),
    ),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    portfolio: portfolioResult.ok ? portfolioResult.p : null,
    portfolioError: portfolioResult.ok ? undefined : portfolioResult.error,
    markets,
    sessions: buildSessions(markets),
  };
}

const NEWS_POSITIONS = 6;
const EARNINGS_HORIZON_DAYS = 45;

export async function buildLiveFeed(): Promise<LiveFeed> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const centralBanks = CENTRAL_BANK_MEETINGS
    .filter(m => new Date(m.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  let positions: { ticker: string; name: string; assetType: string; currentValueEur: number }[] = [];
  try {
    positions = (await fetchPortfolio()).positions.filter(p => p.assetType !== 'Liquidez');
  } catch {
    return { generatedAt: new Date().toISOString(), news: [], earnings: [], centralBanks };
  }

  const top = [...positions].sort((a, b) => b.currentValueEur - a.currentValueEur).slice(0, NEWS_POSITIONS);
  const stocks = positions.filter(p => p.assetType === 'Acción' || p.assetType === 'REIT');

  const [newsLists, ratios] = await Promise.all([
    Promise.all(top.map(p => getNews(p.ticker, 4).then(items => items.map(n => ({ ...n, ticker: p.ticker }))))),
    Promise.all(stocks.map(p => getRatios(p.ticker).then(r => ({ p, r })))),
  ]);

  const seen = new Set<string>();
  const news: LiveNewsItem[] = newsLists
    .flat()
    .filter(n => {
      if (seen.has(n.id) || seen.has(n.title)) return false;
      seen.add(n.id);
      seen.add(n.title);
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 14);

  const horizon = today.getTime() + EARNINGS_HORIZON_DAYS * 86_400_000;
  const earnings: LiveEarnings[] = ratios
    .filter(({ r }) => r?.nextEarningsDate)
    .map(({ p, r }) => ({
      ticker: p.ticker,
      name: r?.name ?? p.name,
      date: r!.nextEarningsDate!,
      epsEstimate: r?.earningsEstimate,
    }))
    .filter(e => {
      const t = new Date(e.date).getTime();
      return t >= today.getTime() && t <= horizon;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { generatedAt: new Date().toISOString(), news, earnings, centralBanks };
}
