/**
 * Individual admin accounts, stored in the `admins` collection. Storage-agnostic (takes a store).
 *
 * Roles:
 *   owner     everything, including accounts and the retention clean-up
 *   editor    Alchemist profiles, modality pages and weekly features
 *   reviewer  Alchemist applications only
 *
 * Passwords are stored only as salted scrypt hashes. Accounts are deactivated rather than deleted, so
 * "who changed this" stays answerable. The last active owner can never be removed or demoted.
 */
import { hashPassword, verifyPassword } from './password.mjs';

export const ROLES = ['owner', 'editor', 'reviewer'];
export const ROLE_LABEL = { owner: 'Owner', editor: 'Editor', reviewer: 'Reviewer' };
export const ROLE_HELP = {
  owner: 'Everything, including accounts and clean-up.',
  editor: 'Alchemist profiles, modality pages and weekly features.',
  reviewer: 'Alchemist applications only.',
};
export const AREAS = ['applications', 'content', 'accounts', 'retention'];
const ALLOWED = { owner: AREAS, editor: ['content'], reviewer: ['applications'] };
export const can = (role, area) => (ALLOWED[role] ?? []).includes(area);

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, max);
export const normaliseEmail = (e) => clean(e, 200).toLowerCase();

/** The public view of an account: never the hash. */
export const safeAccount = ({ password_hash, ...rest }) => rest;

export async function listAccounts(store) {
  return (await store.list('admins')).map(safeAccount).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

async function findByEmail(store, email) {
  const e = normaliseEmail(email);
  return (await store.list('admins')).find((a) => a.email === e) ?? null;
}

export async function activeOwnerCount(store) {
  return (await store.list('admins')).filter((a) => a.active && a.role === 'owner').length;
}

export async function createAccount(store, { email, name, role, password }) {
  const errors = {};
  const e = normaliseEmail(email);
  if (!EMAIL.test(e)) errors.email = 'Please enter a valid email address.';
  const n = clean(name, 80);
  if (n.length < 2) errors.name = 'Please enter a name.';
  if (!ROLES.includes(role)) errors.role = 'Choose a role.';
  if (typeof password !== 'string' || password.length < 12) errors.password = 'Use a password of at least 12 characters.';
  else if (password.length > 200) errors.password = 'That password is too long.';
  if (!errors.email && (await findByEmail(store, e))) errors.email = 'There is already an account with that email.';
  if (Object.keys(errors).length) return { ok: false, errors };
  const rec = await store.put('admins', { email: e, name: n, role, active: true, password_hash: await hashPassword(password), last_login_at: null });
  return { ok: true, account: safeAccount(rec) };
}

// A fixed hash to compare against when the email is unknown, so timing does not reveal which emails exist.
let dummy;
const dummyHash = () => (dummy ??= hashPassword('not-a-real-account-password'));

/** The account when the email and password match an active account, else null. */
export async function authenticate(store, email, password) {
  const acct = await findByEmail(store, email);
  const ok = await verifyPassword(String(password ?? ''), acct ? acct.password_hash : await dummyHash());
  if (!acct || !ok || !acct.active) return null;
  return safeAccount(await store.put('admins', { ...acct, last_login_at: new Date().toISOString() }));
}

/** The current, authoritative account for a session (re-read each time, so deactivation takes effect at once). */
export async function activeAccount(store, id) {
  const acct = await store.get('admins', String(id));
  return acct && acct.active ? safeAccount(acct) : null;
}

export async function updateAccount(store, id, { role, active, password }) {
  const acct = await store.get('admins', String(id));
  if (!acct) return { ok: false, reason: 'not_found' };
  const next = { ...acct };
  if (role !== undefined) { if (!ROLES.includes(role)) return { ok: false, reason: 'bad_role' }; next.role = role; }
  if (active !== undefined) next.active = Boolean(active);
  const losesOwner = acct.active && acct.role === 'owner' && (!next.active || next.role !== 'owner');
  if (losesOwner && (await activeOwnerCount(store)) <= 1) return { ok: false, reason: 'last_owner' };
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 200) return { ok: false, reason: 'bad_password' };
    next.password_hash = await hashPassword(password);
  }
  return { ok: true, account: safeAccount(await store.put('admins', next)) };
}
