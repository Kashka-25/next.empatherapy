/**
 * Server-side admin checks for pages and actions. (Middleware also guards /admin; every action checks again.)
 *
 * Admin is OFF unless ADMIN_SESSION_SECRET (32+ random characters) is set AND there is a way to sign in:
 *   - individual accounts in the store (see lib/accounts.mjs), or
 *   - the one-time setup password, ADMIN_PASSWORD_HASH (made with `npm run admin:hash`), which exists only to
 *     create the first owner account and stops working the moment an active owner account exists.
 * There is no default password.
 *
 * Who is signed in is decided from the account in the store on every request, never from the cookie alone,
 * so deactivating or demoting someone takes effect immediately.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, MIN_SECRET_LENGTH, readSession } from './session.mjs';
import { getStore, storeEnabled } from './store/index.mjs';
import { activeAccount, activeOwnerCount, can } from './accounts.mjs';

const secretOk = () => (process.env.ADMIN_SESSION_SECRET || '').length >= MIN_SECRET_LENGTH;
export const adminConfigured = () => secretOk() && (Boolean(process.env.ADMIN_PASSWORD_HASH) || storeEnabled());

/** The signed-in person ({ id, name, email, role }), or null. */
export async function currentAdmin() {
  if (!secretOk()) return null;
  const who = await readSession(cookies().get(SESSION_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
  if (!who) return null;
  const store = getStore();
  if (who.sub === 'bootstrap') {
    if (!process.env.ADMIN_PASSWORD_HASH) return null;
    if (store && (await activeOwnerCount(store)) > 0) return null; // the setup login closes once a real owner exists
    return { id: 'bootstrap', name: 'Setup owner', email: '', role: 'owner', two_step: false };
  }
  if (!store) return null;
  const acct = await activeAccount(store, who.sub);
  return acct ? { id: acct.id, name: acct.name, email: acct.email, role: acct.role, two_step: acct.two_step, profile_id: acct.profile_id } : null;
}

export async function isAdmin() {
  return (await currentAdmin()) !== null;
}

/** Sends anyone not signed in to the sign-in page, and anyone without access to `area` back to the overview. */
export async function requireAdmin(area) {
  const me = await currentAdmin();
  if (!me) redirect('/admin/login');
  if (area && !can(me.role, area)) redirect('/admin?e=forbidden');
  return me;
}

/** An Alchemist's own space: only a signed-in Alchemist, and only for the one profile their login belongs to. */
export async function requirePortal() {
  const me = await requireAdmin('portal');
  if (!me.profile_id) redirect('/admin?e=forbidden');
  return me;
}
