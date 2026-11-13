import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store/index.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { checkCode } from '@/lib/referrals.mjs';
import { createSharedLimiter, clientKey } from '@/lib/ratelimit.mjs';

export const dynamic = 'force-dynamic';

const limiter = createSharedLimiter({ name: 'referral-check', max: 10, windowMs: 60 * 60 * 1000, getStore });
const json = (body, status = 200, headers) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * "Does this code give me a discount here?" Used by the enquiry form before sending. Limited per address so codes
 * cannot be guessed, and the answer is only yes or no: it never says which part failed.
 */
export async function GET(request) {
  const store = getStore();
  if (!store) return json({ applies: false });
  const limit = await limiter.check(clientKey(request.headers));
  if (!limit.ok) return json({ error: 'too_many' }, 429, { 'Retry-After': String(limit.retryAfterSeconds) });
  const { searchParams } = new URL(request.url);
  const { alchemists } = await publicContent(store);
  const hit = await checkCode(store, String(searchParams.get('code') ?? ''), String(searchParams.get('to') ?? ''), alchemists);
  return json(hit.ok ? { applies: true, percent: hit.percent, referrer: hit.referrer.name } : { applies: false });
}
