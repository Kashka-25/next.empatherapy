// The Golden Pause, a gentle breathing space: the timing, as a pure function of time (so it can be tested in Node).
// Four steps from Cassidy's design: Prepare, Breathe in, Hold, Breathe out. Prepare comes once, then a few rounds of
// in, hold and out, then a moment of rest, then the space closes by itself. Nothing is measured or stored: it is an
// invitation to follow, never a test, and the visitor can finish at any time.

export const STEPS = [
  { id: 'prepare', label: 'Prepare', line: 'Settle in…', seconds: 3 },
  { id: 'in', label: 'Breathe in', line: 'Slowly and deeply…', seconds: 4 },
  { id: 'hold', label: 'Hold', line: 'For a moment…', seconds: 2 },
  { id: 'out', label: 'Breathe out', line: 'Gently let it go…', seconds: 6 },
];
export const ROUNDS = 3;
export const REST = { label: 'Thank you for pausing.', seconds: 4 };
/** the orb's scale when the breath is empty (1 = full); with reduced motion it stays at REDUCED */
export const SMALL = 0.58;
export const REDUCED = 0.8;

const byId = Object.fromEntries(STEPS.map((s, i) => [s.id, { ...s, index: i }]));
const ROUND = byId.in.seconds + byId.hold.seconds + byId.out.seconds;
export const DURATION = byId.prepare.seconds + ROUNDS * ROUND + REST.seconds;

/** sine ease in and out: a breath speeds up gently and slows into its turn */
export const ease = (p) => (1 - Math.cos(Math.PI * Math.min(Math.max(p, 0), 1))) / 2;

/**
 * Where the breathing space is at t seconds after it opened.
 * step: 'prepare' | 'in' | 'hold' | 'out' | 'rest'; index: the step's place in STEPS (-1 at rest);
 * progress: 0..1 through the step; round: 1..ROUNDS (0 while preparing); size: how full the breath is, 0..1 (eased);
 * done: the space has finished and can close.
 */
export function breathAt(t) {
  const T = Number.isFinite(t) && t > 0 ? t : 0;
  const prep = byId.prepare.seconds;
  if (T < prep) return state('prepare', T / prep, 0, 0);
  const inRounds = T - prep;
  if (inRounds < ROUNDS * ROUND) {
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
  const rest = T - prep - ROUNDS * ROUND;
  return { ...state('rest', Math.min(rest / REST.seconds, 1), ROUNDS, 0), done: rest >= REST.seconds };
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

/** what a screen reader hears at each new step (the page announces it once, politely) */
export function spokenOf(b) {
  return b.step === 'rest' ? REST.label : `${b.label}. ${b.line}`;
}
