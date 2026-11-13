/**
 * The emails an enquiry sets off, and who is told what.
 *
 *   Alchemist  the full message, the Seeker's name and email, and a plain "reply to them directly".
 *   Founder    a heads-up that an Alchemist was reached, with a link. NOT the message: it stays in the admin.
 *   Seeker     a confirmation that their message was passed on, with what happens to it and crisis signposting.
 *
 * Every send is best effort. The result says what went out so the enquiry can record it.
 */
import { sendMail } from './mailer.mjs';
import { siteUrl } from './site.mjs';

const CRISIS_LINE = 'Empatherapy is a place to explore and connect. It is not crisis care. If you or someone near you is in danger, call 000. For support any time in Australia, call Lifeline on 13 11 14.';

export function alchemistEmail(enquiry, alchemist, env = process.env, { portal: hasPortalLogin = false } = {}) {
  const portal = hasPortalLogin ? `\n\nYou can also see this enquiry, and tell us how it goes, in your space: ${siteUrl(env)}/admin/portal/enquiries/${enquiry.id}` : '';
  return {
    to: alchemist.enquiry_email,
    replyTo: enquiry.email,
    subject: 'Someone would like to reach you through Empatherapy',
    text: `Hello ${alchemist.name.split(' ')[0]},

${enquiry.name} found your profile on Empatherapy and would like to get in touch.

Their message:
"""
${enquiry.message}
"""

To reply, simply reply to this email (it goes to ${enquiry.name}, at ${enquiry.email}). Please answer in your own words and in your own time.${enquiry.support_flag ? '\n\nA note from us: their message includes words that may mean they are having a hard time. Please be gentle, and share Lifeline (13 11 14) or 000 if they seem unsafe.' : ''}

Empatherapy's team can also see enquiries, only to keep things safe and to understand how introductions go. If this does not feel like a good fit, you do not have to reply.${portal}

Warmly,
Empatherapy`,
  };
}

export function founderEmail(enquiry, alchemist, env = process.env) {
  return {
    to: env.ADMIN_NOTIFY_EMAIL,
    subject: `New enquiry for ${alchemist.name}`,
    text: `Someone has reached out to ${alchemist.name} through Empatherapy.

Open it in the admin: ${siteUrl(env)}/admin/enquiries/${enquiry.id}${enquiry.support_flag ? '\n\nThe message includes words that may mean the person is having a hard time. Worth a look soon.' : ''}

(The message itself is not in this email, to keep personal details out of your inbox.)`,
  };
}

export function seekerEmail(enquiry, alchemist) {
  return {
    to: enquiry.email,
    subject: `We passed your message to ${alchemist.name}`,
    text: `Hello ${enquiry.name.split(' ')[0]},

Thank you for reaching out. We have passed your message to ${alchemist.name}, who will reply to you directly by email. Replies can take a few days.

What happens to your message: it is shared with ${alchemist.name} and can be seen by Empatherapy's small team, only to keep things safe. We keep it for six months, then delete it. You can ask us to delete it sooner by emailing hello@empatherapy.co.

${CRISIS_LINE}

Warmly,
Empatherapy`,
  };
}

/** Sends all three. Returns { alchemist, founder, seeker } as booleans (true only if it really went out). */
export async function notifyEnquiry(enquiry, alchemist, env = process.env, fetchImpl = globalThis.fetch, opts = {}) {
  const out = { alchemist: false, founder: false, seeker: false };
  if (alchemist.enquiry_email) out.alchemist = (await sendMail(alchemistEmail(enquiry, alchemist, env, opts), env, fetchImpl)).ok;
  if (env.ADMIN_NOTIFY_EMAIL) out.founder = (await sendMail(founderEmail(enquiry, alchemist, env), env, fetchImpl)).ok;
  out.seeker = (await sendMail(seekerEmail(enquiry, alchemist), env, fetchImpl)).ok;
  return out;
}
