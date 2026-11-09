/**
 * Vision demo mode.
 *
 * Turned on only when NEXT_PUBLIC_DEMO_MODE=1 at build/dev time (see `npm run dev:demo`).
 * In demo mode the site shows fictional example Alchemists, sessions and resources,
 * uses the future words (Seekers, Alchemists), and nothing can be booked or sent.
 * With the flag off, the site behaves exactly as before.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export const DEMO_LABEL = 'Vision in progress · example data';

/** Words for practitioners: today's site says "guide", the vision says "Alchemist". */
export const T = DEMO
  ? { one: 'Alchemist', many: 'Alchemists', findCta: 'Find an Alchemist', findTitle: 'Find Your Alchemist', comingSoon: 'Alchemist Joining Soon' }
  : { one: 'Guide', many: 'Guides', findCta: 'Find Your Guide', findTitle: 'Find Your Guide', comingSoon: 'Guide Coming Soon' };
