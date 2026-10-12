import { NextResponse } from 'next/server';
import { buildLiveSnapshot } from '@/lib/live';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await buildLiveSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
