import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, getExpectedToken, safeEqual } from './lib/auth';

export async function proxy(req: NextRequest) {
  const accessCode = process.env.ACCESS_CODE;
  // Auth is opt-in: if no ACCESS_CODE is set, the app stays public.
  if (!accessCode) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value ?? '';
  const expected = await getExpectedToken(accessCode);
  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  // API routes return 401 instead of redirecting.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const loginUrl = new URL('/login', req.url);
  if (req.nextUrl.pathname !== '/') {
    loginUrl.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except: Next.js internals, the login page itself,
  // the auth API and the favicon.
  matcher: ['/((?!_next/|login|api/auth|favicon.ico).*)'],
};
