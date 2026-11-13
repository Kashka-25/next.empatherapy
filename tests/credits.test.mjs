import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { seekerKey, effectiveStatus, awardForEnquiry, undoForEnquiry, syncCredit, voidEntry, ledgerFor, balanceOf, getCreditValue, setCreditValue, economics, COOLING_DAYS, MONTHLY_CAP, CREDITS_PER_BOOKING } from '../lib/credits.mjs';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-13T00:00:00Z');
const enq = (over = {}) => ({ id: `e${Math.random().toString(36).slice(2, 8)}`, alchemist_id: 'alch-jo', alchemist_name: 'Jo Partner', email: 'alex@seeker.test', status: 'booked', referral: { code: 'SAM-4K7Q', referrer_id: 'alch-sam', referrer_name: 'Sam Referrer', percent: 10 }, ...over });

test('a booked first session that used a code earns the referrer one pending credit', async () => {
  const store = createMemoryDriver();
  const e = enq();
  const r = await awardForEnquiry(store, e, now);
  assert.equal(r.awarded, true);
  assert.deepEqual([r.entry.profile_id, r.entry.credits, r.entry.status, r.entry.partner_name], ['alch-sam', CREDITS_PER_BOOKING, 'pending', 'Jo Partner']);
  assert.ok(!JSON.stringify(r.entry).includes('alex@seeker'), 'the ledger never holds the client\'s email');
  assert.match(r.entry.seeker_key, /^[a-f0-9]{24}$/);
});

test('nothing is earned unless it is a booked, referred enquiry', async () => {
  const store = createMemoryDriver();
  assert.equal((await awardForEnquiry(store, enq({ status: 'replied' }), now)).reason, 'not_referred_booking');
  assert.equal((await awardForEnquiry(store, enq({ referral: undefined }), now)).reason, 'not_referred_booking');
  assert.equal((await awardForEnquiry(store, null, now)).reason, 'not_referred_booking');
  assert.equal((await store.list('credit_entries')).length, 0);
});

test('one credit per booked enquiry, however many times it is saved', async () => {
  const store = createMemoryDriver();
  const e = enq();
  await awardForEnquiry(store, e, now);
  assert.equal((await awardForEnquiry(store, e, now)).reason, 'already_counted');
  assert.equal((await syncCredit(store, e, now)).changed, false);
  assert.equal((await store.list('credit_entries')).length, 1);
});

test('only a client\'s first booked session through a referrer counts, matched without storing the email', async () => {
  const store = createMemoryDriver();
  assert.equal((await awardForEnquiry(store, enq({ email: 'alex@seeker.test' }), now)).awarded, true);
  const again = await awardForEnquiry(store, enq({ email: 'ALEX@seeker.test ', alchemist_id: 'alch-other', alchemist_name: 'Other' }), now);
  assert.equal(again.reason, 'not_first_session', 'the same person booking a second time, anywhere in the circle');
  assert.equal((await awardForEnquiry(store, enq({ email: 'someone.else@seeker.test' }), now)).awarded, true, 'a different client is fine');
  const other = enq({ referral: { code: 'JOE-1', referrer_id: 'alch-third', referrer_name: 'Third', percent: 10 } });
  assert.equal((await awardForEnquiry(store, other, now)).awarded, true, 'the same client through a different referrer counts for that referrer');
  assert.notEqual(seekerKey('a@b.test', 'x'), seekerKey('a@b.test', 'y'));
});

test('a monthly cap bounds what a referrer can earn', async () => {
  const store = createMemoryDriver();
  for (let i = 0; i < MONTHLY_CAP; i++) assert.equal((await awardForEnquiry(store, enq({ email: `c${i}@seeker.test` }), now)).awarded, true);
  assert.equal((await awardForEnquiry(store, enq({ email: 'one.more@seeker.test' }), now)).reason, 'monthly_cap');
  const nextMonth = new Date('2026-12-02T00:00:00Z');
  assert.equal((await awardForEnquiry(store, enq({ email: 'one.more@seeker.test' }), nextMonth)).awarded, true, 'a new month starts fresh');
});

