import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { getOffer, setOffer, acceptingAlchemists, availableCredits, requestSpend, respondToSpend, voidSpend, spendsFor, removeProfileSpending, isExpired, EXPIRY_DAYS } from '../lib/credit-spend.mjs';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-12-01T00:00:00Z');
const live = (id, name, over = {}) => ({ id, name, demo: false, publication_status: 'published', verification_status: 'verified', ...over });
const sam = live('alch-sam', 'Sam Referrer');
const jo = live('alch-jo', 'Jo Partner');
const alchemists = [sam, jo, live('alch-demo', 'Example', { demo: true })];

async function earn(store, profileId, n, createdAt = '2026-10-01T00:00:00Z') {
  for (let i = 0; i < n; i++) await store.put('credit_entries', { profile_id: profileId, enquiry_id: `e${profileId}${i}${createdAt}`, partner_id: 'x', partner_name: 'X', seeker_key: `k${i}${createdAt}`, credits: 1, status: 'pending' }, createdAt);
}

test('an Alchemist does not accept credits until they say so', async () => {
  const store = createMemoryDriver();
  assert.equal((await getOffer(store, 'alch-jo')).accepts, false);
  assert.equal((await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 })).ok, true);
  assert.deepEqual((await acceptingAlchemists(store, alchemists)).map((x) => x.alchemist.id), ['alch-jo']);
  await setOffer(store, jo, { accepts: false, value: 10, max_credits: 2 });
  assert.equal((await acceptingAlchemists(store, alchemists)).length, 0, 'paused');
});

test('opt-in values are checked, and unapproved or example profiles cannot opt in', async () => {
  const store = createMemoryDriver();
  assert.equal((await setOffer(store, jo, { accepts: true, value: 0, max_credits: 2 })).reason, 'bad_value');
  assert.equal((await setOffer(store, jo, { accepts: true, value: 500, max_credits: 2 })).reason, 'bad_value');
  assert.equal((await setOffer(store, jo, { accepts: true, value: 10, max_credits: 9 })).reason, 'bad_max');
  assert.equal((await setOffer(store, jo, { accepts: true, value: 10, max_credits: 1.5 })).reason, 'bad_max');
  assert.equal((await setOffer(store, alchemists[2], { accepts: true, value: 10, max_credits: 2 })).reason, 'not_approved');
});

test('only confirmed credits can be spent, after the cooling-off period', async () => {
  const store = createMemoryDriver();
  await earn(store, 'alch-sam', 2, '2026-11-25T00:00:00Z'); // 6 days old: still pending
  assert.equal((await availableCredits(store, 'alch-sam', now.getTime())).available, 0);
  await earn(store, 'alch-sam', 3, '2026-10-01T00:00:00Z');
  assert.equal((await availableCredits(store, 'alch-sam', now.getTime())).available, 3);
});

test('asking to spend holds the credits and needs an accepting partner', async () => {
  const store = createMemoryDriver();
  await earn(store, 'alch-sam', 3);
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 1 }, now)).reason, 'not_accepting');
  await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 });
  const r = await requestSpend(store, { spender: sam, partner: jo, credits: 2 }, now);
  assert.equal(r.ok, true);
  assert.deepEqual([r.spend.discount, r.spend.status, r.spend.value_each], [20, 'requested', 10]);
  const a = await availableCredits(store, 'alch-sam', now.getTime());
  assert.deepEqual([a.available, a.held], [1, 2]);
});

test('the rules: not yourself, whole credits, within their limit, not more than you have, one open request each', async () => {
  const store = createMemoryDriver();
  await earn(store, 'alch-sam', 3);
  await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 });
  await setOffer(store, sam, { accepts: true, value: 10, max_credits: 2 });
  assert.equal((await requestSpend(store, { spender: sam, partner: sam, credits: 1 }, now)).reason, 'self');
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 0 }, now)).reason, 'bad_credits');
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 1.5 }, now)).reason, 'bad_credits');
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 3 }, now)).reason, 'over_max');
  assert.equal((await requestSpend(store, { spender: alchemists[2], partner: jo, credits: 1 }, now)).reason, 'not_approved');
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 2 }, now)).ok, true);
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 1 }, now)).reason, 'already_open');
  const solo = createMemoryDriver();
  await setOffer(solo, jo, { accepts: true, value: 10, max_credits: 2 });
  assert.equal((await requestSpend(solo, { spender: sam, partner: jo, credits: 1 }, now)).reason, 'not_enough');
});

