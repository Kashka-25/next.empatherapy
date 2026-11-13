import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { launchChecks, manualState, setTick, summarise, MANUAL_ITEMS } from '../lib/launch.mjs';

const by = (checks, id) => checks.find((c) => c.id === id);
const goodEnv = {
  EMPATHERAPY_STORE: 'supabase', SUPABASE_URL: 'https://abcdefgh.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40),
  ADMIN_SESSION_SECRET: 'y'.repeat(40), EMPATHERAPY_MAIL: 'resend', RESEND_API_KEY: 're_test_key', MAIL_FROM: 'hello@example.test',
  ADMIN_NOTIFY_EMAIL: 'founder@example.test', SITE_URL: 'https://example.test', EMPATHERAPY_INDEXING: 'on',
};
const real = { id: 'a1', name: 'Real Person', demo: false, publication_status: 'published', verification_status: 'verified', qualifications: [{ title: 'Cert' }], pricing: { sessions: [{ price: '$100' }] } };

test('a bare environment has things to do, and says what', () => {
  const c = launchChecks({ env: {} });
  assert.equal(by(c, 'storage').status, 'todo');
  assert.equal(by(c, 'session-secret').status, 'todo');
  assert.equal(by(c, 'owner').status, 'todo');
  assert.equal(by(c, 'mail').status, 'todo');
  assert.equal(by(c, 'site-url').status, 'todo');
  assert.equal(by(c, 'indexing').status, 'note', 'staying hidden is on purpose, so it is a note, not a failure');
  assert.equal(summarise(c).ok, false);
});

test('a fully set up site is ready on every automatic check', () => {
  const c = launchChecks({ env: goodEnv, accounts: [{ role: 'owner', active: true, two_step: true }], alchemists: [real] });
  assert.deepEqual(c.filter((x) => x.status !== 'ready').map((x) => x.id), []);
  assert.equal(summarise(c).ok, true);
});

test('local files and log-only mail are called out as not for launch', () => {
  const c = launchChecks({ env: { EMPATHERAPY_STORE: 'file', EMPATHERAPY_MAIL: 'log' } });
  assert.equal(by(c, 'storage').status, 'todo');
  assert.match(by(c, 'storage').detail, /local files/);
  assert.equal(by(c, 'mail').status, 'todo');
  assert.match(by(c, 'mail').detail, /never sent/);
});

test('mail needs the provider key and a from address, not only the mode', () => {
  assert.equal(by(launchChecks({ env: { ...goodEnv, RESEND_API_KEY: '' } }), 'mail').status, 'todo');
  assert.equal(by(launchChecks({ env: { ...goodEnv, MAIL_FROM: '' } }), 'mail').status, 'todo');
});

test('the site address must be https, and the secret long enough', () => {
  assert.equal(by(launchChecks({ env: { ...goodEnv, SITE_URL: 'http://example.test' } }), 'site-url').status, 'todo');
  assert.equal(by(launchChecks({ env: { ...goodEnv, ADMIN_SESSION_SECRET: 'short' } }), 'session-secret').status, 'todo');
});

test('owners without two-step are counted; inactive owners are ignored', () => {
  const c = launchChecks({ env: goodEnv, accounts: [{ role: 'owner', active: true, two_step: true }, { role: 'owner', active: true, two_step: false }, { role: 'owner', active: false, two_step: false }, { role: 'editor', active: true }] });
  assert.equal(by(c, 'two-step').status, 'todo');
  assert.match(by(c, 'two-step').detail, /1 of 2/);
});

test('fictional examples and unconfirmed items block, and are named without secrets', () => {
  const demo = { id: 'd1', name: 'Example One', demo: true };
  const unsure = { ...real, id: 'a2', name: 'Unsure Person', qualifications: [{ title: 'Cert', confirm: true }] };
  const c = launchChecks({ env: goodEnv, accounts: [], alchemists: [demo, real, unsure] });
  assert.match(by(c, 'examples').detail, /1 fictional example is/);
  assert.equal(by(c, 'confirm-items').status, 'todo');
  assert.match(by(c, 'confirm-items').detail, /Unsure Person/);
  assert.ok(!by(c, 'confirm-items').detail.includes('Real Person'));
  const everything = JSON.stringify(c);
  for (const secret of [goodEnv.SUPABASE_SERVICE_ROLE_KEY, goodEnv.ADMIN_SESSION_SECRET, goodEnv.RESEND_API_KEY, goodEnv.ADMIN_NOTIFY_EMAIL, goodEnv.MAIL_FROM]) assert.ok(!everything.includes(secret), 'no secret or address leaks into the list');
});

test('no live real profile means not ready', () => {
  const c = launchChecks({ env: goodEnv, alchemists: [{ ...real, publication_status: 'draft' }, { id: 'd', name: 'E', demo: true }] });
  assert.equal(by(c, 'live-profiles').status, 'todo');
});

test('items only a person can check start undone, and an owner can tick and untick them', async () => {
  const store = createMemoryDriver();
  let m = await manualState(store);
  assert.equal(m.length, MANUAL_ITEMS.length);
  assert.ok(m.every((x) => x.status === 'todo'));
  const t = await setTick(store, 'privacy-review', true, 'Cassidy', new Date('2026-11-14T00:00:00Z'));
  assert.equal(t.ok, true);
  m = await manualState(store);
  const done = m.find((x) => x.id === 'privacy-review');
  assert.deepEqual([done.status, done.done_by, done.done_at], ['ready', 'Cassidy', '2026-11-14T00:00:00.000Z']);
  await setTick(store, 'privacy-review', false, 'Cassidy');
  assert.equal((await manualState(store)).find((x) => x.id === 'privacy-review').status, 'todo');
  assert.equal((await setTick(store, 'made-up', true, 'Cassidy')).reason, 'unknown');
});

test('storage off gives all manual items as undone without failing', async () => {
  assert.ok((await manualState(null)).every((x) => x.status === 'todo'));
});
