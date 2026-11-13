// The Golden Pause, a gentle breathing space: the timing, as a pure function of time (so it can be tested in Node).
// Four steps from Cassidy's design: Prepare, Breathe in, Hold, Breathe out. Nothing is measured or stored: it is an
// invitation to follow, never a test, and the visitor can finish or skip at any time.
//
// Two plans:
//   SPACE  "Breathe with us": Prepare once, three rounds of in, hold and out, a moment of rest, then it closes.
//   INTRO  how the homepage opens: Prepare and one breath, then the breath out becomes the honey film's own breath out.
//          Breathe out first shows on its own for a while (the orb settling, the arrows turning in). Then, through the
//          rest of the breath out, the space slowly cross-fades into the film: the honey drop lets go of the dipper,
//          lands half way through the breath out, and drizzles down writing the name; the space is gone as the breath
//          out ends. The film starts unseen just before, so it is there when the fade begins. (The page holds the
//          opening's clock to the film's once it plays, so they stay together.)

export const STEPS = [
  { id: 'prepare', label: 'Prepare', line: 'Settle in…', seconds: 3 },
  { id: 'in', label: 'Breathe in', line: 'Slowly and deeply…', seconds: 4 },
  { id: 'hold', label: 'Hold', line: 'For a moment…', seconds: 2 },
  { id: 'out', label: 'Breathe out', line: 'Gently let it go…', seconds: 6 },
];
export const ROUNDS = 3;
export const REST = { label: 'Thank you for pausing.', seconds: 4 };
export const SPACE = { rounds: ROUNDS, rest: REST.seconds };
/** alone: how long Breathe out shows on its own before anything of the film appears (seconds);
 *  revealFrom, revealFor: then the cross-fade into the film, in the film's own seconds: from just as the honey drop lets
 *  go of the dipper (inside cues.json drop.fall; a test checks it), for the rest of the breath out */
export const INTRO = { rounds: 1, rest: 0, alone: 2.5, revealFrom: 2.7, revealFor: 3.5 };
/** the orb's scale when the breath is empty (1 = full); with reduced motion it stays at REDUCED */
export const SMALL = 0.58;
export const REDUCED = 0.8;

const byId = Object.fromEntries(STEPS.map((s, i) => [s.id, { ...s, index: i }]));
const ROUND = byId.in.seconds + byId.hold.seconds + byId.out.seconds;
export const durationOf = (plan = SPACE) => byId.prepare.seconds + plan.rounds * ROUND + plan.rest;
export const DURATION = durationOf(SPACE);
/** when the breath out begins, in the opening (Prepare, Breathe in and Hold come first) */
export const outStartOf = (plan = INTRO) => byId.prepare.seconds + (plan.rounds - 1) * ROUND + byId.in.seconds + byId.hold.seconds;
/** when, in the opening, the film is asked to start (unseen): so that it reaches revealFrom just as Breathe out has
 *  had its time alone */
export const filmStartOf = (plan = INTRO) => outStartOf(plan) + plan.alone - plan.revealFrom;

/** sine ease in and out: a breath speeds up gently and slows into its turn */
export const ease = (p) => (1 - Math.cos(Math.PI * Math.min(Math.max(p, 0), 1))) / 2;

/**
 * Where the breathing space is at t seconds after it opened, for a plan (SPACE by default).
 * step: 'prepare' | 'in' | 'hold' | 'out' | 'rest'; index: the step's place in STEPS (-1 at rest);
 * progress: 0..1 through the step; round: 1..rounds (0 while preparing); size: how full the breath is, 0..1 (eased);
 * done: the plan has run its course.
 */
export function breathAt(t, plan = SPACE) {
  const T = Number.isFinite(t) && t > 0 ? t : 0;
  const prep = byId.prepare.seconds;
  if (T < prep) return state('prepare', T / prep, 0, 0);
  const inRounds = T - prep;
  if (inRounds < plan.rounds * ROUND) {
    const round = Math.floor(inRounds / ROUND) + 1;
    const r = inRounds - (round - 1) * ROUND;
    if (r < byId.in.seconds) {
      const p = r / byId.in.seconds;
      return state('in', p, round, ease(p));
    }
    if (r < byId.in.seconds + byId.hold.seconds) return state('hold', (r - byId.in.seconds) / byId.hold.seconds, round, 1);
    const p = (r - byId.in.seconds - byId.hold.seconds) / byId.out.seconds;
    return state('out', p, round, 1 - ease(p));
  }
  if (plan.rest <= 0) return { ...state('out', 1, plan.rounds, 0), done: true };
  const rest = T - prep - plan.rounds * ROUND;
  return { ...state('rest', Math.min(rest / plan.rest, 1), plan.rounds, 0), done: rest >= plan.rest };
}

function state(step, progress, round, size) {
  const s = byId[step];
  return {
    step, index: s ? s.index : -1, progress, round, size,
    label: s ? s.label : REST.label, line: s ? s.line : '', done: false,
  };
}

/** what the page draws for a state: the orb's scale, how much of the fuller orb shows, the glow, and the arrows */
export function lookOf(b, reducedMotion = false) {
  const fade = (p) => Math.min(1, p / 0.2, (1 - p) / 0.2);
  return {
    scale: reducedMotion ? REDUCED : SMALL + (1 - SMALL) * b.size,
    full: b.size,
    glow: 0.35 + 0.65 * b.size,
    arrowsIn: b.step === 'in' ? Math.max(0, fade(b.progress)) : 0,
    arrowsOut: b.step === 'out' ? Math.max(0, fade(b.progress)) : 0,
  };
}

/**
 * How far the space's own words and orb have faded away at the end of "Breathe with us" (0 = all there, 1 = gone).
 * (The opening fades as a whole instead, into the film: revealOf.)
 */
export function leaveOf(b, plan = SPACE) {
  if (plan.rest > 0) return b.step === 'rest' ? Math.max(0, (b.progress - 0.7) / 0.3) : 0;
  return 0;
}

/** where the opening should be, given the film's own clock, once the film plays */
export const openingTimeOf = (filmTime, plan = INTRO) => filmStartOf(plan) + filmTime;

/** in the opening, how far the space has cross-faded into the film (0 = all space, 1 = all film), at a moment given in
 *  the film's own seconds; it eases in and out like the breath itself */
export function revealOf(filmTime, plan = INTRO) {
  return ease((filmTime - plan.revealFrom) / plan.revealFor);
}

/** what a screen reader hears at each new step (the page announces it once, politely) */
export function spokenOf(b) {
  return b.step === 'rest' ? REST.label : `${b.label}. ${b.line}`;
}
