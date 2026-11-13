import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { validateEnquiry, submitEnquiry, canReceiveEnquiries, listEnquiries, updateEnquiry, introductionStats, getRate, setRatePercent, MAX_ENQUIRIES } from '../lib/enquiries.mjs';
import { sendMail } from '../lib/mailer.mjs';
import { alchemistEmail, founderEmail, seekerEmail, notifyEnquiry } from '../lib/notify.mjs';
import { findExpired, purgeExpired, RETENTION_DAYS } from '../lib/retention.mjs';
import { can } from '../lib/accounts.mjs';

const live = { id: 'alch-sam', name: 'Sam Example', demo: false, publication_status: 'published', verification_status: 'verified', enquiry_email: 'sam@alchemist.test' };
const good = { name: 'Alex Seeker', email: 'alex@seeker.test', message: 'I have been feeling disconnected and would love to hear how you work with breath.', consent: true };

test('enquiry validation: name, email, message, links and consent', () => {
  assert.equal(validateEnquiry(good).valid, true);
  const bad = validateEnquiry({ name: 'A', email: 'nope', message: 'short', consent: false });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['consent', 'email', 'message', 'name']);
  assert.ok(validateEnquiry({ ...good, consent: 'true' }).errors.consent, 'consent has to be the real thing, not a string');
  assert.ok(validateEnquiry({ ...good, message: `${good.message} http://a.test http://b.test http://c.test` }).errors.message, 'more than two links look like spam');
  const cleaned = validateEnquiry({ ...good, name: '<b>Alex</b>', message: `${good.message}<script>x</script>` });
  assert.ok(!cleaned.data.name.includes('<') && !cleaned.data.message.includes('<'));
  assert.equal(validateEnquiry({ ...good, message: 'x'.repeat(5000) }).data.message.length, 1500);
});

test('only public, non-example Alchemists can receive enquiries', async () => {
  const store = createMemoryDriver();
  assert.equal(canReceiveEnquiries(live), true);
  for (const bad of [undefined, null, { ...live, demo: true }, { ...live, publication_status: 'draft' }, { ...live, verification_status: 'pending' }]) {
    assert.equal(canReceiveEnquiries(bad), false);
    assert.equal((await submitEnquiry(store, bad, good)).reason, 'unavailable');
  }
  assert.equal((await store.list('enquiries')).length, 0, 'nothing is stored when it is refused');
  assert.equal(canReceiveEnquiries({ ...live, verification_status: 'founder' }), true);
});

test('submitting stores only what was asked, with consent time, and starts as new', async () => {
  const store = createMemoryDriver();
  const now = new Date('2026-11-13T01:00:00Z');
  const r = await submitEnquiry(store, live, { ...good, website_url: 'x', extra: 'ignored', ip: '1.2.3.4' }, now);
  assert.equal(r.ok, true);
  const rec = await store.get('enquiries', r.id);
  assert.deepEqual(Object.keys(rec).sort(), ['alchemist_id', 'alchemist_name', 'consent_at', 'created_at', 'email', 'id', 'message', 'name', 'note', 'notified', 'status', 'support_flag', 'updated_at']);
  assert.equal(rec.status, 'new'); assert.equal(rec.consent_at, now.toISOString()); assert.equal(rec.alchemist_id, 'alch-sam');
  assert.ok(!JSON.stringify(rec).includes('1.2.3.4'), 'no address is kept');
  assert.equal((await submitEnquiry(store, live, { ...good, consent: false })).reason, 'invalid');
});

test('messages that suggest someone is struggling are flagged and never blocked', async () => {
  const store = createMemoryDriver();
  const r = await submitEnquiry(store, live, { ...good, message: 'I do not want to be here anymore and I am not sure where else to turn.' });
  assert.equal(r.ok, true);
  assert.equal(r.support, true);
  assert.equal((await store.get('enquiries', r.id)).support_flag, true);
  assert.equal((await submitEnquiry(store, live, good)).support, false);
});

test('there is a cap on stored enquiries', async () => {
  const store = createMemoryDriver();
  for (let i = 0; i < MAX_ENQUIRIES; i++) await store.put('enquiries', { id: `e${i}` });
  assert.equal((await submitEnquiry(store, live, good)).reason, 'full');
});

