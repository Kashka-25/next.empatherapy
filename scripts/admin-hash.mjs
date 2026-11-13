// Makes the value for ADMIN_PASSWORD_HASH. Run:  npm run admin:hash
// Type the password when asked (it is not shown), or pipe it:  printf '%s' "your password" | npm run admin:hash
import { hashPassword } from '../lib/password.mjs';
import { randomBytes } from 'node:crypto';

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, '');
  }
  process.stdout.write('Admin password (at least 12 characters, not shown): ');
  return new Promise((resolve) => {
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); return resolve(value); }
        if (c === '\u0003') process.exit(1);
        if (c === '\u007f') value = value.slice(0, -1); else value += c;
      }
    });
  });
}

try {
  const hash = await hashPassword(await readPassword());
  console.log('\nAdd these two lines to .env.local (never commit that file):\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
