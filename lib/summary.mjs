/**
 * "What Empatherapy brought you": an Alchemist's own enquiries, replies, bookings and referrals, in plain numbers.
 *
 * Honest by construction: it counts only what is recorded here and says so. Outcomes are what the Alchemist reported.
 * Empatherapy does not track who visits a profile, so there are no view counts. Referral figures are counts only, and
 * never say who used a code.
 */
const DAY = 24 * 60 * 60 * 1000;
export const PERIODS = { '90': { days: 90, label: 'Last 90 days' }, '365': { days: 365, label: 'Last 12 months' }, all: { days: null, label: 'All time' } };

const within = (e, now, days) => days === null || now - Date.parse(e.created_at) <= days * DAY;
const round2 = (n) => Math.round(n * 100) / 100;

export function medianHours(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2) * 10) / 10;
}

/**
 * @param enquiries  every enquiry (only counts leave this function)
 * @param profileId  whose summary
 */
export function summarise(enquiries, profileId, { now = Date.now(), period = '365' } = {}) {
  const days = (PERIODS[period] ?? PERIODS['365']).days;
  const mine = enquiries.filter((e) => e.alchemist_id === profileId && within(e, now, days));
  const replied = mine.filter((e) => e.status === 'replied' || e.status === 'booked');
  const booked = mine.filter((e) => e.status === 'booked');
  const withFee = booked.filter((e) => typeof e.first_session_fee === 'number');
  const replyHours = mine.filter((e) => e.replied_at).map((e) => (Date.parse(e.replied_at) - Date.parse(e.created_at)) / 3_600_000).filter((h) => h >= 0);
  const stillWaiting = mine.filter((e) => e.status === 'new' && now - Date.parse(e.created_at) > 3 * DAY).length;
  const viaCode = mine.filter((e) => e.referral);
  const usedMyCode = enquiries.filter((e) => e.referral?.referrer_id === profileId && within(e, now, days));
  return {
    period, label: (PERIODS[period] ?? PERIODS['365']).label,
    enquiries: mine.length,
    replied: replied.length,
    booked: booked.length,
    firstSessions: { count: withFee.length, total: round2(withFee.reduce((n, e) => n + e.first_session_fee, 0)) },
    medianReplyHours: medianHours(replyHours),
    stillWaiting,
    cameWithACode: viaCode.length,
    myCodeUsed: { enquiries: usedMyCode.length, booked: usedMyCode.filter((e) => e.status === 'booked').length },
  };
}

/** The last `months` calendar months, oldest first, counting enquiries and bookings. */
export function monthlySeries(enquiries, profileId, { now = Date.now(), months = 6 } = {}) {
  const d = new Date(now);
  const keys = Array.from({ length: months }, (_, i) => { const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (months - 1 - i), 1)); return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`; });
  const rows = new Map(keys.map((k) => [k, { month: k, enquiries: 0, booked: 0 }]));
  for (const e of enquiries) {
    if (e.alchemist_id !== profileId) continue;
    const r = rows.get(String(e.created_at).slice(0, 7));
    if (!r) continue;
    r.enquiries += 1;
    if (e.status === 'booked') r.booked += 1;
  }
  return [...rows.values()];
}

/** Break-even in plain arithmetic: how many booked sessions, at their own average first-session amount, cover a fee. Null without data. */
export function sessionsToCover(fee, summary) {
  if (!summary.firstSessions.count) return null;
  const avg = summary.firstSessions.total / summary.firstSessions.count;
  return avg > 0 ? Math.round((fee / avg) * 10) / 10 : null;
}
