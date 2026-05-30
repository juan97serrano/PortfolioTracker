import { NextResponse } from 'next/server';
import { getPriceHistory } from '@/lib/financial-data';
import type { PriceRange } from '@/lib/types';

const VALID_RANGES: PriceRange[] = ['1mo', '3mo', '6mo', '1y', '5y', 'max'];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(req.url);
  const rangeParam = (searchParams.get('range') ?? '1y') as PriceRange;
  const range = VALID_RANGES.includes(rangeParam) ? rangeParam : '1y';

  const history = await getPriceHistory(decodeURIComponent(ticker), range);
  return NextResponse.json({ history });
}
