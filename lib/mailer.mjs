/**
 * Sending email, with the provider kept swappable. Mail is OFF unless EMPATHERAPY_MAIL is set:
 *
 *   resend   Resend's HTTPS API. Needs RESEND_API_KEY and MAIL_FROM (an address on a domain verified with Resend).
 *   log      writes each message to .data/outbox.jsonl instead of sending (local work and demonstrations).
 *   (unset)  nothing is sent; callers get { skipped: true }.
 *
 * A failure to send never throws: callers record it and carry on, because a stored enquiry matters more than an email.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const oneLine = (s, max) => String(s ?? '').replace(/[\r\n\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, max);
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

export const mailMode = (env = process.env) => env.EMPATHERAPY_MAIL ?? null;

/** @returns {Promise<{ok:boolean, skipped?:boolean, error?:string}>} */
export async function sendMail({ to, subject, text, replyTo }, env = process.env, fetchImpl = globalThis.fetch) {
  const mode = env.EMPATHERAPY_MAIL ?? null;
  if (!mode) return { ok: false, skipped: true };
  const address = oneLine(to, 200);
  if (!EMAIL.test(address)) return { ok: false, error: 'bad_recipient' };
  const message = { to: address, subject: oneLine(subject, 200), text: String(text ?? '').slice(0, 20000), ...(replyTo && EMAIL.test(oneLine(replyTo, 200)) ? { replyTo: oneLine(replyTo, 200) } : {}) };
  try {
    if (mode === 'log') {
      const dir = path.resolve(env.EMPATHERAPY_DATA_DIR || '.data');
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(path.join(dir, 'outbox.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), ...message })}\n`);
      return { ok: true };
    }
    if (mode === 'resend') {
      if (!env.RESEND_API_KEY || !env.MAIL_FROM) return { ok: false, error: 'not_configured' };
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM, to: [message.to], subject: message.subject, text: message.text, ...(message.replyTo ? { reply_to: message.replyTo } : {}) }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `provider_${res.status}` }; // never include the response body
    }
    return { ok: false, error: 'unknown_mode' };
  } catch {
    return { ok: false, error: 'send_failed' };
  }
}