test('outcomes: status, notes and the first-session amount follow the rules', async () => {
  const store = createMemoryDriver();
  const { id } = await submitEnquiry(store, live, good);
  assert.equal((await updateEnquiry(store, id, { status: 'nonsense' })).reason, 'bad_status');
  assert.equal((await updateEnquiry(store, id, { fee: 90 })).reason, 'fee_needs_booked', 'no amount until it is booked');
  assert.equal((await updateEnquiry(store, id, { status: 'replied', fee: 90 })).reason, 'fee_needs_booked', 'and not by sending it together with a non-booked status either');
  assert.equal((await updateEnquiry(store, 'missing', { status: 'replied' })).reason, 'not_found');
  assert.equal((await updateEnquiry(store, id, { status: 'replied', note: '<b>called</b> back' })).record.note, 'bcalled/b back');
  const booked = await updateEnquiry(store, id, { status: 'booked', fee: '90.456' }, new Date('2026-11-20T00:00:00Z'));
  assert.equal(booked.record.first_session_fee, 90.46);
  assert.equal(booked.record.booked_at, '2026-11-20T00:00:00.000Z');
  assert.equal((await updateEnquiry(store, id, { fee: -5 })).reason, 'bad_fee');
  assert.equal((await updateEnquiry(store, id, { fee: 99999 })).reason, 'bad_fee');
  const sentAgain = await updateEnquiry(store, id, { status: 'closed', fee: '90.46' }); // the form always sends the amount it holds
  assert.equal(sentAgain.ok, true, 'moving a booking back to another status works even when the old amount is sent');
  assert.equal('first_session_fee' in sentAgain.record, false);
  await updateEnquiry(store, id, { status: 'booked', fee: '90.456' });
  const undone = await updateEnquiry(store, id, { status: 'closed' });
  assert.equal('first_session_fee' in undone.record, false, 'moving away from booked clears the amount');
  assert.equal('booked_at' in undone.record, false);
});

test('introductions report: counts per Alchemist, and an illustration only when a rate is set', async () => {
  const store = createMemoryDriver();
  const mk = async (a, status, fee) => { const { id } = await submitEnquiry(store, a, good); await updateEnquiry(store, id, { status, ...(fee ? { fee } : {}) }); };
  const other = { ...live, id: 'alch-two', name: 'Two Example' };
  await mk(live, 'new'); await mk(live, 'replied'); await mk(live, 'booked', 100); await mk(live, 'booked'); await mk(other, 'not_a_fit');
  const all = await listEnquiries(store);
  const off = introductionStats(all, 0);
  assert.equal(off.total, 5); assert.equal(off.replied, 3); assert.equal(off.booked, 2); assert.equal(off.fees, 100);
  assert.equal(off.illustrative, 0, 'no rate, no figure');
  assert.deepEqual(off.rows.map((r) => [r.name, r.total, r.booked]), [['Sam Example', 4, 2], ['Two Example', 1, 0]]);
  const on = introductionStats(all, 0.15);
  assert.equal(on.illustrative, 15);
  assert.equal(on.rows[0].feesKnown, 1, 'a booking with no amount is counted but adds nothing');
  assert.equal((await listEnquiries(store, { alchemistId: 'alch-two' })).length, 1);
});

test('the illustration rate is bounded and stored as a fraction', async () => {
  const store = createMemoryDriver();
  assert.equal(await getRate(store), 0);
  assert.equal(await getRate(null), 0);
  assert.equal((await setRatePercent(store, 15)).rate, 0.15);
  assert.equal(await getRate(store), 0.15);
  assert.equal((await setRatePercent(store, 12.5)).rate, 0.125);
  for (const bad of [-1, 31, 'abc', NaN]) assert.equal((await setRatePercent(store, bad)).reason, 'bad_rate');
  assert.equal(await getRate(store), 0.125, 'a bad value changes nothing');
});

test('only owners can see enquiries', () => {
  assert.equal(can('owner', 'enquiries'), true);
  assert.equal(can('editor', 'enquiries'), false);
  assert.equal(can('reviewer', 'enquiries'), false);
});

/* ---------- email ---------- */
test('mail is off unless configured, and never throws', async () => {
  assert.deepEqual(await sendMail({ to: 'a@b.test', subject: 's', text: 't' }, {}), { ok: false, skipped: true });
  assert.equal((await sendMail({ to: 'not-an-email', subject: 's', text: 't' }, { EMPATHERAPY_MAIL: 'log' })).error, 'bad_recipient');
  assert.equal((await sendMail({ to: 'a@b.test', subject: 's', text: 't' }, { EMPATHERAPY_MAIL: 'smoke-signals' })).error, 'unknown_mode');
  assert.equal((await sendMail({ to: 'a@b.test', subject: 's', text: 't' }, { EMPATHERAPY_MAIL: 'resend' })).error, 'not_configured');
  const boom = await sendMail({ to: 'a@b.test', subject: 's', text: 't' }, { EMPATHERAPY_MAIL: 'resend', RESEND_API_KEY: 'k'.repeat(20), MAIL_FROM: 'Empatherapy <hello@empatherapy.co>' }, async () => { throw new Error('network down with secret@example.com'); });
  assert.deepEqual(boom, { ok: false, error: 'send_failed' });
});

