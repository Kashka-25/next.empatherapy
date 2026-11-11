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
