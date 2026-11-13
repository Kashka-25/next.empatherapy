/**
 * Referral circles: Alchemists helping each other's clients.
 *
 * Every real, approved Alchemist can have a unique referral code. An Alchemist who is happy to give a discount to the
 * clients of another Alchemist makes them an *offer* (a percentage off a first session). When the other Alchemist
 * accepts, the two have an agreement. A client of the referrer who types the referrer's code when reaching out to the
 * partner is recorded as referred, and the partner is told to apply the agreed discount.
 *
 * Money never moves through Empatherapy here: the partner gives the discount themselves. The referrer sees only counts
 * of how often their code was used and never who used it. Either side can end an agreement at any time.
 */
import { randomInt } from 'node:crypto';
import { canReceiveEnquiries } from './enquiries.mjs';

export const MIN_DISCOUNT = 5;
export const MAX_DISCOUNT = 25;
export const AGREEMENT_STATUSES = ['offered', 'active', 'declined', 'ended'];
export const AGREEMENT_LABEL = { offered: 'Waiting for a reply', active: 'Active', declined: 'Declined', ended: 'Ended' };
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alikes

/** "sam 4k7q", "SAM-4K7Q" and "sam4k7q" are the same code. */
export const normaliseCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

function makeCode(name, taken) {
  const prefix = (String(name).split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '') + 'ALC').slice(0, 3);
  for (let i = 0; i < 50; i++) {
    const suffix = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    if (!taken.has(normaliseCode(prefix + suffix))) return `${prefix}-${suffix}`;
  }
  throw new Error('Could not make a unique code.');
}

/** The Alchemist's code, made the first time it is wanted. One per profile. */
export async function ensureCode(store, profile) {
  const existing = await store.get('referral_codes', profile.id);
  if (existing) return existing;
  const taken = new Set((await store.list('referral_codes')).map((c) => normaliseCode(c.code)));
  return store.put('referral_codes', { id: profile.id, profile_id: profile.id, code: makeCode(profile.name, taken), active: true });
}

export async function findByCode(store, code) {
  const n = normaliseCode(code);
  if (n.length < 6) return null;
  return (await store.list('referral_codes')).find((c) => c.active && normaliseCode(c.code) === n) ?? null;
}

/* ---------- offers and agreements ---------- */
const approved = (alchemists, id) => alchemists.find((a) => a.id === id && canReceiveEnquiries(a));

/**
 * `partnerId` offers `percent` off a first session to clients referred by `referrerId`.
 * Both must be real, approved Alchemists, and there can be only one live offer or agreement between a pair.
 */
export async function offerDiscount(store, { partnerId, referrerId, percent }, alchemists) {
  const p = Math.round(Number(percent));
  if (!Number.isFinite(p) || p < MIN_DISCOUNT || p > MAX_DISCOUNT) return { ok: false, reason: 'bad_percent' };
  if (partnerId === referrerId) return { ok: false, reason: 'self' };
  if (!approved(alchemists, partnerId) || !approved(alchemists, referrerId)) return { ok: false, reason: 'not_approved' };
  const all = await store.list('referral_agreements');
  if (all.some((a) => a.partner_id === partnerId && a.referrer_id === referrerId && ['offered', 'active'].includes(a.status))) return { ok: false, reason: 'exists' };
  const rec = await store.put('referral_agreements', { partner_id: partnerId, referrer_id: referrerId, percent: p, status: 'offered', offered_by: partnerId });
  return { ok: true, agreement: rec };
}

/** Only the referrer (who the offer is for) accepts or declines. */
export async function respondToOffer(store, id, { accept, byProfileId }) {
  const a = await store.get('referral_agreements', String(id));
  if (!a) return { ok: false, reason: 'not_found' };
  if (a.referrer_id !== byProfileId) return { ok: false, reason: 'not_yours' };
  if (a.status !== 'offered') return { ok: false, reason: 'not_waiting' };
  return { ok: true, agreement: await store.put('referral_agreements', { ...a, status: accept ? 'active' : 'declined', responded_at: new Date().toISOString() }) };
}

/** Either side can end a live agreement or withdraw an offer, and the team can too (byProfileId null). */
export async function endAgreement(store, id, { byProfileId = null } = {}) {
  const a = await store.get('referral_agreements', String(id));
  if (!a) return { ok: false, reason: 'not_found' };
  if (byProfileId && ![a.partner_id, a.referrer_id].includes(byProfileId)) return { ok: false, reason: 'not_yours' };
  if (!['offered', 'active'].includes(a.status)) return { ok: false, reason: 'not_live' };
  return { ok: true, agreement: await store.put('referral_agreements', { ...a, status: 'ended', ended_at: new Date().toISOString() }) };
}

export async function agreementsFor(store, profileId) {
  const all = await store.list('referral_agreements');
  const byNewest = (x, y) => y.created_at.localeCompare(x.created_at);
  return {
    asReferrer: all.filter((a) => a.referrer_id === profileId).sort(byNewest), // others offering a discount to my clients
    asPartner: all.filter((a) => a.partner_id === profileId).sort(byNewest), // my offers to other Alchemists' clients
  };
}

/**
 * Does `code` give a discount at `partnerId`? Only with a live code owned by an approved Alchemist and an *active*
 * agreement with that partner. The answer never says which part failed.
 */
export async function checkCode(store, code, partnerId, alchemists) {
  const found = await findByCode(store, code);
  if (!found) return { ok: false };
  const referrer = approved(alchemists, found.profile_id);
  if (!referrer || referrer.id === partnerId || !approved(alchemists, partnerId)) return { ok: false };
  const deal = (await store.list('referral_agreements')).find((a) => a.status === 'active' && a.referrer_id === referrer.id && a.partner_id === partnerId);
  return deal ? { ok: true, referrer: { id: referrer.id, name: referrer.name }, percent: deal.percent, code: found.code } : { ok: false };
}

/** Removes a profile's code and agreements (when the profile is deleted). */
export async function removeProfileReferrals(store, profileId) {
  await store.remove('referral_codes', profileId);
  for (const a of await store.list('referral_agreements')) if (a.partner_id === profileId || a.referrer_id === profileId) await store.remove('referral_agreements', a.id);
}
