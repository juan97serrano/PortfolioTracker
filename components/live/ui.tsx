import type { ReactNode } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import type { IntradayPoint } from '@/lib/types';

export const UP = '#34d399';   // emerald-400
export const DOWN = '#fb7185'; // rose-400

export function toneClass(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-rose-400';
  return 'text-slate-400';
}

export function fmtNum(v: number, decimals = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

export function fmtSignedPct(v: number, decimals = 2): string {
  return `${v > 0 ? '+' : ''}${fmtNum(v, decimals)}%`;
}

export function fmtSignedEur(v: number): string {
  return `${v > 0 ? '+' : ''}${formatCurrency(v)}`;
}

export function fmtCompactEur(v: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: Math.abs(v) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(v) >= 10_000 ? 1 : 0,
  }).format(v);
}

export function fmtClock(unixSec: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone }).format(
    new Date(unixSec * 1000),
  );
}

export function Panel({
  title,
  icon,
  right,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col min-h-0', className)}>
      <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {icon}
          {title}
        </h2>
        {right}
      </header>
      <div className={cn('px-4 pb-3 min-h-0', bodyClassName)}>{children}</div>
    </section>
  );
}

export function OpenDot({ open }: { open: boolean }) {
  return (
    <span
      title={open ? 'Mercado abierto' : 'Mercado cerrado'}
      className={cn(
        'inline-block h-1.5 w-1.5 rounded-full shrink-0',
        open ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600',
      )}
    />
  );
}

// Minimal SVG sparkline with a dashed previous-close baseline. When the points
// fall inside the regular session, x is mapped to the full session so a
// half-finished day only fills half the width.
export function Sparkline({
  points,
  prevClose,
  sessionStart,
  sessionEnd,
  className,
}: {
  points: IntradayPoint[];
  prevClose: number;
  sessionStart?: number;
  sessionEnd?: number;
  className?: string;
}) {
  if (points.length < 2) return <div className={className} />;

  const W = 100;
  const H = 32;
  const pad = 2;
  const prices = points.map(p => p.p);
  const lo = Math.min(...prices, prevClose);
  const hi = Math.max(...prices, prevClose);
  const span = hi - lo || 1;

  const first = points[0].t;
  const last = points[points.length - 1].t;
  const inSession =
    !!sessionStart && !!sessionEnd && sessionEnd > sessionStart &&
    first >= sessionStart - 600 && last <= sessionEnd + 600;
  const t0 = inSession ? sessionStart! : first;
  const t1 = inSession ? sessionEnd! : last;

  const x = (t: number) => ((Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(2)},${y(p.p).toFixed(2)}`).join('');
  const up = points[points.length - 1].p >= prevClose;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
      <line
        x1={0} x2={W} y1={y(prevClose)} y2={y(prevClose)}
        stroke="#475569" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke"
      />
      <path
        d={d} fill="none" stroke={up ? UP : DOWN} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
