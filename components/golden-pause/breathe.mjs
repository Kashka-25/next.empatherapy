// The Golden Pause, a gentle breathing space: the timing, as a pure function of time (so it can be tested in Node).
// Four steps from Cassidy's design: Prepare, Breathe in, Hold, Breathe out. Nothing is measured or stored: it is an
// invitation to follow, never a test, and the visitor can finish or skip at any time.
//
// Two plans:
//   SPACE  "Breathe with us": Prepare once, three rounds of in, hold and out, a moment of rest, then it closes.
//   INTRO  how the homepage opens: Prepare and one breath; on the breath out the space dissolves into the honey film,
//          which starts just before the out ends, so its own "Take a gentle breath in…" comes as the out finishes.

export const STEPS = [
  { id: 'prepare', label: 'Prepare', line: 'Settle in…', seconds: 3 },
  { id: 'in', label: 'Breathe in', line: 'Slowly and deeply…', seconds: 4 },
  { id: 'hold', label: 'Hold', line: 'For a moment…', seconds: 2 },
  { id: 'out', label: 'Breathe out', line: 'Gently let it go…', seconds: 6 },
];
export const ROUNDS = 3;
export const REST = { label: 'Thank you for pausing.', seconds: 4 };
export const SPACE = { rounds: ROUNDS, rest: REST.seconds };
/** filmLead: how long before the breath out ends the film is started (it comes into view at its own 0.9 s) */
export const INTRO = { rounds: 1, rest: 0, filmLead: 1.05, revealFrom: 0.9, revealFor: 0.6 };
/** the orb's scale when the breath is empty (1 = full); with reduced motion it stays at REDUCED */
export const SMALL = 0.58;
export const REDUCED = 0.8;

const byId = Object.fromEntries(STEPS.map((s, i) => [s.id, { ...s, index: i }]));
const ROUND = byId.in.seconds + byId.hold.seconds + byId.out.seconds;
export const durationOf = (plan = SPACE) => byId.prepare.seconds + plan.rounds * ROUND + plan.rest;
export const DURATION = durationOf(SPACE);
/** when, in the opening, the film is asked to start */
export const filmStartOf = (plan = INTRO) => durationOf(plan) - (plan.filmLead || 0);

/** sine ease in and out: a breath speeds up gently and slows into its turn */
export const ease = (p) => (1 - Math.cos(Math.PI * Math.min(Math.max(p, 0), 1))) / 2;
const smooth = (x) => { const c = Math.min(Math.max(x, 0), 1); return c * c * (3 - 2 * c); };

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
 * How far the space's own words and orb have faded away (0 = all there, 1 = gone): at the end of the rest (SPACE),
 * or through the last breath out (INTRO), so the garden behind is all that is left when the film takes over.
 */
export function leaveOf(b, plan = SPACE) {
  if (plan.rest > 0) return b.step === 'rest' ? Math.max(0, (b.progress - 0.7) / 0.3) : 0;
  if (b.done) return 1;
  return b.step === 'out' && b.round === plan.rounds ? smooth((b.progress - 0.4) / 0.5) : 0;
}

/** in the opening, how far the space has cleared to show the film, from the film's own clock (seconds) */
export function revealOf(filmTime, plan = INTRO) {
  return smooth((filmTime - plan.revealFrom) / plan.revealFor);
}

/** what a screen reader hears at each new step (the page announces it once, politely) */
export function spokenOf(b) {
  return b.step === 'rest' ? REST.label : `${b.label}. ${b.line}`;
}
