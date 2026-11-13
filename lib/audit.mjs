/**
 * An activity log: who changed what, and when. Written by the admin actions, read by owners at /admin/activity.
 *
 * It records staff actions, never personal details of applicants or Seekers: no emails, no application text, no
 * passwords. A summary says what happened in a few plain words ("Published Sam Example"). Entries are kept for
 * 12 months, then removed by the owner clean-up (lib/retention.mjs).
 *
 * Logging never blocks the work: if the log cannot be written, the action still succeeds and the failure is noted
 * in the server log.
 */
export const AUDIT_COLLECTION = 'audit';
export const AUDIT_DAYS = 365;

export const ACTION_LABEL = {
  sign_in: 'Signed in',
  account_created: 'Account created',
  account_changed: 'Account changed',
  password_changed: 'Password changed',
  two_step_changed: 'Two-step sign-in changed',
  enquiry_updated: 'Enquiry updated',
  post_saved: 'Post saved',
  post_reviewed: 'Post reviewed',
  post_removed: 'Post deleted',
  profile_change_proposed: 'Profile changes sent for review',
  profile_change_reviewed: 'Profile changes reviewed',
  enquiry_deleted: 'Enquiry deleted',
  commission_rate_set: 'Illustration rate set',
  application_updated: 'Application updated',
  application_deleted: 'Application deleted',
  profile_draft_created: 'Draft profile created',
  alchemist_saved: 'Profile saved',
  alchemist_removed: 'Profile reset or deleted',
  photo_changed: 'Photos changed',
  modality_saved: 'Modality saved',
  modality_removed: 'Modality reset or deleted',
  feature_changed: 'Weekly feature changed',
  retention_purge: 'Clean-up run',
};

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export async function recordAudit(store, actor, action, target, summary, now = new Date().toISOString()) {
  if (!store) return null;
  return store.put(AUDIT_COLLECTION, {
    at: now,
    actor_id: clean(actor?.id, 64) || 'unknown',
    actor_name: clean(actor?.name, 80) || 'Unknown',
    actor_role: clean(actor?.role, 12),
    action: clean(action, 40),
    target: clean(target, 80),
    summary: clean(summary, 300),
  });
}

/** Newest first. */
export async function listAudit(store, limit = 200) {
  if (!store) return [];
  return (await store.list(AUDIT_COLLECTION)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** A few plain words for a profile or modality save: created, published, unpublished, or edited. */
export function describeSave(existing, record, noun = 'profile') {
  const was = existing?.publication_status === 'published';
  const now = record.publication_status === 'published';
  let verb = existing ? 'Edited' : 'Created';
  if (existing && now && !was) verb = 'Published';
  else if (existing && !now && was) verb = 'Unpublished';
  else if (!existing && now) verb = 'Created and published';
  let out = `${verb} ${noun} ${record.name}`;
  if (existing && existing.verification_status !== undefined && record.verification_status !== existing.verification_status) out += `. Verification: ${existing.verification_status} to ${record.verification_status}`;
  return out;
}

export const PHOTO_INTENT = { approve: 'Approved a photo', save: 'Edited the description of a photo', primary: 'Chose a new profile picture', left: 'Moved a photo earlier', right: 'Moved a photo later', remove: 'Removed a photo' };
