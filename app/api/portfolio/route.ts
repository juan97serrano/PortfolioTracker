import { NextResponse } from 'next/server';
import { fetchPortfolio } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await fetchPortfolio();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
