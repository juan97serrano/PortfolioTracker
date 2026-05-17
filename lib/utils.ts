import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
  'Otro': '#6b7280',
};

export const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899',
  '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];
