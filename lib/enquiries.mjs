/**
 * Enquiries: a Seeker asks to be put in touch with an Alchemist through the site. Storage-agnostic (takes a store).
 *
 * Privacy: only a name, an email and the message are kept, with the time consent was given. No address or device
 * details. Nothing is sent anywhere until the Seeker ticks the consent box, which says who will read it.
 * Enquiries are never accepted for fictional example profiles or for profiles that are not public.
 *
 * Outcomes are recorded so the founder can see how introductions go: replied, booked, not a fit, closed. For a
 * booked first session an amount can be noted. Nothing here charges anyone: it only records, and (if the founder
 * sets a rate) shows an illustrative figure.
 */
import { clean } from './validation.mjs';
import { detectCrisis } from './matching/index.mjs';
import { ELIGIBLE_STATUSES } from './matching/index.mjs';

export const ENQUIRY_STATUSES = ['new', 'replied', 'booked', 'not_a_fit', 'closed'];
export const ENQUIRY_LABEL = { new: 'New', replied: 'Replied', booked: 'Booked a session', not_a_fit: 'Not a fit', closed: 'Closed' };
export const MAX_ENQUIRIES = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEnquiry(raw = {}) {
  const data = { name: clean(raw.name, 80), email: clean(raw.email, 200), message: clean(raw.message, 1500) };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Please tell us your name.';
  if (!data.email) errors.email = 'Please add an email so they can reply.';
  else if (!EMAIL.test(data.email)) errors.email = 'That email address does not look quite right.';
  if (data.message.length < 20) errors.message = 'A few more words please: at least 20 characters, so they know how to help.';
  else if ((data.message.match(/https?:\/\//gi) || []).length > 2) errors.message = 'Please keep links to two or fewer.';
  if (raw.consent !== true) errors.consent = 'Please tick the box so we can pass your message on.';
  return { valid: Object.keys(errors).length === 0, errors, data };
}

export const canReceiveEnquiries = (alchemist) =>
  Boolean(alchemist) && alchemist.demo !== true && alchemist.publication_status === 'published' && ELIGIBLE_STATUSES.includes(alchemist.verification_status);

/** @returns {{ok:true,id:string,support:boolean,record:object}|{ok:false,reason:string,errors?:object}} */
export async function submitEnquiry(store, alchemist, raw, now = new Date(), { referral } = {}) {
  if (!canReceiveEnquiries(alchemist)) return { ok: false, reason: 'unavailable' };
  const v = validateEnquiry(raw);
  if (!v.valid) return { ok: false, reason: 'invalid', errors: v.errors };
  if ((await store.list('enquiries')).length >= MAX_ENQUIRIES) return { ok: false, reason: 'full' };
  const support = detectCrisis(v.data.message);
  const record = await store.put('enquiries', {
    alchemist_id: alchemist.id, alchemist_name: alchemist.name, ...v.data,
    consent_at: now.toISOString(), status: 'new', note: '', support_flag: support, notified: {},
    ...(referral ? { referral } : {}), // { code, referrer_id, referrer_name, percent }: the code a Seeker used, already checked
  });
  return { ok: true, id: record.id, support, record };
}

export async function listEnquiries(store, { alchemistId } = {}) {
  const all = await store.list('enquiries');
  return all.filter((e) => !alchemistId || e.alchemist_id === alchemistId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function updateEnquiry(store, id, { status, note, fee, alchemistNote } = {}, now = new Date()) {
  const rec = await store.get('enquiries', String(id));
  if (!rec) return { ok: false, reason: 'not_found' };
  const next = { ...rec };
  if (status !== undefined) {
    if (!ENQUIRY_STATUSES.includes(status)) return { ok: false, reason: 'bad_status' };
    if (status === 'booked' && rec.status !== 'booked') next.booked_at = now.toISOString();
    next.status = status;
    if ((status === 'replied' || status === 'booked') && !rec.replied_at) next.replied_at = now.toISOString(); // for "how quickly do I reply"
    if (status !== 'booked') { delete next.first_session_fee; delete next.booked_at; }
  }
  if (note !== undefined) next.note = clean(note, 1000);
  if (alchemistNote !== undefined) next.alchemist_note = clean(alchemistNote, 1000);
  const movingAwayFromBooked = rec.status === 'booked' && status !== undefined && status !== 'booked';
  if (fee !== undefined && fee !== '' && fee !== null && !movingAwayFromBooked) {
    const n = Number(fee);
    if (!Number.isFinite(n) || n < 0 || n > 5000) return { ok: false, reason: 'bad_fee' };
    if (next.status !== 'booked') return { ok: false, reason: 'fee_needs_booked' };
    next.first_session_fee = Math.round(n * 100) / 100;
  }
  return { ok: true, record: await store.put('enquiries', next) };
}

/** Per-Alchemist counts, plus an illustrative figure at `rate` (0 to 1). Nothing is charged. */
export function introductionStats(enquiries, rate = 0) {
  const by = new Map();
  for (const e of enquiries) {
    const s = by.get(e.alchemist_id) ?? { alchemist_id: e.alchemist_id, name: e.alchemist_name, total: 0, replied: 0, booked: 0, fees: 0, feesKnown: 0 };
    s.total += 1;
    if (e.status === 'replied' || e.status === 'booked') s.replied += 1;
    if (e.status === 'booked') { s.booked += 1; if (typeof e.first_session_fee === 'number') { s.fees += e.first_session_fee; s.feesKnown += 1; } }
    by.set(e.alchemist_id, s);
  }
  const rows = [...by.values()].map((s) => ({ ...s, fees: Math.round(s.fees * 100) / 100, illustrative: Math.round(s.fees * rate * 100) / 100 })).sort((a, b) => b.total - a.total);
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
  return { rows, total: sum('total'), replied: sum('replied'), booked: sum('booked'), fees: Math.round(sum('fees') * 100) / 100, illustrative: Math.round(sum('illustrative') * 100) / 100, rate };
}

/* ---------- the founder's rate, for the illustration only ---------- */
export const MAX_RATE_PERCENT = 30;
export async function getRate(store) {
  const rec = store ? await store.get('settings', 'commission') : null;
  return typeof rec?.rate === 'number' ? rec.rate : 0;
}
export async function setRatePercent(store, percent) {
  const n = Number(percent);
  if (!Number.isFinite(n) || n < 0 || n > MAX_RATE_PERCENT) return { ok: false, reason: 'bad_rate' };
  const rec = await store.put('settings', { id: 'commission', rate: Math.round(n * 10) / 1000 });
  return { ok: true, rate: rec.rate };
}
