/**
 * A launch checklist for the owner. It reads the real state of the site (never secrets: only whether something is set)
 * and lists what still needs doing before the public sees it, and who does it.
 *
 * Two kinds of item:
 *   - checked automatically from the environment and the data (storage, mail, site address, accounts, profiles)
 *   - checked by a person, because only a person can (a privacy professional's review, an AHPRA check, legal advice).
 *     An owner ticks these off; the time and who ticked it are kept.
 *
 * Nothing here changes the site. It is a list, not a switch.
 */
import { storeKind } from './store/index.mjs';
import { mailMode } from './mailer.mjs';
import { indexingOn } from './site.mjs';

export const STATUS_LABEL = { ready: 'Ready', todo: 'To do', note: 'Note' };
const COLLECTION = 'launch_ticks';

export const MANUAL_ITEMS = [
  { id: 'privacy-review', title: 'A privacy professional has read the privacy notice', detail: 'Check it against the Australian Privacy Act, and that the database provider and region named under "Where it is kept" are the real ones.', who: 'Cassidy' },
  { id: 'ahpra', title: 'AHPRA advertising rules checked for what the site says', detail: 'Alchemist profiles, the knowledge feed, and (before any reviews are added) the testimonial rules.', who: 'Cassidy' },
  { id: 'credits-advice', title: 'A lawyer and an accountant have looked at referral credits', detail: 'Expiry, voucher and consumer-law rules, GST, and whether referral rewards are allowed between registered practitioners.', who: 'Cassidy' },
  { id: 'fees-advice', title: 'The first fee or subscription is decided and checked (when the free period ends)', detail: 'Not needed to launch free. Needed before anyone is charged.', who: 'Cassidy' },
  { id: 'founding-confirmed', title: 'The founding profile has no unconfirmed items', detail: 'Every qualification and price marked (confirm) has been checked, so it can be verified and public.', who: 'Cassidy' },
  { id: 'real-alchemists', title: 'Real Alchemists have agreed to be listed and have been approved', detail: 'Each has seen their profile and agreed. Nobody is listed without their say.', who: 'Cassidy' },
  { id: 'crisis-line', title: 'The crisis signposting has been read once more by a person', detail: 'Empatherapy is not crisis care. 000 and Lifeline 13 11 14 are on the pages that need them.', who: 'Cassidy' },
  { id: 'backups', title: 'A way to restore the data exists, and has been tried', detail: 'Ask the database provider how backups and restores work, then try one.', who: 'Cassidy' },
];

const item = (id, group, title, status, detail, who = 'Code') => ({ id, group, title, status, detail, who });
const secretOk = (v) => typeof v === 'string' && v.length >= 32;

