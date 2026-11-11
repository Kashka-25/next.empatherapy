import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store/index.mjs';
import { submitApplication } from '@/lib/applications.mjs';
import { createLimiter, clientKey } from '@/lib/ratelimit.mjs';

export const dynamic = 'force-dynamic';

const limiter = createLimiter({ max: 3, windowMs: 60 * 60 * 1000 });
const MAX_BYTES = 20_000;
const json = (body, status, headers) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * Receives an Alchemist application. Closed (503) until storage is switched on, so the public form
 * keeps working as a preview. Checks: same origin, size, rate limit, spam trap, validation.
 * Never echoes submitted data back.
 */
export async function POST(request) {
  const store = getStore();
  if (!store) return json({ error: 'not_open' }, 503);

  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) return json({ error: 'forbidden' }, 403);

  const limit = limiter.check(clientKey(request.headers));
  if (!limit.ok) return json({ error: 'too_many' }, 429, { 'Retry-After': String(limit.retryAfterSeconds) });

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json({ error: 'too_large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'bad_request' }, 400);

  if (body.website_url) return json({ ok: true }, 201); // spam trap: pretend it worked, store nothing

  const result = await submitApplication(store, body);
  if (result.ok) return json({ ok: true }, 201);
  if (result.reason === 'invalid') return json({ error: 'invalid', errors: result.errors }, 400);
  return json({ error: 'not_open' }, 503);
}
