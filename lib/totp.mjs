/**
 * Time-based one-time codes (RFC 6238, the standard behind Google Authenticator, Authy, 1Password and others),
 * built on Node's own crypto with no dependency.
 *
 *   secret    20 random bytes, shown to the person as base32 text to type into their authenticator app
 *   code      6 digits that change every 30 seconds
 *   accepts   the current step, plus one step either side to forgive clock drift
 *   replay    a code can only be used once: callers keep the last accepted step and pass it as `after`
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const STEP_SECONDS = 30;
export const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  const clean = String(text ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!clean || /[^A-Z2-7]/.test(clean)) throw new Error('Invalid base32.');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const generateSecret = () => base32Encode(randomBytes(20));

/** The 6-digit code for a given step counter. */
export function hotp(secretBase32, counter, digits = DIGITS) {
  const key = base32Decode(secretBase32);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', key).update(msg).digest();
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export const stepAt = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / STEP_SECONDS);
export const totpAt = (secretBase32, nowMs = Date.now()) => hotp(secretBase32, stepAt(nowMs));

const sameCode = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * The step a code matches, or null. `after` is the last step already used; anything at or before it is refused,
 * so a code seen over someone's shoulder (or replayed) cannot be used again.
 */
export function verifyTotp(secretBase32, input, nowMs = Date.now(), { after = -1, window = 1 } = {}) {
  const code = String(input ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const now = stepAt(nowMs);
  let hit = null;
  for (let s = now - window; s <= now + window; s++) {
    if (s <= after || s < 0) continue;
    if (sameCode(hotp(secretBase32, s), code)) hit = s; // no early exit, so timing does not hint at which step matched
  }
  return hit;
}

/** The link authenticator apps understand (also usable as a QR code later). */
export function otpauthUri({ secret, account, issuer = 'Empatherapy' }) {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** The secret in groups of four, easier to read and type. */
export const groupSecret = (secret) => secret.match(/.{1,4}/g).join(' ');

/* ---------- recovery codes: for a lost phone ---------- */
export const RECOVERY_COUNT = 8;
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (i, l, o, 0, 1)

/** Eight codes like "k7m2-9qpd-x4ha", 12 characters each. Shown once; only hashes are stored. */
export function generateRecoveryCodes(count = RECOVERY_COUNT) {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(12);
    const raw = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  });
}

/** Lower case, no spaces or dashes, so "K7M2 9QPD X4HA" matches "k7m2-9qpd-x4ha". */
export const normaliseRecoveryCode = (c) => String(c ?? '').toLowerCase().replace(/[\s-]/g, '');
export const looksLikeRecoveryCode = (c) => /^[a-z0-9]{12}$/.test(normaliseRecoveryCode(c));
