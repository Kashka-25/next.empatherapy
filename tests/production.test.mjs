import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver, storeKind } from '../lib/store/index.mjs';
import { createSupabaseDriver, validSupabaseUrl } from '../lib/store/supabase.mjs';
import { createSharedLimiter } from '../lib/ratelimit.mjs';
import { createSession, readSession, verifySession, MIN_SECRET_LENGTH } from '../lib/session.mjs';
import { createAccount, authenticate, activeAccount, updateAccount, listAccounts, can, ROLES } from '../lib/accounts.mjs';
import { findExpired, purgeExpired, RETENTION_DAYS } from '../lib/retention.mjs';

const SECRET = 'x'.repeat(MIN_SECRET_LENGTH);
const KEY = 'service-role-key-that-is-long-enough';

/** A fake of the Supabase REST endpoint, enough to prove the driver speaks it correctly. */
function fakeSupabase() {
  const rows = new Map(); // "collection|id" -> row
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    calls.push({ url: u, init });
    assert.equal(init.headers.apikey, KEY);
    assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
    assert.equal(u.pathname, '/rest/v1/records');
    const q = u.searchParams;
    const col = q.get('collection')?.replace(/^eq\./, '');
    const id = q.get('id')?.replace(/^eq\./, '');
    const respond = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
    const method = init.method ?? 'GET';
    if (method === 'POST') {
      const b = JSON.parse(init.body);
      rows.set(`${b.collection}|${b.id}`, b);
      return respond(201);
    }
    const match = [...rows.values()].filter((r) => r.collection === col && (id === undefined || r.id === id));
    if (method === 'DELETE') { match.forEach((r) => rows.delete(`${r.collection}|${r.id}`)); return respond(200, match.map((r) => ({ id: r.id }))); }
    const limit = Number(q.get('limit') ?? 1000), offset = Number(q.get('offset') ?? 0);
    match.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    return respond(200, match.slice(offset, offset + limit).map((r) => ({ data: r.data })));
  };
  return { fetchImpl, rows, calls };
}

test('supabase driver follows the store contract', async () => {
  const { fetchImpl } = fakeSupabase();
  const d = createSupabaseDriver({ url: 'https://abc.supabase.co/', key: KEY, fetchImpl });
  const a = await d.put('things', { name: 'a' });
  assert.ok(a.id && a.created_at && a.updated_at);
  assert.equal((await d.get('things', a.id)).name, 'a');
  const b = await d.put('things', { id: a.id, name: 'a2' });
  assert.equal(b.created_at, a.created_at, 'created_at is kept on update');
  assert.equal((await d.get('things', a.id)).name, 'a2');
  assert.equal((await d.list('things')).length, 1);
  assert.equal(await d.get('things', 'missing'), null);
  assert.equal(await d.remove('things', a.id), true);
  assert.equal(await d.remove('things', a.id), false);
  await assert.rejects(() => d.list('../etc'), /Invalid collection/);
  await assert.rejects(() => d.put('A B', {}), /Invalid collection/);
});

test('supabase driver pages through long lists and keeps collections apart', async () => {
  const { fetchImpl } = fakeSupabase();
  const d = createSupabaseDriver({ url: 'https://abc.supabase.co', key: KEY, fetchImpl });
  for (let i = 0; i < 1005; i++) await d.put('big', { id: `r${String(i).padStart(4, '0')}`, n: i }, new Date(2026, 0, 1, 0, 0, i).toISOString());
  await d.put('other', { id: 'x' });
  assert.equal((await d.list('big')).length, 1005);
  assert.equal((await d.list('other')).length, 1);
});

test('supabase driver encodes ids and never leaks response bodies in errors', async () => {
  const { fetchImpl, calls } = fakeSupabase();
  const d = createSupabaseDriver({ url: 'https://abc.supabase.co', key: KEY, fetchImpl });
  await d.get('things', 'a&collection=eq.applications');
  assert.equal(calls[0].url.searchParams.get('collection'), 'eq.things', 'an id cannot rewrite the collection filter');
  const failing = createSupabaseDriver({ url: 'https://abc.supabase.co', key: KEY, fetchImpl: async () => ({ ok: false, status: 500, text: async () => 'secret@example.com' }) });
  await assert.rejects(() => failing.list('things'), (e) => /500/.test(e.message) && !/secret/.test(e.message));
});

