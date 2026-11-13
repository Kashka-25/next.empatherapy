import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { createAccount, updateAccount, hasPortal, can, safeAccount } from '../lib/accounts.mjs';
import { propose, approve, reject, changedKeys, editorValues, describeChanges, LOCKED_KEYS, CHECK_KEYS } from '../lib/proposals.mjs';
import { alchemistToForm, validateAlchemist } from '../lib/admin-content.mjs';
import { publicPhotos, waitingPhotos, approvePhoto, isPublicPhoto, isApproved } from '../lib/photos.mjs';
import { toPublic } from '../lib/content-store.mjs';
import { submitEnquiry, updateEnquiry } from '../lib/enquiries.mjs';
import { alchemists, } from '../data/alchemists.mjs';
import { modalities } from '../data/modalities.mjs';

const ctx = { alchemists, modalities };
const founder = alchemists.find((a) => a.verification_status === 'founder');
const example = alchemists.find((a) => a.demo);
const me = { id: 'acct-1', name: 'Cassidy Dugan' };

/* ---------- logins for Alchemists ---------- */
test('an Alchemist login belongs to exactly one real profile', async () => {
  const store = createMemoryDriver();
  const base = { email: 'sam@example.com', name: 'Sam', role: 'alchemist', password: 'a-long-enough-password' };
  const profiles = [{ id: 'alch-sam', demo: false }, { id: 'alch-mira', demo: true }];
  assert.ok((await createAccount(store, base, { profiles })).errors.profile_id, 'a profile is required');
  assert.ok((await createAccount(store, { ...base, profile_id: 'alch-nobody' }, { profiles })).errors.profile_id, 'it must exist');
  assert.match((await createAccount(store, { ...base, profile_id: 'alch-mira' }, { profiles })).errors.profile_id, /Fictional/, 'never a fictional example');
  const ok = await createAccount(store, { ...base, profile_id: 'alch-sam' }, { profiles });
  assert.equal(ok.ok, true);
  assert.equal(ok.account.profile_id, 'alch-sam');
  assert.ok((await createAccount(store, { ...base, email: 'other@example.com', profile_id: 'alch-sam' }, { profiles })).errors.profile_id, 'one login per profile');
  assert.equal(await hasPortal(store, 'alch-sam'), true);
  assert.equal(await hasPortal(store, 'alch-other'), false);
});

test('only the Alchemist role carries a profile, and roles cannot be swapped into or out of it', async () => {
  const store = createMemoryDriver();
  const profiles = [{ id: 'alch-sam', demo: false }];
  const editor = (await createAccount(store, { email: 'e@example.com', name: 'Ed', role: 'editor', password: 'editor-password-123', profile_id: 'alch-sam' }, { profiles })).account;
  assert.equal('profile_id' in editor, false, 'a profile id on a team login is ignored');
  assert.equal((await updateAccount(store, editor.id, { role: 'alchemist' })).reason, 'bad_role', 'a team login cannot be made an Alchemist here');
  const al = (await createAccount(store, { email: 'a@example.com', name: 'Al', role: 'alchemist', password: 'alchemist-password-12', profile_id: 'alch-sam' }, { profiles })).account;
  assert.equal((await updateAccount(store, al.id, { role: 'owner' })).reason, 'bad_role', 'and an Alchemist cannot be promoted to the team');
  assert.equal((await updateAccount(store, al.id, { active: false })).ok, true, 'but a login can be switched off');
  assert.equal(await hasPortal(store, 'alch-sam'), false, 'a switched-off login does not count');
});

test('the portal belongs to Alchemists alone', () => {
  assert.equal(can('alchemist', 'portal'), true);
  for (const area of ['applications', 'content', 'accounts', 'retention', 'activity', 'enquiries']) assert.equal(can('alchemist', area), false);
  assert.equal(can('owner', 'portal'), false);
  assert.ok(!('password_hash' in safeAccount({ password_hash: 'x', profile_id: 'a' })));
  assert.equal(safeAccount({ password_hash: 'x', profile_id: 'a' }).profile_id, 'a');
});

/* ---------- proposing changes ---------- */
const formOf = (a, over = {}) => ({ ...alchemistToForm(a), ...over });

