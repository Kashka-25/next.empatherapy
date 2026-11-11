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

export async function createSession(secret, ttlSeconds = 8 * 3600, nowMs = Date.now()) {
  if (!secret || secret.length < MIN_SECRET_LENGTH) throw new Error(`Session secret must be at least ${MIN_SECRET_LENGTH} characters.`);
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const body = `v1.${exp}.${nonce}`;
  return `${body}.${await sign(secret, body)}`;
}

export async function verifySession(token, secret, nowMs = Date.now()) {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH || typeof token !== 'string' || token.length > 300) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const [, exp, nonce, sig] = parts;
  if (!/^\d+$/.test(exp) || Number(exp) < Math.floor(nowMs / 1000)) return false;
  return safeEqual(sig, await sign(secret, `v1.${exp}.${nonce}`));
}

export const SESSION_COOKIE = 'empatherapy_admin';