test('log mode writes messages to a file instead of sending, with header injection removed', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emp-mail-'));
  try {
    const env = { EMPATHERAPY_MAIL: 'log', EMPATHERAPY_DATA_DIR: dir };
    assert.equal((await sendMail({ to: 'a@b.test', subject: 'Hello\r\nBcc: evil@x.test', text: 'body', replyTo: 'r@s.test' }, env)).ok, true);
    const line = JSON.parse((await readFile(path.join(dir, 'outbox.jsonl'), 'utf8')).trim());
    assert.equal(line.subject, 'Hello Bcc: evil@x.test', 'a newline cannot start a new header');
    assert.equal(line.replyTo, 'r@s.test');
    assert.equal((await sendMail({ to: 'a@b.test\nBcc: evil@x.test', subject: 's', text: 't' }, env)).error, 'bad_recipient');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('resend mode posts the right request and reports provider errors without their body', async () => {
  const calls = [];
  const env = { EMPATHERAPY_MAIL: 'resend', RESEND_API_KEY: 'key-key-key-key-key-12', MAIL_FROM: 'Empatherapy <hello@empatherapy.co>' };
  const ok = await sendMail({ to: 'a@b.test', subject: 'S', text: 'T', replyTo: 'r@s.test' }, env, async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; });
  assert.equal(ok.ok, true);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer key-key-key-key-key-12');
  assert.deepEqual(JSON.parse(calls[0].init.body), { from: 'Empatherapy <hello@empatherapy.co>', to: ['a@b.test'], subject: 'S', text: 'T', reply_to: 'r@s.test' });
  const bad = await sendMail({ to: 'a@b.test', subject: 'S', text: 'T' }, env, async () => ({ ok: false, status: 422, text: async () => 'secret detail' }));
  assert.deepEqual(bad, { ok: false, error: 'provider_422' });
});

test('who is told what: the Alchemist gets the message, the founder only a heads-up, the Seeker a confirmation', () => {
  const enq = { id: 'enq-1', ...good, support_flag: false };
  const env = { ADMIN_NOTIFY_EMAIL: 'founder@empatherapy.test', SITE_URL: 'https://empatherapy.co' };
  const a = alchemistEmail(enq, live, env);
  assert.equal(a.to, 'sam@alchemist.test'); assert.equal(a.replyTo, 'alex@seeker.test');
  assert.ok(a.text.includes(good.message) && a.text.includes('Alex Seeker') && a.text.includes('alex@seeker.test'));
  assert.ok(a.text.includes('Empatherapy\'s team can also see'));
  const f = founderEmail(enq, live, env);
  assert.equal(f.to, 'founder@empatherapy.test');
  assert.ok(f.text.includes('Sam Example') && f.text.includes('https://empatherapy.co/admin/enquiries/enq-1'));
  assert.ok(!f.text.includes(good.message) && !f.text.includes('alex@seeker.test') && !f.text.includes('Alex'), 'no personal details in the founder email');
  const s = seekerEmail(enq, live);
  assert.equal(s.to, 'alex@seeker.test');
  assert.ok(s.text.includes('six months') && s.text.includes('13 11 14') && s.text.includes('000') && s.text.includes('not crisis care'));
  assert.ok(!s.text.includes(good.message), 'the confirmation does not repeat the message');
});

test('a message that may signal distress is marked for the Alchemist and the founder', () => {
  const enq = { id: 'enq-2', ...good, support_flag: true };
  assert.ok(alchemistEmail(enq, live, {}).text.includes('13 11 14'));
  assert.ok(founderEmail(enq, live, { ADMIN_NOTIFY_EMAIL: 'f@x.test' }).text.includes('hard time'));
});

test('notifying sends three emails when everything is set up, and reports what really went out', async () => {
  const sent = [];
  const fetchImpl = async (_u, init) => { sent.push(JSON.parse(init.body)); return { ok: true, status: 200 }; };
  const env = { EMPATHERAPY_MAIL: 'resend', RESEND_API_KEY: 'k'.repeat(20), MAIL_FROM: 'Empatherapy <hello@empatherapy.co>', ADMIN_NOTIFY_EMAIL: 'founder@empatherapy.test' };
  const enq = { id: 'enq-3', ...good, support_flag: false };
  assert.deepEqual(await notifyEnquiry(enq, live, env, fetchImpl), { alchemist: true, founder: true, seeker: true });
  assert.deepEqual(sent.map((m) => m.to[0]).sort(), ['alex@seeker.test', 'founder@empatherapy.test', 'sam@alchemist.test']);
  assert.deepEqual(await notifyEnquiry(enq, { ...live, enquiry_email: null }, { ...env, ADMIN_NOTIFY_EMAIL: '' }, fetchImpl), { alchemist: false, founder: false, seeker: true });
  assert.deepEqual(await notifyEnquiry(enq, live, {}, fetchImpl), { alchemist: false, founder: false, seeker: false }, 'mail off: nothing goes out');
  assert.deepEqual(await notifyEnquiry(enq, live, env, async () => ({ ok: false, status: 500 })), { alchemist: false, founder: false, seeker: false });
});

test('enquiries are kept six months after they were last touched, then cleared by the owner clean-up', async () => {
  const store = createMemoryDriver();
  const day = 24 * 60 * 60 * 1000, now = Date.parse('2027-06-01T00:00:00Z');
  const at = (days) => new Date(now - days * day).toISOString();
  assert.equal(RETENTION_DAYS.enquiries, 180);
  await store.put('enquiries', { id: 'old', status: 'closed' }, at(181));
  await store.put('enquiries', { id: 'recent', status: 'new' }, at(179));
  assert.deepEqual((await findExpired(store, now)).enquiries.map((e) => e.id), ['old']);
  const r = await purgeExpired(store, now);
  assert.equal(r.enquiries, 1);
  assert.deepEqual((await store.list('enquiries')).map((e) => e.id), ['recent']);
});
