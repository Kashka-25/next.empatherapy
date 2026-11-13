import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session.mjs';

/**
 * Guards the admin area. Anyone without a valid signed session is sent to the sign-in page.
 * Admin pages are also kept out of search engines. (Server actions check the session again.)
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const open = pathname === '/admin/login' || pathname === '/admin/login/code';
  const secret = process.env.ADMIN_SESSION_SECRET;
  const ok = !open && secret ? await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret) : open;

  const res = ok ? NextResponse.next() : NextResponse.redirect(new URL('/admin/login', request.url));
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
