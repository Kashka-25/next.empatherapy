// The Golden Pause on the homepage hero (components/golden-pause). The film itself, its timing and its player are
// tested in a real browser with the preview (film/golden-pause/preview/_test); these checks keep the site's copy honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { STEPS, ROUNDS, REST, DURATION, SMALL, REDUCED, INTRO, breathAt, lookOf, leaveOf, revealOf, filmStartOf, outStartOf, openingTimeOf, durationOf, spokenOf } from '../components/golden-pause/breathe.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const cues = JSON.parse(read('film/golden-pause/cues.json'));
const siteCss = read('components/golden-pause/golden-pause.css');
const previewCss = read('film/golden-pause/preview/player.css');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

test('every media file the player can ask for is in public/golden-pause, at a sensible size', () => {
  const files = ['golden-pause.m4a', 'golden-pause.webm', 'wordmark-script.webp'];
  for (const f of ['wide', 'square']) files.push(`film-${f}.mp4`, `poster-${f}.jpg`, `still-${f}.jpg`, `end-${f}.jpg`);
  for (const name of files) {
    const { size } = statSync(new URL(`../public/golden-pause/${name}`, import.meta.url));
    assert.ok(size > 1000, `${name} is empty`);
    assert.ok(size < 5 * 1024 * 1024, `${name} is over 5 MB`);
  }
});

test("the site's stage styles are the preview's, with the no-player marks moved from <html> to the stage", () => {
  const a = previewCss.indexOf('/* ---------- The stage ---------- */');
  const b = previewCss.indexOf('/* ---------- Hero (the existing homepage copy) ---------- */');
  assert.ok(a > 0 && b > a, 'the preview stylesheet still has its section markers');
  const expected = previewCss.slice(a, b)
    .replaceAll('.no-js .gp {', '.gp.gp--nojs {')
    .replaceAll('.no-js:not(.gp-wait) ', '.gp--nojs:not(.gp--wait) ')
    .replaceAll('.no-js.gp-wait ', '.gp--nojs.gp--wait ')
    .replaceAll('.no-js .gp__', '.gp--nojs .gp__')
    .replaceAll('url("still-', 'url("/golden-pause/still-');
  const backing = previewCss.match(/--gp-backing: ([^;]*);/)[1];
  assert.ok(siteCss.includes(`--gp-backing: ${backing};`), 'the band backing is the one checked for contrast');
  const site = strip(siteCss)
    .replace(/ --gp-backing: [^;]*;/, '')
    .replace(/ @media \(prefers-reduced-motion: reduce\) \{ \.gp-btn \{ transition: none; \} \}$/, '');
  assert.equal(site, strip(expected));
  assert.doesNotMatch(strip(siteCss), /\.no-js|gp-wait\b/);
});

test('the stage styles carry the layout numbers from cues.json, for the page before the player starts', () => {
  const block = (sel) => strip(siteCss).match(new RegExp(`(?:^|\\} )${sel.replace('.', '\\.')} \\{([^}]*)\\}`))[1];
  const num = (css, name) => Number(css.match(new RegExp(`${name}: ([0-9.]+);`))[1]);
  for (const [sel, f] of [['.gp', 'wide'], ['.gp--square', 'square']]) {
    const css = block(sel);
    const L = cues.layout[f];
    assert.equal(num(css, '--gp-bl-center'), L.breathLines.center, `${f} breathing lines`);
    assert.equal(num(css, '--gp-wm-frac'), L.wordmark.widthFrac, `${f} wordmark width`);
    assert.equal(num(css, '--gp-tagline-y'), L.tagline.centerPost, `${f} tagline`);
  }
});

test('the player and the breathing space store and measure nothing (Seeker privacy)', () => {
  const files = ['film/golden-pause/preview/player.js', 'components/golden-pause/GoldenPause.jsx',
    'components/golden-pause/BreathingSpace.jsx', 'components/golden-pause/breathe.mjs'];
  for (const file of files) {
    const src = read(file).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    for (const word of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'sendBeacon', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
      assert.ok(!src.includes(word), `${file} uses ${word}`);
    }
  }
});