test('supabase configuration is checked', () => {
  assert.equal(validSupabaseUrl('https://abc.supabase.co'), true);
  assert.equal(validSupabaseUrl('http://abc.supabase.co'), false, 'plain http is refused for remote hosts');
  assert.equal(validSupabaseUrl('http://localhost:54321'), true);
  assert.equal(validSupabaseUrl('nonsense'), false);
  assert.throws(() => createSupabaseDriver({ url: 'http://abc.supabase.co', key: KEY }), /https/);
  assert.throws(() => createSupabaseDriver({ url: 'https://abc.supabase.co', key: 'short' }), /missing/);
});

test('storeKind: off unless complete, and the file driver is refused in production', () => {
  assert.equal(storeKind({}), null);
  assert.equal(storeKind({ EMPATHERAPY_STORE: 'supabase' }), null, 'incomplete');
  assert.equal(storeKind({ EMPATHERAPY_STORE: 'supabase', SUPABASE_URL: 'https://a.supabase.co', SUPABASE_SERVICE_ROLE_KEY: KEY }), 'supabase');
  assert.equal(storeKind({ EMPATHERAPY_STORE: 'file' }), 'file');
  assert.equal(storeKind({ EMPATHERAPY_STORE: 'file', NODE_ENV: 'production' }), null);
  assert.equal(storeKind({ EMPATHERAPY_STORE: 'file', NODE_ENV: 'production', EMPATHERAPY_ALLOW_FILE_STORE: 'yes' }), 'file');
});

test('shared limiter counts across instances and stores only hashed keys', async () => {
  const store = createMemoryDriver();
  const make = () => createSharedLimiter({ name: 'login', max: 2, windowMs: 60_000, getStore: () => store });
  const a = make(), b = make(); // two "server instances" sharing one store
  const t = 1_000_000;
  assert.equal((await a.check('203.0.113.9', t)).ok, true);
  assert.equal((await b.check('203.0.113.9', t + 1)).ok, true);
  const blocked = await a.check('203.0.113.9', t + 2);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
  assert.equal((await a.check('198.51.100.1', t)).ok, true, 'other addresses are unaffected');
  assert.equal((await a.check('203.0.113.9', t + 61_000)).ok, true, 'the window slides');
  assert.ok(!JSON.stringify(await store.list('ratelimits')).includes('203.0.113.9'), 'no raw address is stored');
  await a.reset('203.0.113.9');
  assert.equal((await b.check('203.0.113.9', t + 62_000)).ok, true);
});

test('shared limiter falls back to memory when storage is off', async () => {
  const l = createSharedLimiter({ name: 'x', max: 1, windowMs: 1000, getStore: () => null });
  assert.equal((await l.check('k', 5)).ok, true);
  assert.equal((await l.check('k', 6)).ok, false);
});

test('sessions can carry an account identity, and v1 tokens still work', async () => {
  const now = 1_700_000_000_000;
  const t2 = await createSession(SECRET, 3600, now, { sub: 'abc-123', role: 'editor' });
  assert.deepEqual(await readSession(t2, SECRET, now + 1000), { sub: 'abc-123', role: 'editor' });
  assert.equal(await verifySession(t2, SECRET, now + 1000), true);
  const parts = t2.split('.');
  parts[4] = 'owner'; // try to promote yourself
  assert.equal(await readSession(parts.join('.'), SECRET, now), null, 'a changed role breaks the signature');
  parts[4] = 'editor'; parts[3] = 'someone-else';
  assert.equal(await readSession(parts.join('.'), SECRET, now), null, 'a changed account breaks the signature');
  assert.equal(await readSession(t2, SECRET, now + 3601_000), null, 'expired');
  const t1 = await createSession(SECRET, 3600, now);
  assert.deepEqual(await readSession(t1, SECRET, now), { sub: 'bootstrap', role: 'owner' });
  await assert.rejects(() => createSession(SECRET, 3600, now, { sub: 'a.b', role: 'owner' }), /identity/);
});

test('accounts: validation, unique emails, sign in, and no hash in what is listed', async () => {
  const store = createMemoryDriver();
  const bad = await createAccount(store, { email: 'nope', name: '', role: 'king', password: 'short' });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['email', 'name', 'password', 'role']);
  const ok = await createAccount(store, { email: 'Sam@Example.com ', name: 'Sam', role: 'owner', password: 'a-long-enough-password' });
  assert.equal(ok.ok, true);
  assert.equal(ok.account.email, 'sam@example.com');
  assert.ok(!('password_hash' in ok.account));
  assert.ok(!JSON.stringify(await listAccounts(store)).includes('scrypt'));
  assert.ok((await createAccount(store, { email: 'SAM@example.com', name: 'Sam 2', role: 'editor', password: 'another-long-password' })).errors.email);
  assert.equal((await authenticate(store, 'sam@example.com', 'a-long-enough-password')).name, 'Sam');
  assert.equal((await authenticate(store, ' SAM@example.com', 'a-long-enough-password')).role, 'owner');
  assert.equal(await authenticate(store, 'sam@example.com', 'wrong-password-here'), null);
  assert.equal(await authenticate(store, 'nobody@example.com', 'a-long-enough-password'), null);
  assert.ok((await store.get('admins', ok.account.id)).last_login_at, 'last sign-in is recorded');
});

