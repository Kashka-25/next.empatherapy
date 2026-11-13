/**
 * Spending referral credits: the Alchemist who accepts a credit gives the discount themselves.
 *
 * How it works (Cassidy, 13 Nov 2026: "the Alchemist covers the cost of the credit"):
 *   - An Alchemist can opt in to ACCEPT credits, saying what one credit takes off one of their sessions and the most
 *     credits they will take for a single session. They can pause this at any time.
 *   - A referrer with confirmed credits asks to spend some with an opted-in Alchemist. The credits are held while the
 *     request is open.
 *   - The Alchemist gives the discount when they see the person, then marks the request "used". Only then are the credits
 *     gone. If they decline, or the referrer withdraws, the credits are released.
 *   - Empatherapy never handles the money. The team can void a used credit spend (for example after a complaint).
 *   - Credits expire 12 months after they were earned (to be checked with a lawyer before launch).
 */
import { effectiveStatus } from './credits.mjs';
import { canReceiveEnquiries } from './enquiries.mjs';

export const EXPIRY_DAYS = 365;
export const MAX_CREDIT_VALUE_OFFERED = 100;
export const MAX_CREDITS_PER_SESSION = 5;
export const DEFAULT_VALUE = 10;
export const DEFAULT_MAX = 2;
const DAY = 24 * 60 * 60 * 1000;
const OFFERS = 'credit_offers';
const SPENDS = 'credit_spends';

export const SPEND_LABEL = { requested: 'Waiting for them', used: 'Used', declined: 'Declined', withdrawn: 'Withdrawn', voided: 'Voided by the team' };

export const isExpired = (entry, now = Date.now()) => now - Date.parse(entry.created_at) >= EXPIRY_DAYS * DAY;

/** An Alchemist's standing choice about accepting credits. Not accepting unless they have said so. */
export async function getOffer(store, profileId) {
  const rec = store ? await store.get(OFFERS, profileId) : null;
  return rec ? { accepts: rec.accepts === true, value: rec.value, max_credits: rec.max_credits } : { accepts: false, value: DEFAULT_VALUE, max_credits: DEFAULT_MAX };
}

export async function setOffer(store, alchemist, { accepts, value, max_credits }) {
  if (accepts && !canReceiveEnquiries(alchemist)) return { ok: false, reason: 'not_approved' };
  const v = Number(value), m = Number(max_credits);
  if (!Number.isFinite(v) || v < 1 || v > MAX_CREDIT_VALUE_OFFERED) return { ok: false, reason: 'bad_value' };
  if (!Number.isInteger(m) || m < 1 || m > MAX_CREDITS_PER_SESSION) return { ok: false, reason: 'bad_max' };
  const rec = await store.put(OFFERS, { id: alchemist.id, profile_name: alchemist.name, accepts: accepts === true, value: Math.round(v * 100) / 100, max_credits: m });
  return { ok: true, offer: rec };
}

/** Alchemists who currently take credits, with what a credit is worth to them. */
export async function acceptingAlchemists(store, alchemists) {
  const offers = (await store.list(OFFERS)).filter((o) => o.accepts === true);
  return offers.map((o) => ({ alchemist: alchemists.find((a) => a.id === o.id), offer: o })).filter((x) => x.alchemist && canReceiveEnquiries(x.alchemist));
}