test("the breathing space follows Cassidy's four steps: Prepare once, then rounds of in, hold and out, then a rest", () => {
  assert.deepEqual(STEPS.map((s) => s.label), ['Prepare', 'Breathe in', 'Hold', 'Breathe out']);
  assert.deepEqual(STEPS.map((s) => s.line), ['Settle in…', 'Slowly and deeply…', 'For a moment…', 'Gently let it go…']);
  const seq = [];
  for (let t = 0; t < DURATION + 1; t += 0.05) { const b = breathAt(t); if (seq[seq.length - 1] !== b.step) seq.push(b.step); }
  assert.deepEqual(seq, ['prepare', ...Array(ROUNDS).fill(['in', 'hold', 'out']).flat(), 'rest']);
  assert.equal(DURATION, 3 + ROUNDS * (4 + 2 + 6) + REST.seconds);
  assert.equal(breathAt(DURATION - 0.01).done, false);
  assert.equal(breathAt(DURATION).done, true);
  assert.equal(breathAt(-5).step, 'prepare');
  assert.equal(breathAt(NaN).step, 'prepare');
});

test('the homepage opens on one breath: Breathe out shows on its own, then fades slowly into the honey drizzle', () => {
  const seq = [];
  for (let t = 0; t < durationOf(INTRO) + 2; t += 0.05) { const b = breathAt(t, INTRO); if (seq[seq.length - 1] !== b.step) seq.push(b.step); }
  assert.deepEqual(seq, ['prepare', 'in', 'hold', 'out'], 'one breath, no rest');
  const outStart = 3 + 4 + 2;
  const outEnd = durationOf(INTRO);
  assert.equal(outStartOf(INTRO), outStart);
  assert.equal(outEnd, 3 + 4 + 2 + 6);
  const cues = JSON.parse(read('film/golden-pause/cues.json'));
  // the film starts unseen just before the breath out, so it is there when the fade begins
  const start = filmStartOf(INTRO);
  assert.ok(start < outStart && start > outStart - 2, 'the film starts unseen just before the breath out');
  // Breathe out shows on its own for a good while: the space covers the film completely
  const fadeFrom = openingTimeOf(INTRO.revealFrom);
  assert.ok(fadeFrom - outStart >= 2.5 - 1e-9, 'Breathe out shows on its own for at least 2.5 s');
  for (let t = start; t <= fadeFrom; t += 0.05) assert.ok(revealOf(t - start) < 1e-9, `the film is unseen at ${t.toFixed(2)} s`);
  // then the fade, for the rest of the breath out: it begins as the honey drop lets go of the dipper, the honey lands
  // half way through the breath out, and the space is gone as the breath out ends
  assert.ok(INTRO.revealFrom >= cues.drop.fall[0] && INTRO.revealFrom < cues.drop.land, 'the fade begins as the drop falls');
  const land = openingTimeOf(cues.drop.land);
  assert.ok(Math.abs(land - (outStart + outEnd) / 2) <= 0.25, 'the honey lands half way through the breath out');
  assert.equal(breathAt(land, INTRO).step, 'out');
  const clear = INTRO.revealFrom + INTRO.revealFor;
  assert.equal(revealOf(clear), 1);
  assert.ok(Math.abs(openingTimeOf(clear) - outEnd) <= 0.2, 'the space is gone as the breath out ends');
  assert.ok(INTRO.revealFor >= 3.5, 'a slow fade');
  assert.ok(clear < cues.write[1], 'and the honey is still drizzling, writing the name, when it is gone');
  assert.ok(revealOf(cues.drop.land + 1.5) > 0.3 && revealOf(cues.drop.land + 1.5) < 0.7, 'half way while the honey writes');
  // the fade eases in and out, with no jump anywhere
  let prev = revealOf(INTRO.revealFrom);
  for (let f = INTRO.revealFrom; f <= clear + 0.5; f += 0.02) {
    const r = revealOf(f);
    assert.ok(r >= prev - 1e-12 && r - prev < 0.02, `smooth at film ${f.toFixed(2)} s`);
    prev = r;
  }
  assert.ok(revealOf(INTRO.revealFrom + 0.3) < 0.05 && revealOf(clear - 0.3) > 0.95, 'it starts and ends gently');
  // the film's own breath out (the honey writing the name) ends after the opening's, so the breath carries on in the film
  assert.ok(openingTimeOf(cues.breath.exhale[1]) > outEnd);
  // the opening fades as a whole; the breathing space proper still has its rest, its words leaving at the very end
  assert.equal(leaveOf(breathAt(outStart + 3, INTRO), INTRO), 0);
  assert.equal(leaveOf(breathAt(outStart + 4)), 0);
});

test('the homepage film shows no breathing words of its own (they stay on the calm still)', () => {
  const css = strip(read('components/golden-pause/breathing-space.css'));
  assert.match(css, /\.gp:not\(\.gp--nojs\):not\(\[data-gp-mode="calm"\]\) \.gp__band \{ display: none; \}/);
});