test('accounts: roles limit what each person can reach', () => {
  assert.deepEqual(ROLES, ['owner', 'editor', 'reviewer']);
  for (const area of ['applications', 'content', 'accounts', 'retention']) assert.equal(can('owner', area), true);
  assert.equal(can('editor', 'content'), true);
  assert.equal(can('editor', 'applications'), false, 'editors never see applicant details');
  assert.equal(can('editor', 'accounts'), false);
  assert.equal(can('reviewer', 'applications'), true);
  assert.equal(can('reviewer', 'content'), false);
  assert.equal(can('reviewer', 'retention'), false);
  assert.equal(can('stranger', 'content'), false);
  assert.equal(can(undefined, 'content'), false);
});

test('accounts: deactivation locks a person out at once, and the last owner is protected', async () => {
  const store = createMemoryDriver();
  const owner = (await createAccount(store, { email: 'o@example.com', name: 'Owner', role: 'owner', password: 'owner-password-123' })).account;
  const ed = (await createAccount(store, { email: 'e@example.com', name: 'Editor', role: 'editor', password: 'editor-password-123' })).account;
  assert.equal((await activeAccount(store, ed.id)).role, 'editor');
  assert.equal((await updateAccount(store, ed.id, { active: false })).ok, true);
  assert.equal(await activeAccount(store, ed.id), null, 'a live session stops working');
  assert.equal(await authenticate(store, 'e@example.com', 'editor-password-123'), null, 'and so does signing in');
  assert.equal((await updateAccount(store, owner.id, { active: false })).reason, 'last_owner');
  assert.equal((await updateAccount(store, owner.id, { role: 'editor' })).reason, 'last_owner');
  const second = (await createAccount(store, { email: 'o2@example.com', name: 'Owner 2', role: 'owner', password: 'owner2-password-123' })).account;
  assert.equal((await updateAccount(store, owner.id, { role: 'editor' })).ok, true, 'fine once another owner exists');
  assert.equal((await updateAccount(store, second.id, { active: false })).reason, 'last_owner');
  assert.equal((await updateAccount(store, second.id, { password: 'short' })).reason, 'bad_password');
  assert.equal((await updateAccount(store, second.id, { password: 'brand-new-password-1' })).ok, true);
  assert.ok(await authenticate(store, 'o2@example.com', 'brand-new-password-1'));
  assert.equal((await updateAccount(store, 'missing', { active: true })).reason, 'not_found');
  assert.equal((await updateAccount(store, ed.id, { role: 'king' })).reason, 'bad_role');
});

test('retention: declined after 90 days, everything else after a year, counters after 2 days', async () => {
  const store = createMemoryDriver();
  const day = 24 * 60 * 60 * 1000, now = Date.parse('2027-01-01T00:00:00Z');
  const at = (days) => new Date(now - days * day).toISOString();
  const put = (id, status, days) => store.put('applications', { id, status, data: {} }, at(days));
  await put('declined-old', 'declined', RETENTION_DAYS.declined + 1);
  await put('declined-recent', 'declined', RETENTION_DAYS.declined - 1);
  await put('new-old', 'new', RETENTION_DAYS.other + 1);
  await put('approved-recent', 'approved', 200);
  await store.put('ratelimits', { id: 'old-counter', hits: [] }, at(3));
  await store.put('ratelimits', { id: 'new-counter', hits: [] }, at(0));
  const found = await findExpired(store, now);
  assert.deepEqual(found.applications.map((a) => a.id).sort(), ['declined-old', 'new-old']);
  assert.deepEqual(found.counters.map((c) => c.id), ['old-counter']);
  assert.equal((await store.list('applications')).length, 4, 'finding does not delete');
  assert.deepEqual(await purgeExpired(store, now), { applications: 2, counters: 1, audit: 0, enquiries: 0 });
  assert.deepEqual((await store.list('applications')).map((a) => a.id).sort(), ['approved-recent', 'declined-recent']);
});
