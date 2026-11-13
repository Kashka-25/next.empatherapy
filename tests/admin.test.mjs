import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMemoryDriver, createFileDriver, getStore, storeEnabled } from '../lib/store/index.mjs';
import { createSession, verifySession, MIN_SECRET_LENGTH } from '../lib/session.mjs';
import { hashPassword, verifyPassword } from '../lib/password.mjs';
import { createLimiter, clientKey } from '../lib/ratelimit.mjs';
import { submitApplication, listApplications, reviewApplication, removeApplication, MAX_APPLICATIONS } from '../lib/applications.mjs';
import { validateFeature, loadFeatures, currentFeatures, seedFeatures } from '../lib/features.mjs';
import { featuredModalities } from '../data/features.mjs';

const SECRET = 'x'.repeat(MIN_SECRET_LENGTH);
const good = {
  name: 'Sam Example', email: 'sam@example.com', introduction: 'I offer gentle breath and movement sessions for people who feel stressed.',
  personal_story: 'I found this work after a long period of burnout and wanted to share what helped me recover, slowly and kindly.',
  modalities: 'Breathwork', qualifications: 'none yet', location: 'Sydney', delivery_format: 'both', pricing: 'to be discussed', consent: true,
};

/* ---------- store: every driver must behave the same ---------- */
async function driverContract(driver) {
  const a = await driver.put('things', { name: 'a' });
  assert.ok(a.id && a.created_at && a.updated_at);
  assert.deepEqual((await driver.get('things', a.id)).name, 'a');
  const b = await driver.put('things', { id: a.id, name: 'a2' });
  assert.equal(b.id, a.id);
  assert.equal(b.created_at, a.created_at, 'created_at is kept on update');
  assert.equal((await driver.list('things')).length, 1);
  assert.equal(await driver.get('things', 'missing'), null);
  assert.equal(await driver.remove('things', a.id), true);
  assert.equal(await driver.remove('things', a.id), false);
  await assert.rejects(() => driver.list('../etc'), /Invalid collection/);
  await assert.rejects(() => driver.put('A B', {}), /Invalid collection/);
}

test('memory driver follows the store contract', () => driverContract(createMemoryDriver()));

