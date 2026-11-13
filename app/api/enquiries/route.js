import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store/index.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { submitEnquiry } from '@/lib/enquiries.mjs';
import { notifyEnquiry } from '@/lib/notify.mjs';
import { hasPortal } from '@/lib/accounts.mjs';
import { checkCode } from '@/lib/referrals.mjs';
import { createSharedLimiter, clientKey } from '@/lib/ratelimit.mjs';

export const dynamic = 'force-dynamic';

const byAddress = createSharedLimiter({ name: 'enquire', max: 3, windowMs: 60 * 60 * 1000, getStore });
const byEmail = createSharedLimiter({ name: 'enquire-email', max: 5, windowMs: 24 * 60 * 60 * 1000, getStore });
const MAX_BYTES = 10_000;
const json = (body, status, headers) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * Receives an enquiry for an Alchemist. Closed (503) until storage is on, so the public form stays a preview.
 * Checks: same origin, size, rate limits, spam trap, a public non-example Alchemist, validation and consent.
 * Stores first, then emails (best effort). Never echoes the message back.
 */
export async function POST(request) {
  const store = getStore();
  if (!store) return json({ error: 'not_open' }, 503);

  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) return json({ error: 'forbidden' }, 403);

  const limit = await byAddress.check(clientKey(request.headers));
  if (!limit.ok) return json({ error: 'too_many' }, 429, { 'Retry-After': String(limit.retryAfterSeconds) });

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json({ error: 'too_large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'bad_request' }, 400);

  if (body.website_url) return json({ ok: true, support: false }, 201); // spam trap: pretend it worked, store nothing

  const emailKey = String(body.email ?? '').trim().toLowerCase();
  if (emailKey && !(await byEmail.check(emailKey)).ok) return json({ error: 'too_many' }, 429);

  const { alchemists } = await publicContent(store);
  const alchemist = alchemists.find((a) => a.id === body.alchemist_id);
  const portal = alchemist ? await hasPortal(store, alchemist.id) : false;
  // An optional referral code. It only counts if it gives a discount at this Alchemist; either way the message is sent.
  let referral;
  let referralStatus;
  if (alchemist && typeof body.referral_code === 'string' && body.referral_code.trim()) {
    const hit = await checkCode(store, body.referral_code, alchemist.id, alchemists);
    referralStatus = hit.ok ? 'applied' : 'not_applied';
    if (hit.ok) referral = { code: hit.code, referrer_id: hit.referrer.id, referrer_name: hit.referrer.name, percent: hit.percent };
  }
  const result = alchemist && !alchemist.enquiry_email && !portal ? { ok: false, reason: 'unavailable' } : await submitEnquiry(store, alchemist, body, new Date(), { referral });
  if (!result.ok) {
    if (result.reason === 'invalid') return json({ error: 'invalid', errors: result.errors }, 400);
    if (result.reason === 'unavailable') return json({ error: 'unavailable' }, 404);
    return json({ error: 'not_open' }, 503);
  }

  // Stored. Now tell people. A mail problem must never lose or fail the enquiry.
  try {
    const notified = await notifyEnquiry(result.record, alchemist, process.env, globalThis.fetch, { portal });
    await store.put('enquiries', { ...result.record, notified });
  } catch (e) {
    console.error('Enquiry notification failed:', e.message);
  }
  return json({ ok: true, support: result.support, ...(referralStatus ? { referral: referralStatus } : {}), ...(referral ? { percent: referral.percent, referrer: referral.referrer_name } : {}) }, 201);
}