/** @returns {Array<{id,group,title,status,detail,who}>} */
export function launchChecks({ env = process.env, accounts = [], alchemists = [] } = {}) {
  const out = [];
  const kind = storeKind(env);
  out.push(item('storage', 'Storage and sign-in', 'A real database is connected',
    kind === 'supabase' ? 'ready' : 'todo',
    kind === 'supabase' ? 'Connected to Supabase.' : kind === 'file' ? 'Using local files, which is for working on your own computer. A public site needs a database (Supabase).' : 'Storage is switched off, so sign-in, enquiries, photos and the rest do not work.', 'Cassidy'));
  out.push(item('session-secret', 'Storage and sign-in', 'The sign-in secret is long and private', secretOk(env.ADMIN_SESSION_SECRET) ? 'ready' : 'todo',
    secretOk(env.ADMIN_SESSION_SECRET) ? 'Set.' : 'ADMIN_SESSION_SECRET needs to be set to a long random value on the host (at least 32 characters).', 'Cassidy'));

  const owners = accounts.filter((a) => a.role === 'owner' && a.active !== false);
  out.push(item('owner', 'Storage and sign-in', 'There is an owner account', owners.length ? 'ready' : 'todo',
    owners.length ? `${owners.length} owner ${owners.length === 1 ? 'account' : 'accounts'}.` : 'Create the first owner account. Until then only the one-time setup password works.', 'Cassidy'));
  const noTwoStep = owners.filter((a) => !a.two_step);
  out.push(item('two-step', 'Storage and sign-in', 'Owners use two-step sign-in', owners.length && !noTwoStep.length ? 'ready' : 'todo',
    !owners.length ? 'Needs an owner account first.' : noTwoStep.length ? `${noTwoStep.length} of ${owners.length} owner ${owners.length === 1 ? 'account has' : 'accounts have'} not turned it on (My account).` : 'On for every owner.', 'Cassidy'));

  const mail = mailMode(env);
  const mailReady = mail === 'resend' && Boolean(env.RESEND_API_KEY) && Boolean(env.MAIL_FROM);
  out.push(item('mail', 'Email', 'Email is connected', mailReady ? 'ready' : 'todo',
    mailReady ? 'Sending through a mail provider.' : mail === 'log' ? 'Emails are only written to a local file, never sent. Fine for testing, not for launch.' : 'Email is off, so nobody is told about enquiries.', 'Cassidy'));
  out.push(item('notify', 'Email', 'You are told when an Alchemist is reached', env.ADMIN_NOTIFY_EMAIL ? 'ready' : 'todo',
    env.ADMIN_NOTIFY_EMAIL ? 'A notification address is set.' : 'ADMIN_NOTIFY_EMAIL is not set.', 'Cassidy'));

  const url = env.SITE_URL ?? '';
  const https = /^https:\/\/[^/\s]+/i.test(url);
  out.push(item('site-url', 'The site', 'The public address is set', https ? 'ready' : 'todo',
    https ? 'SITE_URL is set to an https address.' : 'SITE_URL should be the real https address, so links, the sitemap and sharing previews are right.', 'Cassidy'));
  out.push(item('indexing', 'The site', 'Search engines are allowed in (launch day)', indexingOn(env) ? 'ready' : 'note',
    indexingOn(env) ? 'EMPATHERAPY_INDEXING is on.' : 'Still hidden from search engines on purpose. Switch EMPATHERAPY_INDEXING to on only when you are ready for the public.', 'Cassidy'));

  const demo = alchemists.filter((a) => a.demo === true);
  const real = alchemists.filter((a) => a.demo !== true);
  const live = real.filter((a) => a.publication_status === 'published' && ['verified', 'founder'].includes(a.verification_status));
  out.push(item('examples', 'Content', 'The fictional example Alchemists are gone', demo.length ? 'todo' : 'ready',
    demo.length ? `${demo.length} fictional ${demo.length === 1 ? 'example is' : 'examples are'} still on the site. They are labelled, and need removing before launch.` : 'None left.', 'Cassidy'));
  out.push(item('live-profiles', 'Content', 'At least one real, approved profile is live', live.length ? 'ready' : 'todo',
    live.length ? `${live.length} live ${live.length === 1 ? 'profile' : 'profiles'}.` : 'No real profile is published and verified yet.', 'Cassidy'));
  const unconfirmed = real.filter((a) => (a.qualifications ?? []).some((q) => q.confirm) || (a.pricing?.sessions ?? []).some((s) => s.confirm));
  out.push(item('confirm-items', 'Content', 'No profile has items still marked (confirm)', unconfirmed.length ? 'todo' : 'ready',
    unconfirmed.length ? `${unconfirmed.map((a) => a.name).join(', ')}: a qualification or price is still marked (confirm).` : 'None.', 'Cassidy'));
  return out;
}

/** Which manual items have been ticked, and by whom. */
export async function manualState(store) {
  const ticks = store ? await store.list(COLLECTION) : [];
  return MANUAL_ITEMS.map((m) => {
    const t = ticks.find((x) => x.id === m.id);
    return { ...m, group: 'Only a person can check', status: t?.done ? 'ready' : 'todo', done_by: t?.done ? t.done_by : null, done_at: t?.done ? t.done_at : null };
  });
}

export async function setTick(store, id, done, actorName, now = new Date()) {
  if (!MANUAL_ITEMS.some((m) => m.id === id)) return { ok: false, reason: 'unknown' };
  const rec = await store.put(COLLECTION, { id, done: done === true, done_by: done === true ? String(actorName ?? 'An owner').slice(0, 80) : null, done_at: done === true ? now.toISOString() : null });
  return { ok: true, record: rec };
}

export function summarise(checks) {
  const todo = checks.filter((c) => c.status === 'todo').length;
  return { total: checks.length, ready: checks.filter((c) => c.status === 'ready').length, todo, ok: todo === 0 };
}
