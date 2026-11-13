/**
 * Changes an Alchemist proposes to their own profile. Nothing they write goes public by itself: the live profile stays
 * as it is until a person on the team has read the changes and approved them.
 *
 * A proposal stores only the fields that differ (as editor form values), so approving merges it onto the profile as it is
 * *now*, even if the team edited something else in the meantime. Approving runs every normal publishing rule again.
 * Who is verified and whether a profile is published are not theirs to change.
 */
import { alchemistToForm, validateAlchemist } from './admin-content.mjs';

export const LOCKED_KEYS = ['publication_status', 'verification_status', 'featured_status', 'featured_rank'];

/** Changing these affects what the team verified: approving them deserves a second look. */
export const CHECK_KEYS = ['qualifications', 'modalities', 'training', 'experience', 'pricing_from', 'pricing_sessions', 'safety_information', 'delivery_formats'];

export const FIELD_LABEL = {
  name: 'Name', title: 'Title', offering_name: 'Name of their offering', tagline: 'Tagline', short_bio: 'Short bio',
  personal_story: 'Personal story', what_brought_me: 'What brought them to this work', pull_quote: 'Featured line', philosophy: 'Philosophy',
  modalities: 'Practices', approach_tags: 'Approach', interests: 'Interests', qualifications: 'Qualifications', training: 'Training and study',
  experience: 'Experience', suits: 'Who it may suit', outcomes: 'What people may take away', session_steps: 'A typical session',
  delivery_formats: 'How they work', location_label: 'Location', location_region: 'Region', location_note: 'Location note',
  pricing_from: 'Sessions from', pricing_note: 'Price note', pricing_sessions: 'Sessions and prices', safety_information: 'Safety information',
  enquiry_email: 'Enquiry email', website: 'Website',
};

const norm = (v) => (Array.isArray(v) ? [...v].sort().join('|') : String(v ?? ''));

/** The form keys whose values differ. */
export function changedKeys(liveForm, nextForm) {
  return Object.keys(nextForm).filter((k) => !LOCKED_KEYS.includes(k) && norm(liveForm[k]) !== norm(nextForm[k]));
}

/** What the Alchemist sees in their editor: the live profile with their own waiting proposal laid over it. */
export function editorValues(profile) {
  return { ...alchemistToForm(profile), ...(profile.pending?.form ?? {}) };
}

/**
 * Checks a submitted form and, if valid, makes the proposal.
 * @returns {{ok:false, errors:object} | {ok:true, same:true} | {ok:true, pending:object}}
 */
export function propose(profile, raw, ctx, who, now = new Date()) {
  const live = alchemistToForm(profile);
  const form = { ...raw };
  for (const k of LOCKED_KEYS) form[k] = live[k]; // never theirs to change, whatever was sent
  const { pending: _p, ...base } = profile;
  const v = validateAlchemist(form, base, ctx);
  if (!v.valid) return { ok: false, errors: v.errors };
  const nextForm = alchemistToForm(v.record);
  const changed = changedKeys(live, nextForm);
  if (!changed.length) return { ok: true, same: true };
  return { ok: true, pending: { submitted_at: now.toISOString(), by: who.id, by_name: who.name, changed, form: Object.fromEntries(changed.map((k) => [k, nextForm[k]])) } };
}

/**
 * Merges a proposal onto the profile as it is now and checks it. Returns the record to store (without the proposal)
 * or the errors that stop it.
 */
export function approve(profile, ctx, reviewer, now = new Date()) {
  const { pending, ...base } = profile;
  if (!pending) return { ok: false, reason: 'nothing_waiting' };
  const merged = { ...alchemistToForm(base), ...pending.form };
  const v = validateAlchemist(merged, base, ctx);
  if (!v.valid) return { ok: false, reason: 'invalid', errors: v.errors };
  return { ok: true, record: { ...v.record, last_review: { at: now.toISOString(), status: 'approved', by: reviewer.name } } };
}

export function reject(profile, note, reviewer, now = new Date()) {
  const { pending, ...base } = profile;
  if (!pending) return { ok: false, reason: 'nothing_waiting' };
  const text = String(note ?? '').replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
  return { ok: true, record: { ...base, last_review: { at: now.toISOString(), status: 'rejected', by: reviewer.name, note: text } } };
}

/** For the team: each changed field with the old and new value, trimmed, and whether it deserves a second look. */
export function describeChanges(profile) {
  if (!profile.pending) return [];
  const live = alchemistToForm(profile);
  const show = (v) => { const s = Array.isArray(v) ? v.join(', ') : String(v ?? ''); return s.length > 400 ? `${s.slice(0, 400)}…` : s; };
  return profile.pending.changed.map((k) => ({ key: k, label: FIELD_LABEL[k] ?? k, before: show(live[k]), after: show(profile.pending.form[k]), check: CHECK_KEYS.includes(k) }));
}
