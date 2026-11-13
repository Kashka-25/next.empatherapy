/**
 * How long Alchemist applications are kept. Proposed rule, for Cassidy to confirm (see docs/ADMIN.md):
 *   declined applications     deleted 90 days after they were declined
 *   every other application   deleted 12 months after they were last touched
 *   rate-limit counters       deleted after 2 days (they only hold hashed keys and timestamps)
 *   activity log entries      deleted after 12 months (staff actions only, never applicant details)
 *   enquiries from Seekers    deleted 6 months after they were last touched (a proposal, to confirm)
 * Nothing is deleted automatically: an owner runs the clean-up from /admin/retention and sees the numbers first.
 */
import { RATELIMIT_COLLECTION } from './ratelimit.mjs';
import { AUDIT_COLLECTION, AUDIT_DAYS } from './audit.mjs';

export const RETENTION_DAYS = { declined: 90, other: 365, ratelimits: 2, audit: AUDIT_DAYS, enquiries: 180 };
const DAY = 24 * 60 * 60 * 1000;

const age = (rec, now) => now - Date.parse(rec.updated_at ?? rec.created_at ?? 0);

export async function findExpired(store, now = Date.now()) {
  const applications = (await store.list('applications')).filter((a) => age(a, now) > (a.status === 'declined' ? RETENTION_DAYS.declined : RETENTION_DAYS.other) * DAY);
  const counters = (await store.list(RATELIMIT_COLLECTION)).filter((r) => age(r, now) > RETENTION_DAYS.ratelimits * DAY);
  const audit = (await store.list(AUDIT_COLLECTION)).filter((e) => now - Date.parse(e.at ?? e.created_at ?? 0) > RETENTION_DAYS.audit * DAY);
  const enquiries = (await store.list('enquiries')).filter((e) => age(e, now) > RETENTION_DAYS.enquiries * DAY);
  return { applications, counters, audit, enquiries };
}

export async function purgeExpired(store, now = Date.now()) {
  const { applications, counters, audit, enquiries } = await findExpired(store, now);
  for (const a of applications) await store.remove('applications', a.id);
  for (const r of counters) await store.remove(RATELIMIT_COLLECTION, r.id);
  for (const e of audit) await store.remove(AUDIT_COLLECTION, e.id);
  for (const e of enquiries) await store.remove('enquiries', e.id);
  return { applications: applications.length, counters: counters.length, audit: audit.length, enquiries: enquiries.length };
}