test('file driver follows the store contract, survives restarts and parallel writes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emp-store-'));
  try {
    await driverContract(createFileDriver(dir));
    const d = createFileDriver(dir);
    await Promise.all(Array.from({ length: 25 }, (_, i) => d.put('items', { name: `n${i}` })));
    assert.equal((await createFileDriver(dir).list('items')).length, 25, 'no write was lost');
    assert.deepEqual((await readdir(dir)).filter((f) => f.endsWith('.tmp')), [], 'no temp files left behind');
    JSON.parse(await readFile(path.join(dir, 'items.json'), 'utf8'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('storage is off unless switched on', () => {
  assert.equal(storeEnabled({}), false);
  assert.equal(getStore({}), null);
  assert.equal(storeEnabled({ EMPATHERAPY_STORE: 'file' }), true);
});

/* ---------- sessions ---------- */
test('a session verifies, expires, and cannot be forged or tampered with', async () => {
  const now = 1_700_000_000_000;
  const token = await createSession(SECRET, 3600, now);
  assert.equal(await verifySession(token, SECRET, now + 1000), true);
  assert.equal(await verifySession(token, SECRET, now + 3601 * 1000), false, 'expired');
  assert.equal(await verifySession(token, 'y'.repeat(40), now), false, 'wrong secret');
  const [v, exp, nonce, sig] = token.split('.');
  assert.equal(await verifySession([v, Number(exp) + 99999, nonce, sig].join('.'), SECRET, now), false, 'extended expiry');
  assert.equal(await verifySession([v, exp, nonce, sig.slice(0, -2) + 'AA'].join('.'), SECRET, now), false, 'bad signature');
  for (const bad of ['', 'nope', 'v1.1.2', null, undefined, 'v2.1.2.3', 'a'.repeat(500)]) assert.equal(await verifySession(bad, SECRET, now), false);
  assert.equal(await verifySession(token, '', now), false);
});

test('weak session secrets are refused', async () => {
  await assert.rejects(() => createSession('short'), /at least/);
  assert.equal(await verifySession('v1.9999999999.a.b', 'short'), false);
});

test('two sessions are never the same token', async () => {
  assert.notEqual(await createSession(SECRET), await createSession(SECRET));
});

/* ---------- password ---------- */
test('passwords hash with a random salt and verify only when correct', async () => {
  const h1 = await hashPassword('correct horse battery');
  const h2 = await hashPassword('correct horse battery');
  assert.notEqual(h1, h2, 'salted');
  assert.match(h1, /^scrypt:/);
  assert.equal(await verifyPassword('correct horse battery', h1), true);
  assert.equal(await verifyPassword('correct horse batterz', h1), false);
  for (const bad of ['', undefined, 'plain-text-not-a-hash', 'scrypt:1:2:3:x:y']) assert.equal(await verifyPassword('correct horse battery', bad), false);
  await assert.rejects(() => hashPassword('short'), /at least 12/);
});

/* ---------- rate limit ---------- */
test('rate limiter blocks after the limit, then recovers', () => {
  const l = createLimiter({ max: 3, windowMs: 1000 });
  assert.equal(l.check('ip', 0).ok, true);
  assert.equal(l.check('ip', 10).ok, true);
  assert.equal(l.check('ip', 20).ok, true);
  const blocked = l.check('ip', 30);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
  assert.equal(l.check('other', 30).ok, true, 'keys are independent');
  assert.equal(l.check('ip', 1500).ok, true, 'window slides');
});

test('client key comes from proxy headers', () => {
  assert.equal(clientKey(new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4');
  assert.equal(clientKey(new Headers()), 'unknown');
});

/* ---------- applications ---------- */
test('applications: submit, review and delete', async () => {
  const store = createMemoryDriver();
  const bad = await submitApplication(store, { ...good, email: 'nope' });
  assert.equal(bad.ok, false); assert.equal(bad.reason, 'invalid'); assert.ok(bad.errors.email);
  assert.equal((await listApplications(store)).length, 0, 'invalid applications are not stored');

  const ok = await submitApplication(store, good, new Date('2026-11-12T00:00:00Z'));
  assert.equal(ok.ok, true);
  const [rec] = await listApplications(store);
  assert.equal(rec.status, 'new'); assert.equal(rec.consent_at, '2026-11-12T00:00:00.000Z'); assert.equal(rec.data.name, 'Sam Example');

  assert.equal((await reviewApplication(store, ok.id, { status: 'bogus' })).reason, 'bad_status');
  assert.equal((await reviewApplication(store, 'nope', { status: 'approved' })).reason, 'not_found');
  const r = await reviewApplication(store, ok.id, { status: 'in_review', notes: 'Ask about insurance\u0000' });
  assert.equal(r.record.status, 'in_review'); assert.equal(r.record.review_notes, 'Ask about insurance');
  assert.equal(await removeApplication(store, ok.id), true);
  assert.equal((await listApplications(store)).length, 0);
});

test('applications: the store is capped so spam cannot fill it', async () => {
  const store = createMemoryDriver();
  for (let i = 0; i < MAX_APPLICATIONS; i++) await store.put('applications', { status: 'new', data: {} });
  assert.equal((await submitApplication(store, good)).reason, 'full');
});

test('applications: oversized and tag-laden input is sanitised', async () => {
  const store = createMemoryDriver();
  const r = await submitApplication(store, { ...good, name: '<script>alert(1)</script>Sam', introduction: good.introduction + 'x'.repeat(5000) });
  assert.equal(r.ok, true);
  const [rec] = await listApplications(store);
  assert.ok(!/[<>]/.test(rec.data.name));
  assert.ok(rec.data.introduction.length <= 1200);
});

/* ---------- features ---------- */
const feat = { modality_id: 'mod-breathwork', feature_start: '2026-12-01', feature_end: '2026-12-07', featured_position: 1, editorial_introduction: 'A gentle look at breath.', publication_status: 'published' };

test('feature validation: required fields, dates and position', () => {
  assert.equal(validateFeature(feat).valid, true);
  const bad = validateFeature({ modality_id: 'x', feature_start: '2026-13-40', feature_end: 'nope', featured_position: 9, editorial_introduction: 'hi' });
  for (const k of ['modality_id', 'feature_start', 'feature_end', 'featured_position', 'editorial_introduction']) assert.ok(bad.errors[k], k);
  assert.ok(validateFeature({ ...feat, feature_end: '2026-11-01' }).errors.feature_end);
});

test('feature validation: at most three per day, no repeated position or modality', () => {
  const existing = [
    { id: 'a', ...feat, featured_position: 1, modality_id: 'mod-nature' },
    { id: 'b', ...feat, featured_position: 2, modality_id: 'mod-sound' },
    { id: 'c', ...feat, featured_position: 3, modality_id: 'mod-ifs' },
  ];
  assert.ok(validateFeature({ ...feat, featured_position: 1 }, existing).errors.featured_position, 'position taken');
  assert.ok(validateFeature({ ...feat, featured_position: 2, modality_id: 'mod-nature' }, existing).errors.featured_position);
  assert.equal(validateFeature({ ...feat, feature_start: '2026-12-08', feature_end: '2026-12-14' }, existing).valid, true, 'a different week is fine');
  assert.equal(validateFeature({ ...feat, publication_status: 'draft' }, existing).valid, true, 'drafts are not checked for clashes');
  assert.equal(validateFeature({ ...feat, id: 'a', featured_position: 1, modality_id: 'mod-nature' }, existing).valid, true, 'editing itself is fine');
  const dup = [{ id: 'a', ...feat, featured_position: 2 }];
  assert.ok(validateFeature({ ...feat, featured_position: 1 }, dup).errors.modality_id, 'same modality twice');
});

test('features: the sample schedule is used until an admin sets one up', async () => {
  assert.deepEqual(await loadFeatures(null), featuredModalities);
  const store = createMemoryDriver();
  assert.deepEqual(await loadFeatures(store), featuredModalities);
  assert.equal(await seedFeatures(store), featuredModalities.length);
  assert.equal(await seedFeatures(store), 0, 'seeding twice does nothing');
  await store.put('features', { ...feat, id: 'only', publication_status: 'published' });
  assert.ok((await loadFeatures(store)).length > 0);
  const week = await currentFeatures('2026-11-10', store);
  assert.ok(week.length >= 1 && week.length <= 3);
});
