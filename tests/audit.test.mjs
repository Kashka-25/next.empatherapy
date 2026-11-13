import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { recordAudit, listAudit, describeSave, ACTION_LABEL, PHOTO_INTENT, AUDIT_DAYS } from '../lib/audit.mjs';
import { findExpired, purgeExpired, RETENTION_DAYS } from '../lib/retention.mjs';
import { can, AREAS } from '../lib/accounts.mjs';

const actor = { id: 'acct-1', name: 'Test Owner', role: 'owner' };

test('audit: entries record who, when and what, newest first', async () => {
  const store = createMemoryDriver();
  await recordAudit(store, actor, 'sign_in', 'acct-1', 'Signed in', '2026-11-01T09:00:00.000Z');
  await recordAudit(store, { id: 'acct-2', name: 'Test Editor', role: 'editor' }, 'alchemist_saved', 'alch-x', 'Published profile Sam Example', '2026-11-02T09:00:00.000Z');
  const list = await listAudit(store);
  assert.deepEqual(list.map((e) => e.actor_name), ['Test Editor', 'Test Owner']);
  assert.equal(list[0].action, 'alchemist_saved');
  assert.equal(list[0].actor_role, 'editor');
  assert.equal(list[0].at, '2026-11-02T09:00:00.000Z');
  assert.equal((await listAudit(store, 1)).length, 1, 'a limit is respected');
});

test('audit: text is cleaned and capped, and a missing store does nothing', async () => {
  const store = createMemoryDriver();
  const e = await recordAudit(store, { id: 'x', name: '<b>Eve</b>\n', role: 'owner' }, 'sign_in', 't', 'a<script>x</script>\n\nb' + 'z'.repeat(500));
  assert.ok(!e.actor_name.includes('<') && !e.summary.includes('<') && !e.summary.includes('\n'));
  assert.ok(e.summary.length <= 300);
  assert.equal(await recordAudit(null, actor, 'sign_in', 't', 's'), null);
  assert.deepEqual(await listAudit(null), []);
  const anon = await recordAudit(store, undefined, 'sign_in', 't', 's');
  assert.equal(anon.actor_name, 'Unknown');
});

test('audit: every action has a plain label, and photo intents have wording', () => {
  for (const k of ['sign_in', 'account_created', 'account_changed', 'password_changed', 'application_updated', 'application_deleted', 'profile_draft_created', 'alchemist_saved', 'alchemist_removed', 'photo_changed', 'modality_saved', 'modality_removed', 'feature_changed', 'retention_purge']) assert.ok(ACTION_LABEL[k], k);
  for (const k of ['save', 'primary', 'left', 'right', 'remove']) assert.ok(PHOTO_INTENT[k], k);
});

test('audit: describeSave says created, published, unpublished or edited', () => {
  const draft = { name: 'Sam', publication_status: 'draft', verification_status: 'pending' };
  const live = { ...draft, publication_status: 'published', verification_status: 'verified' };
  assert.equal(describeSave(null, draft), 'Created profile Sam');
  assert.equal(describeSave(null, live), 'Created and published profile Sam');
  assert.equal(describeSave(draft, live), 'Published profile Sam. Verification: pending to verified');
  assert.equal(describeSave(live, draft), 'Unpublished profile Sam. Verification: verified to pending');
  assert.equal(describeSave(live, { ...live, name: 'Sam' }), 'Edited profile Sam');
  assert.equal(describeSave(live, live, 'modality'), 'Edited modality Sam');
});

test('audit: the log never holds applicant details (summaries are plain statements)', () => {
  // the wording used by the admin actions: ids and staff names only
  for (const s of ['Status set to approved', 'Review notes updated', 'Deleted an application and any unpublished draft made from it']) assert.ok(!/@|http/.test(s));
});

test('audit: entries are kept 12 months, then cleared by the owner clean-up', async () => {
  const store = createMemoryDriver();
  const day = 24 * 60 * 60 * 1000, now = Date.parse('2027-06-01T00:00:00Z');
  const at = (days) => new Date(now - days * day).toISOString();
  assert.equal(RETENTION_DAYS.audit, AUDIT_DAYS);
  await recordAudit(store, actor, 'sign_in', 'a', 'old', at(AUDIT_DAYS + 1));
  await recordAudit(store, actor, 'sign_in', 'a', 'recent', at(AUDIT_DAYS - 1));
  const found = await findExpired(store, now);
  assert.deepEqual(found.audit.map((e) => e.summary), ['old']);
  assert.deepEqual(await purgeExpired(store, now), { applications: 0, counters: 0, audit: 1, enquiries: 0 });
  assert.deepEqual((await listAudit(store)).map((e) => e.summary), ['recent']);
});

test('audit: only owners can read the activity log', () => {
  assert.ok(AREAS.includes('activity'));
  assert.equal(can('owner', 'activity'), true);
  assert.equal(can('editor', 'activity'), false);
  assert.equal(can('reviewer', 'activity'), false);
});
