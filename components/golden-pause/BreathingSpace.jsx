'use client';
import { useEffect, useRef, useState } from 'react';
import { STEPS, REST, breathAt, lookOf, spokenOf } from './breathe.mjs';
import './breathing-space.css';

/**
 * The Golden Pause, a gentle breathing space (Cassidy's design): a golden orb that fills as you breathe in, rests full
 * for a moment, and empties as you let go, with the four steps under it. It opens over the film's own backdrop when
 * the visitor asks ("Breathe with us"), runs three easy rounds, rests, and closes by itself; Finish or Escape ends it
 * at any time. Purely visual and in this browser: nothing is measured, stored or sent.
 */
export default function BreathingSpace({ onClose }) {
  const rootRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [shown, setShown] = useState(false);
  const [now, setNow] = useState({ step: 'prepare', index: 0 });
  const [spoken, setSpoken] = useState('');

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let t = 0, last = 0, raf = 0, running = false, closed = false, key = '', first = true;

    const apply = (b) => {
      const L = lookOf(b, reduced);
      el.style.setProperty('--s', L.scale.toFixed(4));
      el.style.setProperty('--full', L.full.toFixed(4));
      el.style.setProperty('--glow', L.glow.toFixed(4));
      el.style.setProperty('--ain', L.arrowsIn.toFixed(3));
      el.style.setProperty('--aout', L.arrowsOut.toFixed(3));
      el.style.setProperty('--leave', b.step === 'rest' ? Math.max(0, (b.progress - 0.7) / 0.3).toFixed(3) : '0');
      const k = `${b.step}:${b.round}`;
      if (k !== key) {
        key = k;
        setNow({ step: b.step, index: b.index });
        setSpoken((first ? 'A gentle breathing space. ' : '') + spokenOf(b));
        first = false;
      }
      if (b.done && !closed) { closed = true; closeRef.current(); }
    };
    apply(breathAt(0));

    const tick = (ms) => {
      if (!running) return;
      const dt = last ? Math.min((ms - last) / 1000, 0.1) : 0;   // a hidden tab pauses rather than racing ahead
      last = ms;
      t += dt;
      const b = breathAt(t);
      apply(b);
      if (!b.done) raf = requestAnimationFrame(tick);
    };
    // Begin once the orbs are ready (at most a second and a half), so the first breath is never missed.
    let cancelled = false;
    const decodes = [...el.querySelectorAll('img')].map((img) => (img.decode ? img.decode().catch(() => {}) : null));
    Promise.race([Promise.all(decodes), new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (cancelled) return;
      running = true;
      raf = requestAnimationFrame(tick);
    });
    const showRaf = requestAnimationFrame(() => setShown(true));

    // Escape finishes (before the film's own Escape, which would skip the film underneath),
    // and clicks stay in here (a click must not start the film underneath).
    const stage = el.closest('[data-gp-stage]');
    const onKey = (e) => {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      const a = document.activeElement;
      if (a && a !== document.body && stage && !stage.contains(a)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      closeRef.current();
    };
    const onClick = (e) => e.stopPropagation();
    window.addEventListener('keydown', onKey, true);
    el.addEventListener('click', onClick);
    return () => {
      cancelled = true;
      running = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(showRaf);
      window.removeEventListener('keydown', onKey, true);
      el.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className="gp-breathe" data-shown={shown ? 'true' : 'false'} data-step={now.step}>
      <p className="sr-only" role="status" aria-live="polite">{spoken}</p>
      <div className="gp-breathe__all" aria-hidden="true">
        <div className="gp-breathe__head">
          <Lotus />
          <p className="gp-breathe__title">The Golden Pause</p>
          <p className="gp-breathe__sub">A gentle breathing space</p>
        </div>
        <div className="gp-breathe__orb">
          <span className="gp-breathe__aura" />
          <img className="gp-breathe__img gp-breathe__img--calm" src="/golden-pause/breathe/orb-calm.webp" alt="" width="960" height="960" decoding="async" />
          <img className="gp-breathe__img gp-breathe__img--full" src="/golden-pause/breathe/orb-full.webp" alt="" width="960" height="960" decoding="async" />
        </div>
        <ArrowIn className="gp-breathe__arrow gp-breathe__arrow--in gp-breathe__arrow--left" />
        <ArrowIn className="gp-breathe__arrow gp-breathe__arrow--in gp-breathe__arrow--right" mirror />
        <ArrowOut className="gp-breathe__arrow gp-breathe__arrow--out gp-breathe__arrow--left" />
        <ArrowOut className="gp-breathe__arrow gp-breathe__arrow--out gp-breathe__arrow--right" mirror />
        <ol className="gp-breathe__steps">
          {STEPS.map((s, i) => (
            <li key={s.id} data-on={now.index === i ? 'true' : 'false'}>
              <span className="gp-breathe__label">{s.label}</span>
              <span className="gp-breathe__line">{s.line}</span>
            </li>
          ))}
        </ol>
        <p className="gp-breathe__rest">{REST.label}</p>
      </div>
    </div>
  );
}

/** the lotus ornament from the design, with its two tapered lines */
function Lotus() {
  return (
    <svg className="gp-breathe__lotus" viewBox="0 0 400 64" focusable="false">
      <path d="M24 37 L150 35.6 L150 38.4 Z M376 37 L250 35.6 L250 38.4 Z" fill="currentColor" stroke="none" />
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M200 8 C188 22 188 40 200 52 C212 40 212 22 200 8 Z" />
        <path d="M200 52 C182 47 172 33 176 17 C190 23 198 37 200 52 Z" />
        <path d="M200 52 C218 47 228 33 224 17 C210 23 202 37 200 52 Z" />
        <path d="M200 52 C178 55 162 46 154 31 C171 31 189 41 200 52 Z" />
        <path d="M200 52 C222 55 238 46 246 31 C229 31 211 41 200 52 Z" />
        <path d="M182 56 Q200 62 218 56" />
      </g>
    </svg>
  );
}

/** breathe in: a curved arrow rising beside the orb, as it grows */
function ArrowIn({ className, mirror }) {
  return (
    <svg className={className} viewBox="0 0 40 110" focusable="false">
      <g transform={mirror ? 'translate(40 0) scale(-1 1)' : undefined} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 102 C8 82 6 38 27 10" />
        <path d="M15 15 L27 10 L29 23" />
      </g>
    </svg>
  );
}

/** breathe out: an arrow pointing in towards the orb, as it settles */
function ArrowOut({ className, mirror }) {
  return (
    <svg className={className} viewBox="0 0 80 60" focusable="false">
      <g transform={mirror ? 'translate(80 0) scale(-1 1)' : undefined} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8 C30 12 52 22 72 30" />
        <path d="M6 52 C30 48 52 38 72 30" />
        <path d="M60 22 L73 30 L60 38" />
      </g>
    </svg>
  );
}
