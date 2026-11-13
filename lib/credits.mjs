/**
 * Referral credits: how an Alchemist who brings people to Empatherapy is rewarded.
 *
 * An Alchemist (the referrer) earns ONE credit when a client who used their code books a FIRST session with an Alchemist
 * in their circle, as reported by that Alchemist. Credits are a record of what has been earned. Spending them on cheaper
 * sessions is not open yet (who covers that discount is still to be decided), so nothing here moves money.
 *
 * Built to resist gaming, because bookings are self-reported:
 *   - one credit per booked enquiry, and only for a client's first booked session through a given referrer
 *     (the client is matched by a one-way hash of their email, which is never stored in the ledger)
 *   - a monthly cap per referrer
 *   - a cooling-off period before a credit counts as confirmed, in which it is undone if the booking is undone
 *   - the team can void any credit
 */
import { createHash } from 'node:crypto';

export const CREDITS_PER_BOOKING = 1;
export const COOLING_DAYS = 14;
export const MONTHLY_CAP = 10;
const DAY = 24 * 60 * 60 * 1000;
const COLLECTION = 'credit_entries';

export const seekerKey = (email, referrerId) => createHash('sha256').update(`${String(email).trim().toLowerCase()}:${referrerId}`).digest('hex').slice(0, 24);

/** pending until the cooling-off period passes, then confirmed. Voided stays voided. */
export const effectiveStatus = (entry, now = Date.now()) => {
  if (entry.status === 'voided') return 'voided';
  return now - Date.parse(entry.created_at) >= COOLING_DAYS * DAY ? 'confirmed' : 'pending';
};

const monthOf = (iso) => String(iso).slice(0, 7);

/**
 * Gives the referrer a credit for a booked enquiry that used their code, if the rules allow.
 * Safe to call again for the same enquiry.
 * @returns {Promise<{awarded:boolean, reason?:string, entry?:object}>}
 */
export async function awardForEnquiry(store, enquiry, now = new Date()) {
  if (!enquiry?.referral || enquiry.status !== 'booked') return { awarded: false, reason: 'not_referred_booking' };
  const referrerId = enquiry.referral.referrer_id;
  const all = await store.list(COLLECTION);
  const existing = all.find((e) => e.enquiry_id === enquiry.id);
  if (existing) {
    // booked, un-booked and booked again: bring back a credit that only went away because of that
    if (existing.status === 'voided' && existing.void_reason === 'unbooked') {
      const revived = await store.put(COLLECTION, { ...existing, status: 'pending', void_reason: undefined, voided_at: undefined, created_at: existing.created_at });
      return { awarded: true, entry: revived };
    }
    return { awarded: false, reason: 'already_counted', entry: existing };
  }
  const key = seekerKey(enquiry.email, referrerId);
  if (all.some((e) => e.profile_id === referrerId && e.seeker_key === key && e.status !== 'voided')) return { awarded: false, reason: 'not_first_session' };
  const thisMonth = monthOf(now.toISOString());
  if (all.filter((e) => e.profile_id === referrerId && e.status !== 'voided' && monthOf(e.created_at) === thisMonth).length >= MONTHLY_CAP) return { awarded: false, reason: 'monthly_cap' };
  const entry = await store.put(COLLECTION, {
    profile_id: referrerId, enquiry_id: enquiry.id, partner_id: enquiry.alchemist_id, partner_name: enquiry.alchemist_name,
    seeker_key: key, credits: CREDITS_PER_BOOKING, status: 'pending',
  }, now.toISOString());
  return { awarded: true, entry };
}

/** When a booking is undone, its credit goes too (unless it was already confirmed, which only the team can reverse). */
export async function undoForEnquiry(store, enquiry, now = new Date()) {
  const entry = (await store.list(COLLECTION)).find((e) => e.enquiry_id === enquiry.id);
  if (!entry || entry.status === 'voided' || effectiveStatus(entry, now.getTime()) === 'confirmed') return { undone: false };
  return { undone: true, entry: await store.put(COLLECTION, { ...entry, status: 'voided', void_reason: 'unbooked', voided_at: now.toISOString() }) };
}

/** Keeps the ledger in step with an enquiry after its status changes. */
export async function syncCredit(store, enquiry, now = new Date()) {
  if (!enquiry?.referral) return { changed: false };
  if (enquiry.status === 'booked') { const r = await awardForEnquiry(store, enquiry, now); return { changed: r.awarded, ...r }; }
  const r = await undoForEnquiry(store, enquiry, now);
  return { changed: r.undone, ...r };
}

/** The team can void any credit, at any time, for a stated reason. */
export async function voidEntry(store, id, { reason = 'team', now = new Date() } = {}) {
  const entry = await store.get(COLLECTION, String(id));
  if (!entry) return { ok: false, reason: 'not_found' };
  if (entry.status === 'voided') return { ok: false, reason: 'already_voided' };
  return { ok: true, entry: await store.put(COLLECTION, { ...entry, status: 'voided', void_reason: reason, voided_at: now.toISOString() }) };
}

export async function ledgerFor(store, profileId) {
  return (await store.list(COLLECTION)).filter((e) => e.profile_id === profileId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Confirmed and pending credits for one Alchemist. */
export function balanceOf(entries, profileId, now = Date.now()) {
  const mine = entries.filter((e) => e.profile_id === profileId);
  const sum = (status) => mine.filter((e) => effectiveStatus(e, now) === status).reduce((n, e) => n + e.credits, 0);
  return { confirmed: sum('confirmed'), pending: sum('pending'), voided: mine.filter((e) => e.status === 'voided').length };
}

/* ---------- what a credit is worth, set by the team (illustration only until spending opens) ---------- */
export const MAX_CREDIT_VALUE = 100;
export async function getCreditValue(store) {
  const rec = store ? await store.get('settings', 'credits') : null;
  return typeof rec?.value === 'number' ? rec.value : 0;
}
export async function setCreditValue(store, dollars) {
  const n = Number(dollars);
  if (!Number.isFinite(n) || n < 0 || n > MAX_CREDIT_VALUE) return { ok: false, reason: 'bad_value' };
  const rec = await store.put('settings', { id: 'credits', value: Math.round(n * 100) / 100 });
  return { ok: true, value: rec.value };
}

/**
 * What the arrangement could look like for Empatherapy, in dollars, from the referred first sessions that have been
 * noted: the introduction fee at the illustration rate, less the value of the credits earned. Nothing here charges anyone.
 */
export function economics(enquiries, entries, { rate = 0, creditValue = 0, now = Date.now() } = {}) {
  const booked = enquiries.filter((e) => e.referral && e.status === 'booked' && typeof e.first_session_fee === 'number');
  const sessions = Math.round(booked.reduce((n, e) => n + e.first_session_fee, 0) * 100) / 100;
  const live = entries.filter((e) => e.status !== 'voided');
  const credits = live.reduce((n, e) => n + e.credits, 0);
  const fee = Math.round(sessions * rate * 100) / 100;
  const creditCost = Math.round(credits * creditValue * 100) / 100;
  return { referredBookings: booked.length, sessions, fee, credits, creditCost, net: Math.round((fee - creditCost) * 100) / 100, confirmed: entries.filter((e) => effectiveStatus(e, now) === 'confirmed').length };
}
