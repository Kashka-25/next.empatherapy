/**
 * A Seeker's shortlist of Alchemists: kept ONLY in their own browser (localStorage), never sent to Empatherapy,
 * never tied to an account. It is a list of profile addresses (slugs) and nothing else. Clearing the browser's site data
 * clears it, and that is the point: nothing about a Seeker's interest is stored by us.
 */
export const SHORTLIST_KEY = 'empatherapy:shortlist';
export const MAX_SHORTLIST = 12;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** Reads whatever was stored and returns a clean list of slugs. Anything unexpected becomes an empty list. */
export function parseShortlist(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const s of data) if (typeof s === 'string' && SLUG.test(s) && !out.includes(s)) out.push(s);
  return out.slice(0, MAX_SHORTLIST);
}

export const serialiseShortlist = (list) => JSON.stringify(parseShortlist(JSON.stringify(list)));

/** @returns {{list:string[], saved:boolean, reason?:'full'|'bad'}} */
export function toggleSlug(list, slug) {
  const current = parseShortlist(JSON.stringify(list));
  if (typeof slug !== 'string' || !SLUG.test(slug)) return { list: current, saved: false, reason: 'bad' };
  if (current.includes(slug)) return { list: current.filter((s) => s !== slug), saved: false };
  if (current.length >= MAX_SHORTLIST) return { list: current, saved: false, reason: 'full' };
  return { list: [...current, slug], saved: true };
}

/** Only profiles that still exist on the public site, in the order they were saved. */
export const keepKnown = (list, knownSlugs) => parseShortlist(JSON.stringify(list)).filter((s) => knownSlugs.includes(s));
