import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDriver } from '../lib/store/index.mjs';
import { base32Encode, base32Decode, generateSecret, hotp, totpAt, verifyTotp, otpauthUri, groupSecret, generateRecoveryCodes, normaliseRecoveryCode, looksLikeRecoveryCode, stepAt } from '../lib/totp.mjs';
import { createAccount, authenticate, touchLogin, beginTotp, pendingTotp, cancelTotp, confirmTotp, disableTotp, checkSecondFactor, updateAccount, listAccounts, activeAccount, safeAccount } from '../lib/accounts.mjs';
import { createSession, readSession } from '../lib/session.mjs';

// RFC 6238 test secret: the ASCII text 12345678901234567890
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

test('totp: matches the published RFC 6238 test vectors (6-digit endings)', () => {
  assert.equal(RFC_SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  for (const [seconds, code] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130']]) {
    assert.equal(totpAt(RFC_SECRET, seconds * 1000), code, `t=${seconds}`);
  }
});

test('totp: base32 round trips and rejects junk', () => {
  for (const len of [1, 5, 10, 20, 31]) { const b = Buffer.from(Array.from({ length: len }, (_, i) => (i * 37 + 11) & 255)); assert.deepEqual(base32Decode(base32Encode(b)), b); }
  assert.deepEqual(base32Decode('gezd gnbv-GY3T'), base32Decode('GEZDGNBVGY3T'), 'case, spaces and dashes are forgiven');
  assert.throws(() => base32Decode('not base32!'), /Invalid base32/);
  assert.throws(() => base32Decode(''), /Invalid base32/);
});

test('totp: a generated secret is 32 characters of base32 and different each time', () => {
  const a = generateSecret(), b = generateSecret();
  assert.match(a, /^[A-Z2-7]{32}$/);
  assert.notEqual(a, b);
  assert.equal(groupSecret(a).replace(/ /g, ''), a);
  assert.equal(groupSecret(a).split(' ').length, 8);
});

test('totp: codes are accepted for the current step and one either side, no further', () => {
  const now = 1_700_000_000_000;
  const at = (offset) => hotp(RFC_SECRET, stepAt(now) + offset);
  assert.equal(verifyTotp(RFC_SECRET, at(0), now), stepAt(now));
  assert.equal(verifyTotp(RFC_SECRET, at(-1), now), stepAt(now) - 1, 'a little behind');
  assert.equal(verifyTotp(RFC_SECRET, at(1), now), stepAt(now) + 1, 'a little ahead');
  assert.equal(verifyTotp(RFC_SECRET, at(-2), now), null);
  assert.equal(verifyTotp(RFC_SECRET, at(2), now), null);
  assert.equal(verifyTotp(RFC_SECRET, ` ${at(0).slice(0, 3)} ${at(0).slice(3)} `, now), stepAt(now), 'spaces are fine');
});

test('totp: a code cannot be used twice, and malformed input is refused', () => {
  const now = 1_700_000_000_000;
  const code = totpAt(RFC_SECRET, now);
  const step = verifyTotp(RFC_SECRET, code, now);
  assert.equal(verifyTotp(RFC_SECRET, code, now, { after: step }), null, 'replay refused');
  assert.equal(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, step + 1), now, { after: step }), step + 1, 'the next code still works');
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined, '12 34 5', '١٢٣٤٥٦']) assert.equal(verifyTotp(RFC_SECRET, bad, now), null);
});

test('totp: the setup link carries what an authenticator app needs', () => {
  const uri = otpauthUri({ secret: 'ABCDEFGH', account: 'sam@example.com' });
  assert.ok(uri.startsWith('otpauth://totp/Empatherapy:sam%40example.com?'));
  for (const part of ['secret=ABCDEFGH', 'issuer=Empatherapy', 'digits=6', 'period=30', 'algorithm=SHA1']) assert.ok(uri.includes(part), part);
});

test('recovery codes: eight, unique, readable, and forgiving to type', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  for (const c of codes) { assert.match(c, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/); assert.ok(!/[ilo01]/.test(c), 'no look-alike characters'); assert.equal(looksLikeRecoveryCode(c), true); }
  assert.equal(normaliseRecoveryCode(' K7M2 9QPD-x4ha '), 'k7m29qpdx4ha');
  assert.equal(looksLikeRecoveryCode('123456'), false, 'a 6-digit app code is never taken for a recovery code');
});

/* ---------- accounts ---------- */
const make = async (store) => (await createAccount(store, { email: 'sam@example.com', name: 'Sam', role: 'owner', password: 'a-long-enough-password' })).account;

async function turnOn(store, id, now = 1_700_000_000_000) {
  const { secret } = await beginTotp(store, id);
  const r = await confirmTotp(store, id, totpAt(secret, now), now);
  return { secret, recoveryCodes: r.recoveryCodes, now, r };
}

test('two-step: setup is not active until a correct code proves the app works', async () => {
  const store = createMemoryDriver();
  const a = await make(store);
  assert.equal(a.two_step, false);
  const { secret } = await beginTotp(store, a.id);
  assert.equal(await pendingTotp(store, a.id), secret);
  assert.equal((await activeAccount(store, a.id)).two_step, false, 'pending is not on');
  assert.equal((await confirmTotp(store, a.id, '000000', 1_700_000_000_000)).reason, 'bad_code');
  assert.equal((await activeAccount(store, a.id)).two_step, false);
  const done = await confirmTotp(store, a.id, totpAt(secret, 1_700_000_000_000), 1_700_000_000_000);
  assert.equal(done.ok, true);
  assert.equal(done.recoveryCodes.length, 8);
  assert.equal((await activeAccount(store, a.id)).two_step, true);
  assert.equal(await pendingTotp(store, a.id), null, 'the pending secret is gone');
  assert.equal((await beginTotp(store, a.id)).reason, 'already_on');
  assert.equal((await confirmTotp(store, 'missing', '123456')).reason, 'not_started');
});

