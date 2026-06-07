import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'EUR'): string {
  const safe = /^[A-Z]{3}$/.test(currency) ? currency : 'EUR';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: safe,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${safe}`;
  }
}

export function formatPct(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatShares(value: number): string {
  if (value >= 1000) return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
  if (value < 0.01) return value.toFixed(6);
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}B`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}MM`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function formatRelativeFuture(isoString: string): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = then - Date.now();
  if (diffMs < 0) {
    const daysAgo = Math.round(-diffMs / 86_400_000);
    if (daysAgo === 0) return 'hoy';
    if (daysAgo === 1) return 'ayer';
    return `hace ${daysAgo} d`;
  }
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `en ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `en ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days < 30) return `en ${days} d`;
  const months = Math.round(days / 30);
  return `en ${months} m`;
}

export function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDate(isoString);
}

export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoString));
}

export const ASSET_TYPE_COLORS: Record<string, string> = {
  'Acción': '#3b82f6',
  'ETF': '#8b5cf6',
  'Cripto': '#f59e0b',
  'Bono': '#10b981',
  'REIT': '#ec4899',
  'Liquidez': '#64748b',
  'Otro': '#6b7280',
};

export const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899',
  '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];
