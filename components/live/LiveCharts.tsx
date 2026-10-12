'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import type { LivePosition, LiveQuote } from '@/lib/types';
import { DOWN, UP, fmtClock, fmtCompactEur, fmtNum, fmtSignedEur, fmtSignedPct, toneClass } from './ui';

const AXIS_TICK = { fill: '#64748b', fontSize: 11 };
const GRID = '#1e293b';

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-lg px-2.5 py-2 shadow-xl text-xs space-y-0.5">
      {children}
    </div>
  );
}

// ── Intraday P&L ─────────────────────────────────────────────────────────────

export function PnlIntradayChart({ data }: { data: { t: number; v: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="h-full grid place-items-center text-sm text-slate-500">
        Sin datos intradía todavía
      </div>
    );
  }

  const values = data.map(d => d.v);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // Where zero sits inside the gradient's bounding box (0 = top, 1 = bottom).
  const zero = max <= 0 ? 0 : min >= 0 ? 1 : max / (max - min);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor={UP} stopOpacity={0.35} />
            <stop offset={zero} stopColor={UP} stopOpacity={0.05} />
            <stop offset={zero} stopColor={DOWN} stopOpacity={0.05} />
            <stop offset={1} stopColor={DOWN} stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id="pnlStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset={zero} stopColor={UP} />
            <stop offset={zero} stopColor={DOWN} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t: number) => fmtClock(t)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={(v: number) => fmtCompactEur(v)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
        <Tooltip
          cursor={{ stroke: '#64748b', strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { t: number; v: number };
            return (
              <TooltipBox>
                <div className="text-slate-400">{fmtClock(p.t)}</div>
                <div className={`font-semibold tabular-nums ${toneClass(p.v)}`}>{fmtSignedEur(p.v)}</div>
              </TooltipBox>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke="url(#pnlStroke)"
          strokeWidth={2}
          fill="url(#pnlFill)"
          isAnimationActive={false}
          activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2, fill: '#e2e8f0' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Positions heatmap ────────────────────────────────────────────────────────

const HEAT_NEUTRAL = [51, 65, 85];  // slate-700
const HEAT_UP = [5, 150, 105];      // emerald-600
const HEAT_DOWN = [225, 29, 72];    // rose-600
const HEAT_CLAMP = 3;               // ±3% saturates the color

function heatColor(pct: number): string {
  const t = Math.min(Math.abs(pct) / HEAT_CLAMP, 1);
  const target = pct >= 0 ? HEAT_UP : HEAT_DOWN;
  const c = HEAT_NEUTRAL.map((n, i) => Math.round(n + (target[i] - n) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

interface HeatCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ticker?: string;
  dayChangePct?: number;
}

function HeatCell({ x = 0, y = 0, width = 0, height = 0, ticker, dayChangePct = 0 }: HeatCellProps) {
  if (!ticker) return <g />;
  const size = Math.max(10, Math.min(18, width / 6, height / 3));
  const showTicker = width > 36 && height > 20;
  const showPct = width > 44 && height > 40;
  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height} rx={4}
        fill={heatColor(dayChangePct)} stroke="#020617" strokeWidth={2}
      />
      {showTicker && (
        <text
          x={x + width / 2} y={y + height / 2 - (showPct ? size * 0.35 : -size * 0.35)}
          textAnchor="middle" fill="#f8fafc" fontSize={size} fontWeight={700}
        >
          {ticker.length > 10 ? ticker.split('.')[0] : ticker}
        </text>
      )}
      {showPct && (
        <text
          x={x + width / 2} y={y + height / 2 + size * 0.85}
          textAnchor="middle" fill="#e2e8f0" fontSize={size * 0.75} fontWeight={500}
        >
          {fmtSignedPct(dayChangePct)}
        </text>
      )}
    </g>
  );
}

export function PositionsHeatmap({ positions }: { positions: LivePosition[] }) {
  const data = positions
    .filter(p => p.assetType !== 'Liquidez' && p.valueEur > 0)
    .map(p => ({ ...p, name: p.ticker }));

  if (data.length === 0) {
    return <div className="h-full grid place-items-center text-sm text-slate-500">Sin posiciones</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="valueEur"
        aspectRatio={16 / 9}
        isAnimationActive={false}
        content={<HeatCell />}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as LivePosition;
            if (!p?.ticker) return null;
            return (
              <TooltipBox>
                <div className="font-semibold text-slate-100">{p.ticker}</div>
                <div className="text-slate-400 max-w-[220px] truncate">{p.name}</div>
                <div className="text-slate-300 tabular-nums">Peso: {fmtNum(p.weight, 1)}%</div>
                <div className={`tabular-nums font-medium ${toneClass(p.dayChangePct)}`}>
                  Hoy: {fmtSignedPct(p.dayChangePct)} · {fmtSignedEur(p.dayPnlEur)}
                </div>
                <div className={`tabular-nums ${toneClass(p.returnPct)}`}>Total: {fmtSignedPct(p.returnPct)}</div>
              </TooltipBox>
            );
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 tabular-nums">
      <span>−{HEAT_CLAMP}%</span>
      <span
        className="h-1.5 w-20 rounded-full"
        style={{
          background: `linear-gradient(to right, ${heatColor(-HEAT_CLAMP)}, ${heatColor(0)}, ${heatColor(HEAT_CLAMP)})`,
        }}
      />
      <span>+{HEAT_CLAMP}%</span>
    </div>
  );
}

// ── US yield curve ───────────────────────────────────────────────────────────

const CURVE_NOW = '#60a5fa';  // blue-400
const CURVE_PREV = '#94a3b8'; // slate-400

export function YieldCurveChart({ yields }: { yields: LiveQuote[] }) {
  if (yields.length < 2) return null;
  const data = yields.map(q => ({
    tenor: q.label.split(' ').pop() ?? q.label,
    now: q.price,
    prev: q.prevClose,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-1">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded" style={{ background: CURVE_NOW }} /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0 w-3 border-t border-dashed" style={{ borderColor: CURVE_PREV }} /> Cierre anterior
        </span>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="tenor" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${fmtNum(v, 1)}%`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: '#64748b', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                const bp = (p.now - p.prev) * 100;
                return (
                  <TooltipBox>
                    <div className="text-slate-400">Bono EE. UU. {p.tenor}</div>
                    <div className="font-semibold text-slate-100 tabular-nums">{fmtNum(p.now, 3)}%</div>
                    <div className="text-slate-400 tabular-nums">Ant.: {fmtNum(p.prev, 3)}%</div>
                    <div className={`tabular-nums ${toneClass(bp)}`}>
                      {bp > 0 ? '+' : ''}{fmtNum(bp, 1)} pb
                    </div>
                  </TooltipBox>
                );
              }}
            />
            <Line
              dataKey="prev" stroke={CURVE_PREV} strokeWidth={1.5} strokeDasharray="4 3"
              dot={false} isAnimationActive={false}
            />
            <Line
              dataKey="now" stroke={CURVE_NOW} strokeWidth={2}
              dot={{ r: 4, fill: CURVE_NOW, stroke: '#0f172a', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