test('two-step: secrets and recovery hashes never leave the account record', async () => {
  const store = createMemoryDriver();
  const a = await make(store);
  const on = await turnOn(store, a.id);
  const listed = JSON.stringify(await listAccounts(store)) + JSON.stringify(await activeAccount(store, a.id)) + JSON.stringify(safeAccount(await store.get('admins', a.id)));
  assert.ok(!listed.includes(on.secret), 'no secret');
  assert.ok(!listed.includes('scrypt'), 'no hashes');
  assert.ok(!listed.includes('recovery_hashes') && !listed.includes('totp_'));
  const stored = await store.get('admins', a.id);
  assert.ok(stored.recovery_hashes.every((h) => h.startsWith('scrypt:')), 'recovery codes are stored only as hashes');
  assert.ok(!JSON.stringify(stored).includes(on.recoveryCodes[0].replace(/-/g, '')));
});

test('two-step: sign-in needs a current code, each code works once', async () => {
  const store = createMemoryDriver();
  const a = await make(store);
  const on = await turnOn(store, a.id);
  const later = on.now + 5 * 60 * 1000;
  const code = totpAt(on.secret, later);
  assert.deepEqual(await checkSecondFactor(store, a.id, '123456', later), { ok: false });
  assert.deepEqual(await checkSecondFactor(store, a.id, code, later), { ok: true, via: 'app' });
  assert.deepEqual(await checkSecondFactor(store, a.id, code, later), { ok: false }, 'the same code twice is refused');
  assert.equal((await checkSecondFactor(store, a.id, hotp(on.secret, stepAt(later) + 1), later)).ok, true, 'the next code is fine');
  assert.deepEqual(await checkSecondFactor(store, a.id, totpAt(on.secret, on.now), on.now), { ok: false }, 'and an older code cannot be reused after a newer one');
});

test('two-step: a recovery code signs you in once, then is spent', async () => {
  const store = createMemoryDriver();
  const a = await make(store);
  const on = await turnOn(store, a.id);
  const [first, second] = on.recoveryCodes;
  const r = await checkSecondFactor(store, a.id, first.toUpperCase().replace(/-/g, ' '), on.now);
  assert.deepEqual(r, { ok: true, via: 'recovery', remaining: 7 });
  assert.equal((await checkSecondFactor(store, a.id, first, on.now)).ok, false, 'spent');
  assert.equal((await checkSecondFactor(store, a.id, second, on.now)).remaining, 6, 'others still work');
  assert.equal((await checkSecondFactor(store, a.id, 'abcd-efgh-jkmn', on.now)).ok, false, 'a wrong recovery code');
});

test('two-step: turning it off, owner reset, and inactive or unprotected accounts', async () => {
  const store = createMemoryDriver();
  const a = await make(store);
  assert.equal((await checkSecondFactor(store, a.id, '123456')).ok, false, 'no two-step set up: nothing to check');
  const on = await turnOn(store, a.id);
  await disableTotp(store, a.id);
  assert.equal((await activeAccount(store, a.id)).two_step, false);
  assert.equal((await checkSecondFactor(store, a.id, totpAt(on.secret, on.now), on.now)).ok, false);
  const again = await turnOn(store, a.id, on.now + 600_000);
  const second = (await createAccount(store, { email: 'o2@example.com', name: 'Second Owner', role: 'owner', password: 'second-owner-password' })).account;
  assert.equal((await updateAccount(store, a.id, { resetTwoStep: true })).account.two_step, false, 'an owner can reset a locked-out person');
  assert.equal((await checkSecondFactor(store, a.id, totpAt(again.secret, again.now + 600_000), again.now + 600_000)).ok, false);
  const t = await turnOn(store, second.id);
  await updateAccount(store, second.id, { active: false });
  assert.equal((await checkSecondFactor(store, second.id, totpAt(t.secret, t.now), t.now)).ok, false, 'a deactivated account cannot pass');
  await beginTotp(store, a.id); await cancelTotp(store, a.id);
  assert.equal(await pendingTotp(store, a.id), null);
});

test('two-step: checking the password alone does not count as signing in', async () => {
  const store = createMemoryDriver();
  const a = await make(store);
  assert.equal((await store.get('admins', a.id)).last_login_at, null);
  const pw = await authenticate(store, 'sam@example.com', 'a-long-enough-password', { touch: false });
  assert.equal(pw.id, a.id);
  assert.equal((await store.get('admins', a.id)).last_login_at, null, 'not recorded after the password step');
  await touchLogin(store, a.id);
  assert.ok((await store.get('admins', a.id)).last_login_at);
  assert.equal(await authenticate(store, 'sam@example.com', 'wrong-password-here', { touch: false }), null);
});

test('two-step: the half-signed-in token cannot be used as a real session', async () => {
  const secret = 'x'.repeat(40);
  const pending = await createSession(secret + ':two-step', 300, Date.now(), { sub: 'acct-1', role: 'pending' });
  assert.equal(await readSession(pending, secret), null, 'the main session check refuses it');
  assert.deepEqual(await readSession(pending, secret + ':two-step'), { sub: 'acct-1', role: 'pending' });
  const real = await createSession(secret, 300, Date.now(), { sub: 'acct-1', role: 'owner' });
  assert.equal(await readSession(real, secret + ':two-step'), null, 'and a real session is not a pending one');
});