test('the fade into the film is one clean picture: the film never goes to a separate video plane, the opening is one steady layer', () => {
  const css = strip(read('components/golden-pause/breathing-space.css'));
  // a hardware video plane under a fading layer flickers on some Windows graphics; a filter keeps the film in the page
  const filter = css.match(/\.gp \.gp__video \{ filter: saturate\(([0-9.]+)\); \}/);
  assert.ok(filter, 'the film carries the filter that keeps it off the video plane');
  assert.ok(Number(filter[1]) > 1 && Number(filter[1]) <= 1.002, 'a change no eye can see');
  assert.match(css, /\.gp-breathe\[data-intro="true"\] \{ will-change: opacity; \}/);
  // never quite opaque, so the film is drawn all along and the fade starts without a skipped frame; the page fades
  // from that same value (no step as the fade takes over)
  const veil = Number(css.match(/\.gp-breathe\[data-intro="true"\]\[data-shown="true"\] \{ opacity: ([0-9.]+); \}/)[1]);
  assert.ok(veil >= 0.998 && veil < 1, 'within a quarter of a colour step of opaque');
  assert.equal(Number(read('components/golden-pause/BreathingSpace.jsx').match(/const VEIL = ([0-9.]+);/)[1]), veil);
});

test('the hold is short and gentle, and the orb fills and empties smoothly with the breath', () => {
  const hold = STEPS.find((s) => s.id === 'hold');
  assert.ok(hold.seconds <= 2, 'a pause at the top of the breath, never a long hold');
  let prev = breathAt(3);
  assert.equal(prev.size, 0);
  for (let t = 3; t <= 3 + 12; t += 0.02) {
    const b = breathAt(t);
    assert.ok(Math.abs(b.size - prev.size) < 0.02, `no jump at ${t.toFixed(2)} s`);
    if (b.step === 'in') assert.ok(b.size >= prev.size - 1e-9);
    if (b.step === 'out') assert.ok(b.size <= prev.size + 1e-9);
    if (b.step === 'hold') assert.equal(b.size, 1);
    prev = b;
  }
  assert.equal(lookOf(breathAt(0)).scale, SMALL);
  assert.equal(lookOf(breathAt(8)).scale, 1);
  assert.equal(lookOf(breathAt(8), true).scale, REDUCED, 'reduced motion: the orb keeps one size');
  assert.equal(lookOf(breathAt(5)).arrowsOut, 0);
  assert.ok(lookOf(breathAt(5)).arrowsIn > 0.9, 'the rising arrows show while breathing in');
  assert.ok(lookOf(breathAt(12)).arrowsOut > 0.9, 'the inward arrows show while breathing out');
  assert.equal(spokenOf(breathAt(5)), 'Breathe in. Slowly and deeply…');
  assert.equal(spokenOf(breathAt(DURATION - 1)), REST.label);
});

test('the player loads in Node for its timing, and starts in the browser only when the site asks', () => {
  const require = createRequire(import.meta.url);
  const player = require('../film/golden-pause/preview/player.js');
  assert.equal(typeof player.stateAt, 'function');
  assert.equal(player.createPlayer, undefined, 'no browser player without a document');
  const end = player.stateAt(cues.duration, cues, 'wide');
  assert.equal(end.settled, true);
  assert.equal(end.wordmark.opacity, 1);
  assert.equal(end.wordmark.y, cues.layout.wide.wordmark.centerPost);
  const src = read('film/golden-pause/preview/player.js');
  assert.match(src, /hasAttribute\('data-gp-manual'\)/, "the preview's self-start leaves the site's stage alone");
});

test('the homepage hero shows the film, with a way past it, and the privacy notice mentions it', () => {
  const page = read('app/page.jsx');
  assert.match(page, /<GoldenPause skipTo="hero-copy" \/>/);
  assert.match(page, /id="hero-copy"/);
  const component = read('components/golden-pause/GoldenPause.jsx');
  assert.match(component, /data-gp-manual=""/);
  assert.match(component, /data-gp-media="\/golden-pause\/"/);
  assert.match(component, /Skip past the film/);
  assert.match(read('app/privacy/page.jsx'), /The Golden Pause/);
  assert.match(component, /Breathe with us/);
  assert.match(component, /<BreathingSpace /);
  assert.match(component, /intro: true/, 'the page opens on the breath');
  assert.match(read('film/golden-pause/preview/player.js'), /opts\.intro/);
});
