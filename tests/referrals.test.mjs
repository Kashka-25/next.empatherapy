import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { normaliseCode, ensureCode, findByCode, offerDiscount, respondToOffer, endAgreement, agreementsFor, checkCode, removeProfileReferrals, MIN_DISCOUNT, MAX_DISCOUNT } from '../lib/referrals.mjs';
import { summarise, monthlySeries, medianHours, sessionsToCover, PERIODS } from '../lib/summary.mjs';
import { submitEnquiry, updateEnquiry } from '../lib/enquiries.mjs';
import { alchemistEmail, seekerEmail } from '../lib/notify.mjs';

const live = (id, name, over = {}) => ({ id, name, demo: false, publication_status: 'published', verification_status: 'verified', enquiry_email: `${id}@a.test`, ...over });
const sam = live('alch-sam', 'Sam Example'); const jo = live('alch-jo', 'Jo Example'); const mira = live('alch-mira', 'Mira Okafor', { demo: true, verification_status: 'demo' });
const all = [sam, jo, mira];

/* ---------- codes ---------- */
test('codes: unique, readable, one per profile, and forgiving to type', async () => {
  const store = createMemoryDriver();
  const a = await ensureCode(store, sam);
  assert.match(a.code, /^SAM-[A-HJKMNP-Z2-9]{4}$/);
  assert.equal((await ensureCode(store, sam)).code, a.code, 'asking again returns the same code');
  const b = await ensureCode(store, jo);
  assert.notEqual(a.code, b.code);
  assert.match(b.code, /^JOE?-|^JO[A-Z]-/);
  assert.equal(normaliseCode('sam 4k7q'), 'SAM4K7Q');
  assert.equal(normaliseCode('SAM-4K7Q'), 'SAM4K7Q');
  assert.match(normaliseCode(' <b>sam-4k7q</b> '), /^[A-Z0-9]+$/, 'markup and punctuation never survive');
  assert.equal((await findByCode(store, a.code.toLowerCase().replace('-', ' '))).profile_id, 'alch-sam');
  assert.equal(await findByCode(store, 'SAM-ZZZZ'), null);
  assert.equal(await findByCode(store, 'ab'), null, 'a too-short guess is not even looked up');
  await store.put('referral_codes', { ...a, active: false });
  assert.equal(await findByCode(store, a.code), null, 'a switched-off code does not work');
});

