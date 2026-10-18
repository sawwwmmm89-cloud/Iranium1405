import { NextResponse, type NextRequest } from 'next/server';
import { CSRF_COOKIE, createCsrfToken, csrfCookieOptions } from '@/server/security/csrf-constants';

// Edge-safe optimistic gate (cookie presence only). Real session + role checks
// run server-side in the (student)/(admin) layouts and in API handlers.
export function middleware(req: NextRequest) {
  if (!req.cookies.get('bama_session')?.value) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  // Issue the CSRF double-submit cookie for admin pages (also covers pre-existing sessions).
  if (req.nextUrl.pathname.startsWith('/admin') && !req.cookies.get(CSRF_COOKIE)?.value) {
    res.cookies.set(CSRF_COOKIE, createCsrfToken(), csrfCookieOptions(process.env.NODE_ENV === 'production'));
  }
  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/admin/:path*'] };
