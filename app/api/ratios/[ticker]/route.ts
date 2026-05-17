import { NextResponse } from 'next/server';
import { getRatios } from '@/lib/financial-data';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const ratios = await getRatios(decodeURIComponent(ticker));
  if (!ratios) {
    return NextResponse.json({ error: 'No se encontraron datos para este ticker' }, { status: 404 });
  }
  return NextResponse.json(ratios);
}
