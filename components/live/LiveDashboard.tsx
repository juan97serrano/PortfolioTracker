'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Clock,
  Coins,
  Globe2,
  Landmark,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Newspaper,
  RefreshCw,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeFuture, formatRelativeTime } from '@/lib/utils';
import type { LiveFeed, LivePortfolio, LiveSnapshot } from '@/lib/types';
import { HeatLegend, PnlIntradayChart, PositionsHeatmap, YieldCurveChart } from './LiveCharts';
import { IndexTiles, QuoteList, SessionClocks, useNow } from './MarketPanels';
import { Panel, fmtNum, fmtSignedEur, fmtSignedPct, toneClass } from './ui';

const SNAPSHOT_INTERVAL_MS = 60_000;
const FEED_INTERVAL_MS = 15 * 60_000;

// Polls `url` while the tab is visible; keeps the last good payload on error.
function usePolling<T>(url: string, intervalMs: number, initial: T | null) {
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastOk = useRef(initial ? Date.now() : 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login?from=/live';
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as T);
      setError(false);
      lastOk.current = Date.now();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!lastOk.current) load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastOk.current > intervalMs) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, intervalMs]);

  return { data, error, loading, reload: load };
}

// Keeps the screen awake while the dashboard is visible (big-screen use).
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        // not supported or denied — harmless
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  return { isFullscreen, toggle };
}

