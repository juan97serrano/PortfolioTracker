import { cn, formatPct } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  value: number;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ReturnBadge({ value, className, showIcon = true, size = 'md' }: Props) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral  = value === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const sizeClass = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold tabular-nums',
        sizeClass,
        isPositive && 'text-emerald-600',
        isNegative && 'text-red-500',
        isNeutral  && 'text-gray-500',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
      {formatPct(value)}
    </span>
  );
}