test('a proposal keeps only what differs, and lists what changed', () => {
  const r = propose(founder, formOf(founder, { tagline: 'A new line, in my own words.' }), ctx, me);
  assert.equal(r.ok, true);
  assert.deepEqual(r.pending.changed, ['tagline']);
  assert.deepEqual(Object.keys(r.pending.form), ['tagline']);
  assert.equal(r.pending.by_name, 'Cassidy Dugan');
  assert.equal(propose(founder, formOf(founder), ctx, me).same, true, 'sending nothing new says so');
});

test('what is not theirs to change is ignored, whatever is sent', () => {
  const sneaky = formOf(founder, { tagline: 'New line for the test.', publication_status: 'draft', verification_status: 'pending', featured_status: '', featured_rank: '9' });
  const r = propose(founder, sneaky, ctx, me);
  assert.deepEqual(r.pending.changed, ['tagline'], 'visibility, verification and featuring never appear');
  for (const k of LOCKED_KEYS) assert.equal(k in r.pending.form, false);
  // a verified profile with everything checked (no "confirm" marks left)
  const strip = (xs) => xs.map(({ confirm, ...x }) => x);
  const verified = { ...founder, verification_status: 'verified', qualifications: strip(founder.qualifications), experience: strip(founder.experience), pricing: { ...founder.pricing, sessions: strip(founder.pricing.sessions) }, modalities: founder.modalities.map((m) => (m.basis === 'confirm' ? { ...m, basis: 'formal' } : m)) };
  const asVerified = propose(verified, formOf(verified, { verification_status: 'founder', tagline: 'Another line here.' }), ctx, me);
  assert.deepEqual(asVerified.pending.changed, ['tagline'], 'nobody can make themselves the founder');
});

test('a proposal must still pass every rule, including completeness for a published profile', () => {
  const r = propose(founder, formOf(founder, { personal_story: '', safety_information: '' }), ctx, me);
  assert.equal(r.ok, false);
  assert.ok(r.errors.personal_story && r.errors.safety_information, 'cannot blank out what a public profile needs');
  assert.ok(propose(founder, formOf(founder, { short_bio: 'Too short' }), ctx, me).errors.short_bio);
});

test('what the Alchemist sees in their editor is the live profile with their own proposal laid over it', () => {
  const r = propose(founder, formOf(founder, { tagline: 'My proposed tagline here.' }), ctx, me);
  const withPending = { ...founder, pending: r.pending };
  assert.equal(editorValues(withPending).tagline, 'My proposed tagline here.');
  assert.equal(editorValues(founder).tagline, founder.tagline);
  assert.equal(withPending.tagline, founder.tagline, 'the live profile itself is untouched');
});

/* ---------- the team's decision ---------- */
test('approving applies only the proposed fields to the profile as it is now, and drops the proposal', () => {
  const proposal = propose(founder, formOf(founder, { tagline: 'Proposed line, nicely put.' }), ctx, me).pending;
  // meanwhile the team changed something else
  const live = { ...founder, short_bio: 'The team changed the short bio while the proposal was waiting here.', pending: proposal };
  const r = approve(live, ctx, { name: 'Reviewer' });
  assert.equal(r.ok, true);
  assert.equal(r.record.tagline, 'Proposed line, nicely put.');
  assert.equal(r.record.short_bio, 'The team changed the short bio while the proposal was waiting here.', 'the team\'s own edit survives');
  assert.equal('pending' in r.record, false);
  assert.equal(r.record.last_review.status, 'approved');
  assert.equal(r.record.verification_status, founder.verification_status);
  assert.equal(r.record.publication_status, founder.publication_status);
});

test('approving re-checks the rules, so a proposal that has become invalid cannot slip through', () => {
  const proposal = propose(founder, formOf(founder, { tagline: 'Proposed line, nicely put.' }), ctx, me).pending;
  const broken = approve({ ...founder, safety_information: '', pending: proposal }, ctx, { name: 'Reviewer' });
  assert.equal(broken.ok, false);
  assert.equal(broken.reason, 'invalid');
  assert.equal(approve(founder, ctx, { name: 'R' }).reason, 'nothing_waiting');
});

