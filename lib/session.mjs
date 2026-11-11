/**
 * Signed, expiring session tokens using Web Crypto (HMAC-SHA256).
 * Works in the Node server and in Next middleware (edge runtime), so route protection and server actions
 * check the same token. The token carries no personal data: only an expiry and a random nonce.
 *
 *   v1.<expires-unix-seconds>.<nonce>.<signature>
 */
const enc = new TextEncoder();

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

/** Compare without leaking where the first difference is. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const MIN_SECRET_LENGTH = 32;

/**
 * Tokens come in two shapes. v1 has no identity (the single bootstrap password). v2 names the account and role:
 *   v2.<expires>.<nonce>.<account id>.<role>.<signature>
 * The role in a token is only a hint for routing: server actions always re-read the account from the store.
 */
export async function createSession(secret, ttlSeconds = 8 * 3600, nowMs = Date.now(), who = null) {
  if (!secret || secret.length < MIN_SECRET_LENGTH) throw new Error(`Session secret must be at least ${MIN_SECRET_LENGTH} characters.`);
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  let body = `v1.${exp}.${nonce}`;
  if (who) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(who.sub) || !/^[a-z]{3,12}$/.test(who.role)) throw new Error('Invalid session identity.');
    body = `v2.${exp}.${nonce}.${who.sub}.${who.role}`;
  }
  return `${body}.${await sign(secret, body)}`;
}

/** The identity inside a valid token, or null. A v1 token is the bootstrap owner. */
export async function readSession(token, secret, nowMs = Date.now()) {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH || typeof token !== 'string' || token.length > 400) return null;
  const parts = token.split('.');
  const version = parts[0];
  if (!((version === 'v1' && parts.length === 4) || (version === 'v2' && parts.length === 6))) return null;
  const sig = parts[parts.length - 1];
  const body = parts.slice(0, -1).join('.');
  const exp = parts[1];
  if (!/^\d+$/.test(exp) || Number(exp) < Math.floor(nowMs / 1000)) return null;
  if (!safeEqual(sig, await sign(secret, body))) return null;
  return version === 'v1' ? { sub: 'bootstrap', role: 'owner' } : { sub: parts[3], role: parts[4] };
}

export async function verifySession(token, secret, nowMs = Date.now()) {
  return (await readSession(token, secret, nowMs)) !== null;
}

export const SESSION_COOKIE = 'empatherapy_admin';
