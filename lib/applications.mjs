/**
 * Alchemist applications: submit, review, delete. Storage-agnostic (takes a store).
 *
 * Privacy: only what the form asks for is kept, plus the time consent was given. Applicants can ask for deletion
 * and an admin can remove a record permanently. Nothing here ever publishes a profile: approving an application
 * only marks it ready for a person to create the profile.
 */
import { validateApplication } from './validation.mjs';

export const STATUSES = ['new', 'in_review', 'approved', 'declined'];
export const STATUS_LABEL = { new: 'New', in_review: 'In review', approved: 'Approved', declined: 'Declined' };
export const MAX_APPLICATIONS = 500; // stops spam from filling the disk

export async function submitApplication(store, raw, now = new Date()) {
  const v = validateApplication(raw);
  if (!v.valid) return { ok: false, reason: 'invalid', errors: v.errors };
  if ((await store.list('applications')).length >= MAX_APPLICATIONS) return { ok: false, reason: 'full' };
  const rec = await store.put('applications', { status: 'new', data: v.data, consent_at: now.toISOString(), review_notes: '' });
  return { ok: true, id: rec.id };
}

export async function listApplications(store) {
  return (await store.list('applications')).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function reviewApplication(store, id, { status, notes } = {}) {
  if (status !== undefined && !STATUSES.includes(status)) return { ok: false, reason: 'bad_status' };
  const rec = await store.get('applications', id);
  if (!rec) return { ok: false, reason: 'not_found' };
  const next = { ...rec };
  if (status !== undefined) next.status = status;
  if (notes !== undefined) next.review_notes = String(notes).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 2000);
  return { ok: true, record: await store.put('applications', next) };
}

/** Permanent deletion, for data-deletion requests. */
export const removeApplication = (store, id) => store.remove('applications', id);
