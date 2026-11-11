/**
 * A small sliding-window rate limiter, kept in memory.
 * Good enough to slow guessing and spam on a single server. On serverless hosting each instance has its own
 * memory, so production should move this to a shared store (see docs/ADMIN.md).
 */
export function createLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    check(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      return { ok: true };
    },
    reset(key) { hits.delete(key); },
  };
}

/** Best-effort client address from standard proxy headers. */
export function clientKey(headers) {
  const fwd = headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : headers.get('x-real-ip')) || 'unknown';
}

/**
 * A rate limiter that keeps its counts in the store, so every server instance shares them
 * (the in-memory limiter above only sees its own traffic). Falls back to memory when storage is off.
 * Keys are hashed before they are stored, so no raw addresses or email addresses are kept.
 * Not perfectly atomic: two simultaneous requests could both slip under the line. That is fine for
 * slowing guessing and spam; it is not a security boundary on its own.
 */
import { createHash } from 'node:crypto';

export const RATELIMIT_COLLECTION = 'ratelimits';

export function createSharedLimiter({ name, max, windowMs, getStore }) {
  const fallback = createLimiter({ max, windowMs });
  const idFor = (key) => createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 40);
  return {
    async check(key, now = Date.now()) {
      const store = getStore();
      if (!store) return fallback.check(key, now);
      const id = idFor(key);
      const rec = await store.get(RATELIMIT_COLLECTION, id);
      const recent = (rec?.hits ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
      recent.push(now);
      await store.put(RATELIMIT_COLLECTION, { id, hits: recent, window_ms: windowMs });
      return { ok: true };
    },
    async reset(key) {
      const store = getStore();
      if (!store) return fallback.reset(key);
      await store.remove(RATELIMIT_COLLECTION, idFor(key));
    },
  };
}
