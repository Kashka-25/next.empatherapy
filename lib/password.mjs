/**
 * Password hashing with scrypt (built into Node, no dependency).
 * The admin password is never stored. Only a salted hash goes in ADMIN_PASSWORD_HASH.
 * Format: scrypt:<N>:<r>:<p>:<salt base64>:<hash base64>
 * (colons, not dollar signs, so the value is safe in .env files)
 */
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const N = 16384, R = 8, P = 1, KEYLEN = 64;
const derive = (password, salt, n, r, p) => new Promise((res, rej) => scrypt(password, salt, KEYLEN, { N: n, r, p }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Use a password of at least 12 characters.');
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt:${N}:${R}:${P}:${salt.toString('base64')}:${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  try {
    if (typeof password !== 'string' || typeof stored !== 'string' || password.length > 200) return false;
    const [scheme, n, r, p, saltB64, hashB64] = stored.split(':');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await derive(password, Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