test('the same credits cannot be promised twice', async () => {
  const store = createMemoryDriver();
  const kit = live('alch-kit', 'Kit Other');
  await earn(store, 'alch-sam', 2);
  await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 });
  await setOffer(store, kit, { accepts: true, value: 10, max_credits: 2 });
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 2 }, now)).ok, true);
  assert.equal((await requestSpend(store, { spender: sam, partner: kit, credits: 1 }, now)).reason, 'not_enough');
});

test('using it spends the credits; declining or withdrawing releases them; only the right person can answer', async () => {
  const store = createMemoryDriver();
  await earn(store, 'alch-sam', 4);
  await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 });
  const first = (await requestSpend(store, { spender: sam, partner: jo, credits: 2 }, now)).spend;
  assert.equal((await respondToSpend(store, first.id, { intent: 'used', byProfileId: 'alch-sam' }, now)).reason, 'not_yours', 'the spender cannot mark it used');
  assert.equal((await respondToSpend(store, first.id, { intent: 'withdraw', byProfileId: 'alch-jo' }, now)).reason, 'not_yours', 'the partner cannot withdraw for them');
  const used = await respondToSpend(store, first.id, { intent: 'used', byProfileId: 'alch-jo' }, now);
  assert.equal(used.spend.status, 'used');
  assert.equal((await respondToSpend(store, first.id, { intent: 'decline', byProfileId: 'alch-jo' }, now)).reason, 'not_open');
  let a = await availableCredits(store, 'alch-sam', now.getTime());
  assert.deepEqual([a.available, a.used], [2, 2]);
  const second = (await requestSpend(store, { spender: sam, partner: jo, credits: 1 }, now)).spend;
  assert.equal((await respondToSpend(store, second.id, { intent: 'decline', byProfileId: 'alch-jo' }, now)).spend.status, 'declined');
  assert.equal((await availableCredits(store, 'alch-sam', now.getTime())).available, 2, 'released');
  const third = (await requestSpend(store, { spender: sam, partner: jo, credits: 1 }, now)).spend;
  assert.equal((await respondToSpend(store, third.id, { intent: 'withdraw', byProfileId: 'alch-sam' }, now)).spend.status, 'withdrawn');
  assert.equal((await availableCredits(store, 'alch-sam', now.getTime())).available, 2);
});

test('credits expire after a year, oldest first', async () => {
  const store = createMemoryDriver();
  const old = '2025-10-01T00:00:00Z';
  assert.equal(isExpired({ created_at: old }, now.getTime()), true);
  assert.equal(EXPIRY_DAYS, 365);
  await earn(store, 'alch-sam', 2, old);
  await earn(store, 'alch-sam', 1, '2026-10-01T00:00:00Z');
  const a = await availableCredits(store, 'alch-sam', now.getTime());
  assert.deepEqual([a.available, a.expired], [1, 2]);
  await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 });
  assert.equal((await requestSpend(store, { spender: sam, partner: jo, credits: 2 }, now)).reason, 'not_enough');
  const ok = await requestSpend(store, { spender: sam, partner: jo, credits: 1 }, now);
  assert.equal(ok.ok, true);
  await respondToSpend(store, ok.spend.id, { intent: 'used', byProfileId: 'alch-jo' }, now);
  const after = await availableCredits(store, 'alch-sam', now.getTime());
  assert.deepEqual([after.available, after.used], [0, 1], 'spending uses the oldest first, so the credit that expired stays expired and the fresh one is spent');
});

test('the team can void a spend and the credits go back; lists are split by role; removing a profile clears its spending', async () => {
  const store = createMemoryDriver();
  await earn(store, 'alch-sam', 2);
  await setOffer(store, jo, { accepts: true, value: 10, max_credits: 2 });
  const s = (await requestSpend(store, { spender: sam, partner: jo, credits: 2 }, now)).spend;
  await respondToSpend(store, s.id, { intent: 'used', byProfileId: 'alch-jo' }, now);
  const lists = await spendsFor(store, 'alch-jo');
  assert.deepEqual([lists.made.length, lists.received.length], [0, 1]);
  assert.equal((await voidSpend(store, s.id, { now })).spend.status, 'voided');
  assert.equal((await availableCredits(store, 'alch-sam', now.getTime())).available, 2);
  assert.equal((await voidSpend(store, s.id, { now })).reason, 'not_open');
  await removeProfileSpending(store, 'alch-jo');
  assert.equal((await store.list('credit_spends')).length, 0);
  assert.equal((await getOffer(store, 'alch-jo')).accepts, false);
});