/** Credits a referrer can spend now: confirmed, not expired, and not held by or used in a spend. Oldest are spent first. */
export async function availableCredits(store, profileId, now = Date.now()) {
  const entries = (await store.list('credit_entries')).filter((e) => e.profile_id === profileId && effectiveStatus(e, now) === 'confirmed');
  const spends = (await store.list(SPENDS)).filter((s) => s.profile_id === profileId && ['requested', 'used'].includes(s.status));
  // Each spend, in the order it was made, takes the oldest credits that had not yet expired at that moment.
  const lots = entries.map((e) => ({ at: Date.parse(e.created_at), left: e.credits })).sort((a, b) => a.at - b.at);
  for (const s of [...spends].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    let need = s.credits;
    const when = Date.parse(s.created_at);
    for (const lot of lots) {
      if (!need) break;
      if (lot.left > 0 && when - lot.at < EXPIRY_DAYS * DAY) { const take = Math.min(lot.left, need); lot.left -= take; need -= take; }
    }
  }
  const sum = (pred) => lots.filter(pred).reduce((n, l) => n + l.left, 0);
  return {
    available: sum((l) => now - l.at < EXPIRY_DAYS * DAY), expired: sum((l) => now - l.at >= EXPIRY_DAYS * DAY),
    held: spends.filter((s) => s.status === 'requested').reduce((n, s) => n + s.credits, 0), used: spends.filter((s) => s.status === 'used').reduce((n, s) => n + s.credits, 0),
  };
}

export async function requestSpend(store, { spender, partner, credits }, now = new Date()) {
  if (!spender || !partner || spender.id === partner.id) return { ok: false, reason: 'self' };
  if (!canReceiveEnquiries(spender) || !canReceiveEnquiries(partner)) return { ok: false, reason: 'not_approved' };
  const offer = await getOffer(store, partner.id);
  if (!offer.accepts) return { ok: false, reason: 'not_accepting' };
  const n = Number(credits);
  if (!Number.isInteger(n) || n < 1) return { ok: false, reason: 'bad_credits' };
  if (n > offer.max_credits) return { ok: false, reason: 'over_max', max: offer.max_credits };
  const open = (await store.list(SPENDS)).filter((s) => s.profile_id === spender.id && s.partner_id === partner.id && s.status === 'requested');
  if (open.length) return { ok: false, reason: 'already_open' };
  if ((await availableCredits(store, spender.id, now.getTime())).available < n) return { ok: false, reason: 'not_enough' };
  const rec = await store.put(SPENDS, {
    profile_id: spender.id, profile_name: spender.name, partner_id: partner.id, partner_name: partner.name,
    credits: n, value_each: offer.value, discount: Math.round(n * offer.value * 100) / 100, status: 'requested',
  }, now.toISOString());
  return { ok: true, spend: rec };
}

/** The accepting Alchemist marks it used (they gave the discount) or declines. The referrer can withdraw while it is open. */
export async function respondToSpend(store, id, { intent, byProfileId }, now = new Date()) {
  const s = await store.get(SPENDS, String(id));
  if (!s) return { ok: false, reason: 'not_found' };
  if (s.status !== 'requested') return { ok: false, reason: 'not_open' };
  const status = { used: 'used', decline: 'declined', withdraw: 'withdrawn' }[intent];
  if (!status) return { ok: false, reason: 'bad_intent' };
  if (status === 'withdrawn' ? s.profile_id !== byProfileId : s.partner_id !== byProfileId) return { ok: false, reason: 'not_yours' };
  return { ok: true, spend: await store.put(SPENDS, { ...s, status, ...(status === 'used' ? { used_at: now.toISOString() } : { closed_at: now.toISOString() }) }) };
}

/** The team can void an open or used spend (for example after a complaint). The credits go back to the referrer. */
export async function voidSpend(store, id, { now = new Date() } = {}) {
  const s = await store.get(SPENDS, String(id));
  if (!s) return { ok: false, reason: 'not_found' };
  if (!['requested', 'used'].includes(s.status)) return { ok: false, reason: 'not_open' };
  return { ok: true, spend: await store.put(SPENDS, { ...s, status: 'voided', closed_at: now.toISOString() }) };
}

export async function spendsFor(store, profileId) {
  const all = (await store.list(SPENDS)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { made: all.filter((s) => s.profile_id === profileId), received: all.filter((s) => s.partner_id === profileId) };
}

export async function removeProfileSpending(store, profileId) {
  await store.remove(OFFERS, profileId);
  for (const s of (await store.list(SPENDS)).filter((x) => x.profile_id === profileId || x.partner_id === profileId)) await store.remove(SPENDS, s.id);
}
