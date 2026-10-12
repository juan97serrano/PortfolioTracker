'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LiveQuote, MarketSession } from '@/lib/types';
import { OpenDot, Sparkline, fmtClock, fmtNum, fmtSignedPct, toneClass } from './ui';

export function useNow(intervalMs = 1000): Date | null {
  // null until mounted so server and client markup match.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function changeText(q: LiveQuote): string {
  if (q.kind === 'yield') {
    const bp = q.change * 100;
    return `${bp > 0 ? '+' : ''}${fmtNum(bp, 1)} pb`;
  }
  return fmtSignedPct(q.changePct);
}

export function IndexTiles({ quotes }: { quotes: LiveQuote[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {quotes.map(q => (
        <div key={q.symbol} className="bg-slate-900/70 border border-slate-800 rounded-xl px-3 pt-2.5 pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 truncate">{q.label}</span>
            <OpenDot open={q.isOpen} />
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-0.5">
            <span className="text-lg 2xl:text-xl font-semibold text-slate-100 tabular-nums">
              {fmtNum(q.price, q.decimals)}
            </span>
            <span className={cn('text-sm font-semibold tabular-nums', toneClass(q.changePct))}>
              {fmtSignedPct(q.changePct)}
            </span>
          </div>
          <Sparkline
            points={q.points}
            prevClose={q.prevClose}
            sessionStart={q.sessionStart}
            sessionEnd={q.sessionEnd}
            className="w-full h-8 mt-1"
          />
        </div>
      ))}
    </div>
  );
}

export function QuoteList({ quotes }: { quotes: LiveQuote[] }) {
  if (quotes.length === 0) return <div className="text-xs text-slate-500">Sin datos</div>;
  return (
    <div className="divide-y divide-slate-800/70">
      {quotes.map(q => (
        <div key={q.symbol} className="grid grid-cols-[1fr_56px_auto_72px] items-center gap-2 py-1">
          <span className="flex items-center gap-1.5 text-sm text-slate-300 truncate">
            <OpenDot open={q.isOpen} />
            {q.label}
          </span>
          <Sparkline points={q.points} prevClose={q.prevClose} className="w-14 h-5" />
          <span className="text-sm font-medium text-slate-100 tabular-nums text-right">
            {fmtNum(q.price, q.decimals)}{q.kind === 'yield' ? '%' : ''}
          </span>
          <span className={cn('text-xs font-semibold tabular-nums text-right', toneClass(q.change))}>
            {changeText(q)}
          </span>
        </div>
      ))}
    </div>
  );
}

function sessionStatus(s: MarketSession, nowSec: number): string {
  if (s.isOpen && s.sessionEnd) return `Cierra ${fmtClock(s.sessionEnd)}`;
  if (s.sessionStart && nowSec < s.sessionStart) return `Abre ${fmtClock(s.sessionStart)}`;
  return 'Cerrado';
}

export function SessionClocks({ sessions }: { sessions: MarketSession[] }) {
  const now = useNow(1000);
  const nowSec = now ? now.getTime() / 1000 : 0;
  return (
    <div className="divide-y divide-slate-800/70">
      {sessions.map(s => {
        // Recompute open state against the live clock so the badge flips on time
        // between refreshes.
        const open = now && s.sessionStart && s.sessionEnd
          ? nowSec >= s.sessionStart && nowSec < s.sessionEnd
          : s.isOpen;
        return (
          <div key={s.id} className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <OpenDot open={open} />
              <span className="text-sm text-slate-300 truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn('text-[11px]', open ? 'text-emerald-400' : 'text-slate-500')}>
                {now ? sessionStatus({ ...s, isOpen: open }, nowSec) : ''}
              </span>
              <span className="text-sm font-medium text-slate-100 tabular-nums w-12 text-right">
                {now ? fmtClock(nowSec, s.timeZone) : '--:--'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