/* ---------- offers and agreements ---------- */
test('an offer needs two real, approved Alchemists, a sensible percentage, and no duplicate', async () => {
  const store = createMemoryDriver();
  const ok = await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 10 }, all);
  assert.equal(ok.ok, true);
  assert.deepEqual([ok.agreement.status, ok.agreement.percent, ok.agreement.partner_id, ok.agreement.referrer_id], ['offered', 10, 'alch-jo', 'alch-sam']);
  assert.equal((await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 15 }, all)).reason, 'exists');
  assert.equal((await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-jo', percent: 10 }, all)).reason, 'self');
  assert.equal((await offerDiscount(store, { partnerId: 'alch-mira', referrerId: 'alch-sam', percent: 10 }, all)).reason, 'not_approved', 'never a fictional example');
  assert.equal((await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-mira', percent: 10 }, all)).reason, 'not_approved');
  assert.equal((await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-hidden', percent: 10 }, [...all, live('alch-hidden', 'Hid', { publication_status: 'draft' })])).reason, 'not_approved');
  for (const bad of [0, MIN_DISCOUNT - 1, MAX_DISCOUNT + 1, 'lots', NaN, -5]) assert.equal((await offerDiscount(store, { partnerId: 'alch-sam', referrerId: 'alch-jo', percent: bad }, all)).reason, 'bad_percent');
  assert.equal((await offerDiscount(store, { partnerId: 'alch-sam', referrerId: 'alch-jo', percent: 12.4 }, all)).agreement.percent, 12, 'whole percentages');
});

test('only the referrer accepts, and only an offer that is waiting', async () => {
  const store = createMemoryDriver();
  const { agreement } = await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 10 }, all);
  assert.equal((await respondToOffer(store, agreement.id, { accept: true, byProfileId: 'alch-jo' })).reason, 'not_yours', 'the one giving the discount cannot accept it for the other');
  assert.equal((await respondToOffer(store, agreement.id, { accept: true, byProfileId: 'alch-other' })).reason, 'not_yours');
  assert.equal((await respondToOffer(store, 'nope', { accept: true, byProfileId: 'alch-sam' })).reason, 'not_found');
  assert.equal((await respondToOffer(store, agreement.id, { accept: true, byProfileId: 'alch-sam' })).agreement.status, 'active');
  assert.equal((await respondToOffer(store, agreement.id, { accept: false, byProfileId: 'alch-sam' })).reason, 'not_waiting');
  const second = (await offerDiscount(store, { partnerId: 'alch-sam', referrerId: 'alch-jo', percent: 10 }, all)).agreement;
  assert.equal((await respondToOffer(store, second.id, { accept: false, byProfileId: 'alch-jo' })).agreement.status, 'declined');
});

test('either side or the team can end an agreement, and nobody else', async () => {
  const store = createMemoryDriver();
  const { agreement } = await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 10 }, all);
  await respondToOffer(store, agreement.id, { accept: true, byProfileId: 'alch-sam' });
  assert.equal((await endAgreement(store, agreement.id, { byProfileId: 'alch-stranger' })).reason, 'not_yours');
  assert.equal((await endAgreement(store, agreement.id, { byProfileId: 'alch-jo' })).agreement.status, 'ended');
  assert.equal((await endAgreement(store, agreement.id, { byProfileId: 'alch-jo' })).reason, 'not_live');
  const again = (await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 20 }, all)).agreement;
  assert.equal((await endAgreement(store, again.id)).agreement.status, 'ended', 'the team can end it');
  assert.equal((await endAgreement(store, 'nope')).reason, 'not_found');
});

test('lists show each Alchemist their own side only', async () => {
  const store = createMemoryDriver();
  await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 10 }, all);
  const sams = await agreementsFor(store, 'alch-sam');
  const jos = await agreementsFor(store, 'alch-jo');
  assert.equal(sams.asReferrer.length, 1); assert.equal(sams.asPartner.length, 0);
  assert.equal(jos.asPartner.length, 1); assert.equal(jos.asReferrer.length, 0);
  assert.deepEqual((await agreementsFor(store, 'alch-nobody')), { asReferrer: [], asPartner: [] });
});

/* ---------- using a code ---------- */
async function setup() {
  const store = createMemoryDriver();
  const code = (await ensureCode(store, sam)).code;
  const { agreement } = await offerDiscount(store, { partnerId: 'alch-jo', referrerId: 'alch-sam', percent: 10 }, all);
  return { store, code, agreement };
}

test('a code gives a discount only at a partner with an active agreement, and the answer never says why not', async () => {
  const { store, code, agreement } = await setup();
  assert.deepEqual(await checkCode(store, code, 'alch-jo', all), { ok: false }, 'an offer nobody accepted is not an agreement');
  await respondToOffer(store, agreement.id, { accept: true, byProfileId: 'alch-sam' });
  const hit = await checkCode(store, code.toLowerCase(), 'alch-jo', all);
  assert.deepEqual([hit.ok, hit.percent, hit.referrer.name], [true, 10, 'Sam Example']);
  const third = live('alch-third', 'Third Person');
  assert.deepEqual(await checkCode(store, code, 'alch-third', [...all, third]), { ok: false }, 'a different Alchemist has no agreement');
  assert.deepEqual(await checkCode(store, code, 'alch-sam', all), { ok: false }, 'nobody discounts their own code');
  assert.deepEqual(await checkCode(store, 'NOPE-0000', 'alch-jo', all), { ok: false });
  assert.deepEqual(await checkCode(store, code, 'alch-jo', all.map((a) => (a.id === 'alch-sam' ? { ...a, publication_status: 'draft' } : a))), { ok: false }, 'a hidden referrer stops working');
  assert.deepEqual(await checkCode(store, code, 'alch-jo', all.map((a) => (a.id === 'alch-jo' ? { ...a, verification_status: 'pending' } : a))), { ok: false }, 'and so does a hidden partner');
  await endAgreement(store, agreement.id, { byProfileId: 'alch-jo' });
  assert.deepEqual(await checkCode(store, code, 'alch-jo', all), { ok: false }, 'ending the agreement ends the discount');
});