// Gives charts and scrolling lists a definite box to size against.
function Fill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function HeaderClock() {
  const now = useNow(1000);
  if (!now) return <div className="w-40" />;
  return (
    <div className="text-right leading-tight">
      <div className="text-2xl font-semibold text-slate-100 tabular-nums">
        {new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}
      </div>
      <div className="text-[11px] text-slate-500 first-letter:uppercase">
        {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
      </div>
    </div>
  );
}

function LiveStatus({ generatedAt, error, loading }: { generatedAt?: string; error: boolean; loading: boolean }) {
  useNow(15_000); // re-render so "hace X min" stays current
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
        <WifiOff className="h-3.5 w-3.5" />
        Sin conexión · datos de {generatedAt ? formatRelativeTime(generatedAt) : '—'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className={cn('h-2 w-2 rounded-full bg-emerald-400', loading ? 'animate-ping' : 'animate-pulse')} />
      En vivo · actualizado {generatedAt ? formatRelativeTime(generatedAt) : '—'}
    </span>
  );
}

// ── Portfolio ────────────────────────────────────────────────────────────────

function PortfolioHero({ p }: { p: LivePortfolio }) {
  const invested = p.positions.filter(x => x.assetType !== 'Liquidez');
  const greenToday = invested.filter(x => x.dayChangePct > 0).length;
  return (
    <Panel title="Mi cartera" icon={<Wallet className="h-3.5 w-3.5" />} className="h-full">
      <div className="text-4xl 2xl:text-5xl font-bold text-slate-50 tabular-nums tracking-tight">
        {formatCurrency(p.valueEur)}
      </div>
      <div className={cn('mt-1 text-xl 2xl:text-2xl font-semibold tabular-nums', toneClass(p.dayPnlEur))}>
        {fmtSignedEur(p.dayPnlEur)}
        <span className="ml-2 text-base 2xl:text-lg">{fmtSignedPct(p.dayPnlPct)}</span>
        <span className="ml-2 text-xs font-medium text-slate-500">hoy</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">P&amp;L latente</dt>
          <dd className={cn('font-semibold tabular-nums', toneClass(p.unrealizedEur))}>
            {fmtSignedEur(p.unrealizedEur)}
          </dd>
          <dd className={cn('text-xs tabular-nums', toneClass(p.unrealizedPct))}>{fmtSignedPct(p.unrealizedPct)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Invertido</dt>
          <dd className="font-semibold text-slate-200 tabular-nums">{formatCurrency(p.investedEur)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Liquidez</dt>
          <dd className="font-semibold text-slate-200 tabular-nums">{formatCurrency(p.cashEur)}</dd>
          <dd className="text-xs text-slate-500 tabular-nums">
            {p.valueEur > 0 ? fmtNum((p.cashEur / p.valueEur) * 100, 1) : '0'}% de la cartera
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Posiciones</dt>
          <dd className="font-semibold text-slate-200 tabular-nums">{invested.length}</dd>
          <dd className="text-xs text-slate-500">{greenToday} suben hoy</dd>
        </div>
      </dl>
    </Panel>
  );
}

function PositionsTable({ p }: { p: LivePortfolio }) {
  return (
    <div className="overflow-auto h-full -mx-1">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="text-left font-medium py-1 px-1">Activo</th>
            <th className="text-right font-medium py-1 px-1">Peso</th>
            <th className="text-right font-medium py-1 px-1">Valor</th>
            <th className="text-right font-medium py-1 px-1">Hoy</th>
            <th className="text-right font-medium py-1 px-1">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {p.positions.map(pos => (
            <tr key={pos.ticker} className="hover:bg-slate-800/40">
              <td className="py-1.5 px-1 max-w-0 w-[40%]">
                <Link href={`/position/${encodeURIComponent(pos.ticker)}`} className="block truncate">
                  <span className="font-semibold text-slate-100">{pos.ticker}</span>
                  <span className="ml-1.5 text-xs text-slate-500">{pos.name}</span>
                </Link>
              </td>
              <td className="py-1.5 px-1 text-right tabular-nums text-slate-400">{fmtNum(pos.weight, 1)}%</td>
              <td className="py-1.5 px-1 text-right tabular-nums text-slate-200">{formatCurrency(pos.valueEur)}</td>
              <td className={cn('py-1.5 px-1 text-right tabular-nums font-medium', toneClass(pos.dayChangePct))}>
                {pos.assetType === 'Liquidez' ? '—' : fmtSignedPct(pos.dayChangePct)}
              </td>
              <td className={cn('py-1.5 px-1 text-right tabular-nums', toneClass(pos.returnPct))}>
                {pos.assetType === 'Liquidez' ? '—' : fmtSignedPct(pos.returnPct, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

function NewsList({ feed }: { feed: LiveFeed | null }) {
  if (!feed) return <div className="text-sm text-slate-500">Cargando noticias…</div>;
  if (feed.news.length === 0) return <div className="text-sm text-slate-500">Sin noticias recientes</div>;
  return (
    <ul className="divide-y divide-slate-800/70 overflow-auto h-full">
      {feed.news.map(n => (
        <li key={n.id}>
          <a href={n.link} target="_blank" rel="noopener noreferrer" className="block py-2 group">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="px-1.5 py-px rounded bg-slate-800 text-slate-300 font-semibold">{n.ticker}</span>
              <span>{formatRelativeTime(n.publishedAt)}</span>
              {n.publisher && <span className="truncate">· {n.publisher}</span>}
            </div>
            <div className="mt-0.5 text-sm text-slate-200 leading-snug group-hover:text-white line-clamp-2">
              {n.title}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

function Agenda({ feed }: { feed: LiveFeed | null }) {
  if (!feed) return <div className="text-sm text-slate-500">Cargando agenda…</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 content-start overflow-auto h-full">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 mb-1">
          <Landmark className="h-3 w-3" /> Bancos centrales
        </div>
        {feed.centralBanks.length === 0 ? (
          <div className="text-xs text-slate-500">Sin reuniones programadas</div>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {feed.centralBanks.map(m => (
              <li key={`${m.bank}-${m.date}`} className="flex items-center justify-between py-1.5 text-sm">
                <span className="font-semibold text-slate-200 w-10">{m.bank}</span>
                <span className="text-slate-400 capitalize flex-1">{shortDate(m.date)}</span>
                <span className="text-xs text-slate-500">{formatRelativeFuture(m.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 mb-1">
          <CalendarClock className="h-3 w-3" /> Resultados de tu cartera
        </div>
        {feed.earnings.length === 0 ? (
          <div className="text-xs text-slate-500">Ninguno en los próximos 45 días</div>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {feed.earnings.map(e => (
              <li key={e.ticker} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-slate-200">{e.ticker}</span>
                  {e.epsEstimate !== undefined && (
                    <span className="ml-1.5 text-xs text-slate-500 tabular-nums">BPA est. {fmtNum(e.epsEstimate)}</span>
                  )}
                </span>
                <span className="text-slate-400 capitalize shrink-0">{shortDate(e.date)}</span>
                <span className="text-xs text-slate-500 shrink-0 w-16 text-right">{formatRelativeFuture(e.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function LiveDashboard({ initial }: { initial: LiveSnapshot | null }) {
  const snap = usePolling<LiveSnapshot>('/api/live', SNAPSHOT_INTERVAL_MS, initial);
  const feed = usePolling<LiveFeed>('/api/live/feed', FEED_INTERVAL_MS, null);
  const { isFullscreen, toggle } = useFullscreen();
  useWakeLock();

  const data = snap.data;
  const p = data?.portfolio ?? null;
  const yields = data?.markets.rates.filter(q => q.kind === 'yield') ?? [];
  const otherRates = data?.markets.rates.filter(q => q.kind !== 'yield') ?? [];
  const slope = yields.length >= 2 ? (yields[yields.length - 2].price - yields[0].price) * 100 : null; // 10A − 3M

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-200">
      <div className="min-h-full xl:h-full xl:min-h-[940px] flex flex-col gap-3 p-3 2xl:p-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Cartera
            </Link>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-100 tracking-tight">
              <Activity className="h-5 w-5 text-emerald-400" /> Panel en vivo
            </h1>
            <LiveStatus generatedAt={data?.generatedAt} error={snap.error} loading={snap.loading} />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { snap.reload(); feed.reload(); }}
              disabled={snap.loading}
              title="Actualizar ahora"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', snap.loading && 'animate-spin')} />
            </button>
            <button
              onClick={toggle}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <HeaderClock />
          </div>
        </header>

        {!data && (
          <div className="flex-1 grid place-items-center text-slate-500 text-sm">
            {snap.error ? 'No se pudieron cargar los datos. Reintentando…' : 'Cargando datos de mercado…'}
          </div>
        )}

        {data && (
          <>
            {/* Desktop: everything fits one screen — portfolio + markets on the
                left, a full-height macro column on the right. Below xl it stacks. */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 flex-1 min-h-0">
              <div className="xl:col-span-9 flex flex-col gap-3 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-9 gap-3">
                  <div className="lg:col-span-3">
                    {p ? (
                      <PortfolioHero p={p} />
                    ) : (
                      <Panel title="Mi cartera" icon={<Wallet className="h-3.5 w-3.5" />} className="h-full">
                        <p className="text-sm text-rose-400">{data.portfolioError ?? 'Cartera no disponible'}</p>
                      </Panel>
                    )}
                  </div>
                  <Panel
                    title="P&L de la cartera hoy"
                    icon={<Activity className="h-3.5 w-3.5" />}
                    className="lg:col-span-6"
                    bodyClassName="flex-1"
                    right={p && (
                      <span className={cn('text-sm font-semibold tabular-nums', toneClass(p.dayPnlEur))}>
                        {fmtSignedEur(p.dayPnlEur)} · {fmtSignedPct(p.dayPnlPct)}
                      </span>
                    )}
                  >
                    <Fill className="h-52 lg:h-full">
                      <PnlIntradayChart data={p?.pnlCurve ?? []} />
                    </Fill>
                  </Panel>
                </div>

                <IndexTiles quotes={data.markets.indices} />

                <div className="grid grid-cols-1 lg:grid-cols-9 gap-3 flex-1 min-h-0 xl:grid-rows-[minmax(0,5fr)_minmax(0,4fr)]">
                  <Panel
                    title="Mapa de calor · cambio del día"
                    icon={<LayoutGrid className="h-3.5 w-3.5" />}
                    className="lg:col-span-5"
                    bodyClassName="flex-1"
                    right={<HeatLegend />}
                  >
                    <Fill className="h-72 xl:h-full">{p && <PositionsHeatmap positions={p.positions} />}</Fill>
                  </Panel>
                  <Panel title="Posiciones" icon={<Wallet className="h-3.5 w-3.5" />} className="lg:col-span-4" bodyClassName="flex-1">
                    <Fill className="h-72 xl:h-full">{p && <PositionsTable p={p} />}</Fill>
                  </Panel>
                  <Panel title="Noticias de tu cartera" icon={<Newspaper className="h-3.5 w-3.5" />} className="lg:col-span-5" bodyClassName="flex-1">
                    <Fill className="h-72 xl:h-full"><NewsList feed={feed.data} /></Fill>
                  </Panel>
                  <Panel title="Agenda" icon={<CalendarClock className="h-3.5 w-3.5" />} className="lg:col-span-4" bodyClassName="flex-1">
                    <Fill className="h-72 xl:h-full"><Agenda feed={feed.data} /></Fill>
                  </Panel>
                </div>
              </div>

              <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:flex xl:flex-col gap-3 min-h-0 xl:overflow-y-auto [&>*]:shrink-0">
                <Panel title="Sesiones" icon={<Clock className="h-3.5 w-3.5" />}>
                  <SessionClocks sessions={data.sessions} />
                </Panel>
                <Panel
                  title="Tipos y riesgo"
                  icon={<Landmark className="h-3.5 w-3.5" />}
                  right={slope !== null && (
                    <span className="text-[11px] text-slate-400 tabular-nums" title="Diferencial 10 años − 3 meses">
                      10A−3M <span className={toneClass(slope)}>{slope > 0 ? '+' : ''}{fmtNum(slope, 0)} pb</span>
                    </span>
                  )}
                >
                  <YieldCurveChart yields={yields} />
                  <div className="mt-1">
                    <QuoteList quotes={[...yields, ...otherRates]} />
                  </div>
                </Panel>
                <Panel title="Divisas" icon={<Globe2 className="h-3.5 w-3.5" />}>
                  <QuoteList quotes={data.markets.fx} />
                </Panel>
                <Panel title="Materias primas y cripto" icon={<Coins className="h-3.5 w-3.5" />}>
                  <QuoteList quotes={[...data.markets.commodities, ...data.markets.crypto]} />
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