test('not approving keeps the live profile and leaves a kind note for the Alchemist', () => {
  const proposal = propose(founder, formOf(founder, { tagline: 'Proposed line, nicely put.' }), ctx, me).pending;
  const r = reject({ ...founder, pending: proposal }, '<b>Please</b>\n  soften the claim', { name: 'Reviewer' });
  assert.equal(r.ok, true);
  assert.equal(r.record.tagline, founder.tagline);
  assert.equal('pending' in r.record, false);
  assert.deepEqual([r.record.last_review.status, r.record.last_review.note], ['rejected', 'b Please /b soften the claim']);
  assert.equal(reject(founder, 'x', { name: 'R' }).reason, 'nothing_waiting');
});

test('the team sees each change with old and new, and which ones deserve a second look', () => {
  const r = propose(founder, formOf(founder, { tagline: 'A different tagline entirely.', safety_information: `${founder.safety_information} Extra words about safety.` }), ctx, me);
  const rows = describeChanges({ ...founder, pending: r.pending });
  assert.deepEqual(rows.map((x) => x.key).sort(), ['safety_information', 'tagline']);
  const safety = rows.find((x) => x.key === 'safety_information');
  assert.equal(safety.check, true);
  assert.equal(rows.find((x) => x.key === 'tagline').check, false);
  assert.equal(rows.find((x) => x.key === 'tagline').before, founder.tagline);
  assert.ok(CHECK_KEYS.includes('qualifications') && CHECK_KEYS.includes('pricing_sessions'));
  assert.deepEqual(describeChanges(founder), []);
  assert.deepEqual(changedKeys({ a: ['x', 'y'], b: '1' }, { a: ['y', 'x'], b: '2' }), ['b'], 'order of a list does not count as a change');
});

test('a proposal does not break the round trip of a profile that has none', () => {
  for (const a of alchemists) assert.deepEqual(validateAlchemist(alchemistToForm(a), a, ctx).errors, {}, a.name);
});

/* ---------- photos an Alchemist adds wait for review ---------- */
test('photos added by an Alchemist are hidden from everyone else until approved', () => {
  const photos = [{ id: 'old', alt: 'an older photo' }, { id: 'new', alt: 'a new photo', approved: false }];
  const a = { photos };
  assert.deepEqual(publicPhotos(a).map((p) => p.id), ['old'], 'photos from before the rule count as approved');
  assert.deepEqual(waitingPhotos(a).map((p) => p.id), ['new']);
  assert.equal(isApproved(photos[0]), true);
  assert.equal(isPublicPhoto([a], 'new'), false, 'a waiting photo is not served publicly');
  assert.equal(isPublicPhoto([a], 'old'), true);
  const done = approvePhoto(photos, 'new');
  assert.equal('approved' in done.photos[1], false);
  assert.equal(publicPhotos({ photos: done.photos }).length, 2);
  assert.equal(approvePhoto(photos, 'missing').reason, 'not_found');
});

test('public profiles never carry what is private: waiting changes, review notes, application notes, unapproved photos', () => {
  const a = { name: 'Sam', pending: { form: { tagline: 'unreviewed words' } }, last_review: { note: 'private' }, source: { pricing_as_written: 'secret' }, photos: [{ id: 'a', alt: 'x' }, { id: 'b', alt: 'y', approved: false }] };
  const p = toPublic(a);
  assert.deepEqual(Object.keys(p).sort(), ['name', 'photos']);
  assert.deepEqual(p.photos.map((x) => x.id), ['a']);
  assert.ok(!JSON.stringify(p).includes('unreviewed') && !JSON.stringify(p).includes('private') && !JSON.stringify(p).includes('secret'));
  assert.deepEqual(toPublic({ name: 'No photos' }), { name: 'No photos' });
});

/* ---------- an Alchemist's note on an enquiry ---------- */
test('an Alchemist can keep their own note and report an outcome without touching the team\'s note', async () => {
  const store = createMemoryDriver();
  const live = { id: 'alch-sam', name: 'Sam Example', demo: false, publication_status: 'published', verification_status: 'verified' };
  const { id } = await submitEnquiry(store, live, { name: 'Alex Seeker', email: 'alex@seeker.test', message: 'I would love to hear how you work with breath.', consent: true });
  await updateEnquiry(store, id, { note: 'team note' });
  const r = await updateEnquiry(store, id, { status: 'booked', fee: 80, alchemistNote: '<b>Booked</b> for Tuesday' });
  assert.equal(r.record.note, 'team note');
  assert.equal(r.record.alchemist_note, 'bBooked/b for Tuesday');
  assert.equal(r.record.first_session_fee, 80);
});