test('an enquiry that used a code records it, and the emails say what was agreed', async () => {
  const { store, code, agreement } = await setup();
  await respondToOffer(store, agreement.id, { accept: true, byProfileId: 'alch-sam' });
  const hit = await checkCode(store, code, 'alch-jo', all);
  const raw = { name: 'Alex Seeker', email: 'alex@seeker.test', message: 'I was sent by Sam and would love to hear how you work with breath.', consent: true };
  const r = await submitEnquiry(store, jo, raw, new Date(), { referral: { code: hit.code, referrer_id: hit.referrer.id, referrer_name: hit.referrer.name, percent: hit.percent } });
  const rec = await store.get('enquiries', r.id);
  assert.deepEqual(rec.referral, { code: code, referrer_id: 'alch-sam', referrer_name: 'Sam Example', percent: 10 });
  const mail = alchemistEmail(rec, jo, {});
  assert.match(mail.text, /referral code/); assert.match(mail.text, /take 10% off their first session/);
  const seeker = seekerEmail(rec, jo);
  assert.match(seeker.text, /agreed to take 10% off your first session/);
  const plain = await submitEnquiry(store, jo, raw);
  assert.equal('referral' in (await store.get('enquiries', plain.id)), false, 'no code, no record of one');
  assert.doesNotMatch(alchemistEmail(await store.get('enquiries', plain.id), jo, {}).text, /referral/);
});

test('deleting a profile removes its code and agreements', async () => {
  const { store, code } = await setup();
  await removeProfileReferrals(store, 'alch-sam');
  assert.equal(await findByCode(store, code), null);
  assert.deepEqual((await agreementsFor(store, 'alch-jo')).asPartner, []);
});

/* ---------- the summary ---------- */
const day = 24 * 60 * 60 * 1000, now = Date.parse('2026-11-13T00:00:00Z');
const enq = (over) => ({ id: Math.random().toString(36), alchemist_id: 'alch-sam', status: 'new', created_at: new Date(now - 10 * day).toISOString(), ...over });

test('summary: counts what is recorded, in a chosen period, and only for that Alchemist', () => {
  const list = [
    enq({ status: 'new' }),
    enq({ status: 'replied', replied_at: new Date(now - 10 * day + 6 * 3_600_000).toISOString() }),
    enq({ status: 'booked', first_session_fee: 90, replied_at: new Date(now - 10 * day + 2 * 3_600_000).toISOString() }),
    enq({ status: 'booked' }),
    enq({ status: 'closed', created_at: new Date(now - 200 * day).toISOString() }),
    enq({ alchemist_id: 'alch-jo', status: 'booked', first_session_fee: 500 }),
  ];
  const s = summarise(list, 'alch-sam', { now, period: '365' });
  assert.deepEqual([s.enquiries, s.replied, s.booked], [5, 3, 2]);
  assert.deepEqual(s.firstSessions, { count: 1, total: 90 });
  assert.equal(s.medianReplyHours, 4, 'median of 6 and 2 hours');
  assert.equal(summarise(list, 'alch-sam', { now, period: '90' }).enquiries, 4, 'the old one falls outside 90 days');
  assert.equal(summarise(list, 'alch-sam', { now, period: 'all' }).enquiries, 5);
  assert.equal(summarise(list, 'alch-sam', { now, period: 'nonsense' }).label, PERIODS['365'].label, 'an unknown period falls back');
  assert.equal(summarise(list, 'alch-nobody', { now }).enquiries, 0);
  assert.equal(summarise([], 'alch-sam', { now }).medianReplyHours, null, 'no replies yet, no figure');
});

