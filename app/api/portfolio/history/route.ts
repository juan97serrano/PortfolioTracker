import { NextResponse } from 'next/server';
import { parseExcelBuffer, parseCsvText } from '@/lib/excel-parser';
import { computePortfolioHistory } from '@/lib/portfolio-history';
import type { PriceRange } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_RANGES: PriceRange[] = ['1mo', '3mo', '6mo', '1y', '5y', 'max'];

function getDriveDownloadUrl(raw: string): string {
  if (raw.includes('export?') || raw.includes('/pub?')) return raw;
  const sheetsMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`;
  const driveMatch = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  return raw;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get('range') ?? '1y') as PriceRange;
    const range = VALID_RANGES.includes(rangeParam) ? rangeParam : '1y';

    const raw = process.env.PORTFOLIO_URL ?? '';
    if (!raw) return NextResponse.json({ error: 'PORTFOLIO_URL no configurado' }, { status: 500 });

    const url = getDriveDownloadUrl(raw);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'No se pudo descargar el archivo' }, { status: 502 });

    const contentType = res.headers.get('content-type') ?? '';
    const transactions = (contentType.includes('text/csv') || url.includes('format=csv'))
      ? await parseCsvText(await res.text())
      : await parseExcelBuffer(await res.arrayBuffer());

    const history = await computePortfolioHistory(transactions, range);
    return NextResponse.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
