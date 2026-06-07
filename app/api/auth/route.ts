import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  getExpectedToken,
  safeEqual,
} from '@/lib/auth';

export const runtime = 'edge';

export async function POST(req: Request) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code : '';
  if (!safeEqual(code, accessCode)) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
  }

  const token = await getExpectedToken(accessCode);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