test('summary: a nudge for enquiries still waiting after three days, and referral counts without identities', () => {
  const list = [
    enq({ status: 'new', created_at: new Date(now - 5 * day).toISOString() }),
    enq({ status: 'new', created_at: new Date(now - 1 * day).toISOString() }),
    enq({ alchemist_id: 'alch-jo', status: 'booked', referral: { code: 'SAM-4K7Q', referrer_id: 'alch-sam', referrer_name: 'Sam Example', percent: 10 }, name: 'Alex Seeker', email: 'alex@seeker.test' }),
    enq({ alchemist_id: 'alch-jo', status: 'new', referral: { code: 'SAM-4K7Q', referrer_id: 'alch-sam', referrer_name: 'Sam Example', percent: 10 } }),
    enq({ alchemist_id: 'alch-sam', status: 'new', referral: { code: 'JOE-9ABC', referrer_id: 'alch-jo', referrer_name: 'Jo Example', percent: 15 } }),
  ];
  const s = summarise(list, 'alch-sam', { now });
  assert.equal(s.stillWaiting, 2, 'two new enquiries older than three days');
  assert.equal(s.cameWithACode, 1, 'one of their own came through someone else\'s code');
  assert.deepEqual(s.myCodeUsed, { enquiries: 2, booked: 1 }, 'their code was used twice at partners, once booked');
  const text = JSON.stringify(s);
  assert.ok(!text.includes('alex@seeker') && !text.includes('Alex Seeker'), 'no identities, only counts');
});

test('summary: monthly counts and the break-even arithmetic', () => {
  const list = [enq({ created_at: '2026-11-02T00:00:00Z', status: 'booked' }), enq({ created_at: '2026-11-05T00:00:00Z' }), enq({ created_at: '2026-09-20T00:00:00Z', status: 'booked' }), enq({ created_at: '2025-01-01T00:00:00Z' }), enq({ alchemist_id: 'alch-jo', created_at: '2026-11-03T00:00:00Z' })];
  const series = monthlySeries(list, 'alch-sam', { now, months: 6 });
  assert.deepEqual(series.map((r) => r.month), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  assert.deepEqual(series.find((r) => r.month === '2026-11'), { month: '2026-11', enquiries: 2, booked: 1 });
  assert.deepEqual(series.find((r) => r.month === '2026-09'), { month: '2026-09', enquiries: 1, booked: 1 });
  assert.equal(series.reduce((n, r) => n + r.enquiries, 0), 3, 'other Alchemists and old months are left out');
  assert.equal(medianHours([]), null); assert.equal(medianHours([3]), 3); assert.equal(medianHours([1, 2, 10]), 2);
  const withFees = summarise([enq({ status: 'booked', first_session_fee: 80 }), enq({ status: 'booked', first_session_fee: 100 })], 'alch-sam', { now });
  assert.equal(sessionsToCover(159, withFees), 1.8, '159 divided by an average of 90');
  assert.equal(sessionsToCover(159, summarise([], 'alch-sam', { now })), null, 'no amounts noted, no claim');
});

test('replying is timestamped once, so reply time is honest', async () => {
  const store = createMemoryDriver();
  const { id } = await submitEnquiry(store, jo, { name: 'Alex Seeker', email: 'alex@seeker.test', message: 'I would love to hear how you work with breath.', consent: true });
  assert.equal('replied_at' in (await store.get('enquiries', id)), false);
  const first = await updateEnquiry(store, id, { status: 'replied' }, new Date('2026-11-13T02:00:00Z'));
  assert.equal(first.record.replied_at, '2026-11-13T02:00:00.000Z');
  const later = await updateEnquiry(store, id, { status: 'booked', fee: 90 }, new Date('2026-11-20T00:00:00Z'));
  assert.equal(later.record.replied_at, '2026-11-13T02:00:00.000Z', 'the first reply time is kept');
  assert.equal((await updateEnquiry(store, id, { note: 'x' })).record.replied_at, '2026-11-13T02:00:00.000Z');
});
