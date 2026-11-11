/**
 * Server-side admin checks for pages and actions. (Middleware also guards /admin; every action checks again.)
 *
 * Admin is OFF unless both are set:
 *   ADMIN_PASSWORD_HASH     made with `npm run admin:hash`
 *   ADMIN_SESSION_SECRET    32+ random characters
 * There is no default password.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, MIN_SECRET_LENGTH, verifySession } from './session.mjs';

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD_HASH) && (process.env.ADMIN_SESSION_SECRET || '').length >= MIN_SECRET_LENGTH;

export async function isAdmin() {
  if (!adminConfigured()) return false;
  return verifySession(cookies().get(SESSION_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}