test('credits are pending through the cooling-off period, then confirmed', () => {
  const entry = { status: 'pending', created_at: now.toISOString(), credits: 1, profile_id: 'alch-sam' };
  assert.equal(effectiveStatus(entry, now.getTime()), 'pending');
  assert.equal(effectiveStatus(entry, now.getTime() + (COOLING_DAYS - 1) * DAY), 'pending');
  assert.equal(effectiveStatus(entry, now.getTime() + COOLING_DAYS * DAY), 'confirmed');
  assert.equal(effectiveStatus({ ...entry, status: 'voided' }, now.getTime() + 99 * DAY), 'voided');
  const entries = [entry, { ...entry, created_at: new Date(now - 20 * DAY).toISOString() }, { ...entry, status: 'voided' }, { ...entry, profile_id: 'alch-other' }];
  assert.deepEqual(balanceOf(entries, 'alch-sam', now.getTime()), { confirmed: 1, pending: 1, voided: 1 });
  assert.deepEqual(balanceOf([], 'alch-sam'), { confirmed: 0, pending: 0, voided: 0 });
});

test('undoing a booking undoes its pending credit, and booking again brings it back', async () => {
  const store = createMemoryDriver();
  const e = enq();
  await awardForEnquiry(store, e, now);
  const undone = await syncCredit(store, { ...e, status: 'replied' }, new Date(now.getTime() + DAY));
  assert.equal(undone.changed, true);
  assert.equal((await store.list('credit_entries'))[0].status, 'voided');
  assert.equal(balanceOf(await store.list('credit_entries'), 'alch-sam', now.getTime()).pending, 0);
  const back = await syncCredit(store, e, new Date(now.getTime() + 2 * DAY));
  assert.equal(back.changed, true);
  assert.equal((await store.list('credit_entries')).length, 1, 'the same entry, not a second credit');
  assert.equal((await store.list('credit_entries'))[0].status, 'pending');
});

test('a confirmed credit is not undone by changing a booking, and a team void is final', async () => {
  const store = createMemoryDriver();
  const e = enq();
  const { entry } = await awardForEnquiry(store, e, new Date(now.getTime() - 20 * DAY));
  assert.equal((await undoForEnquiry(store, { ...e, status: 'closed' }, now)).undone, false, 'already confirmed: only the team can reverse it');
  assert.equal((await syncCredit(store, { ...e, status: 'closed' }, now)).changed, false);
  assert.equal((await voidEntry(store, entry.id, { reason: 'fraud', now })).ok, true);
  assert.equal((await voidEntry(store, entry.id)).reason, 'already_voided');
  assert.equal((await voidEntry(store, 'missing')).reason, 'not_found');
  assert.equal((await awardForEnquiry(store, e, now)).reason, 'already_counted', 'booking again does not revive a credit the team voided');
  assert.equal((await store.list('credit_entries'))[0].void_reason, 'fraud');
});

test('a referrer sees only their own ledger', async () => {
  const store = createMemoryDriver();
  await awardForEnquiry(store, enq({ email: 'a@seeker.test' }), now);
  await awardForEnquiry(store, enq({ email: 'b@seeker.test', referral: { code: 'X', referrer_id: 'alch-third', referrer_name: 'T', percent: 5 } }), now);
  assert.equal((await ledgerFor(store, 'alch-sam')).length, 1);
  assert.equal((await ledgerFor(store, 'alch-nobody')).length, 0);
});

test('the value of a credit is bounded, stored, and unset means unset', async () => {
  const store = createMemoryDriver();
  assert.equal(await getCreditValue(store), 0);
  assert.equal(await getCreditValue(null), 0);
  assert.equal((await setCreditValue(store, 8)).value, 8);
  assert.equal(await getCreditValue(store), 8);
  for (const bad of [-1, 101, 'lots', NaN]) assert.equal((await setCreditValue(store, bad)).reason, 'bad_value');
  assert.equal(await getCreditValue(store), 8);
});

test('economics: what the arrangement could mean for Empatherapy, as an illustration', () => {
  const booked = [enq({ status: 'booked', first_session_fee: 100 }), enq({ status: 'booked', first_session_fee: 80 }), enq({ status: 'booked' }), enq({ status: 'replied', first_session_fee: 999 }), enq({ referral: undefined, status: 'booked', first_session_fee: 500 })];
  const entries = [{ status: 'pending', created_at: now.toISOString(), credits: 1 }, { status: 'pending', created_at: new Date(now - 20 * DAY).toISOString(), credits: 1 }, { status: 'voided', created_at: now.toISOString(), credits: 1 }];
  const e = economics(booked, entries, { rate: 0.12, creditValue: 5, now: now.getTime() });
  assert.deepEqual([e.referredBookings, e.sessions, e.fee, e.credits, e.creditCost, e.net, e.confirmed], [2, 180, 21.6, 2, 10, 11.6, 1]);
  const unset = economics(booked, entries, { now: now.getTime() });
  assert.deepEqual([unset.fee, unset.creditCost, unset.net], [0, 0, 0], 'with no rate and no value there is no figure');
});
