// The Golden Pause on the homepage hero (components/golden-pause). The film itself, its timing and its player are
// tested in a real browser with the preview (film/golden-pause/preview/_test); these checks keep the site's copy honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { STEPS, ROUNDS, REST, DURATION, SMALL, REDUCED, INTRO, breathAt, lookOf, leaveOf, revealOf, filmStartOf, durationOf, spokenOf } from '../components/golden-pause/breathe.mjs';

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

test('the homepage opens on one breath, and on the breath out hands over to the film, so its breath in follows', () => {
  const seq = [];
  for (let t = 0; t < durationOf(INTRO) + 2; t += 0.05) { const b = breathAt(t, INTRO); if (seq[seq.length - 1] !== b.step) seq.push(b.step); }
  assert.deepEqual(seq, ['prepare', 'in', 'hold', 'out'], 'one breath, no rest');
  assert.equal(durationOf(INTRO), 3 + 4 + 2 + 6);
  const outStart = 3 + 4 + 2;
  // the space's own words and orb dissolve during the breath out, and are gone before the film comes into view
  assert.equal(leaveOf(breathAt(outStart + 0.5, INTRO), INTRO), 0);
  assert.ok(leaveOf(breathAt(outStart + 4, INTRO), INTRO) > 0.3);
  assert.equal(leaveOf(breathAt(outStart + 5.6, INTRO), INTRO), 1);
  // the film is asked to start during the breath out, early enough that it comes into view (at its own revealFrom)
  // as the out ends: its "Take a gentle breath in…" (from 0.3 s) is then waiting
  const start = filmStartOf(INTRO);
  assert.ok(start > outStart + 3 && start < durationOf(INTRO), 'started during the breath out');
  const cues = JSON.parse(read('film/golden-pause/cues.json'));
  const inLine = cues.text.find((x) => x.id === 'in');
  assert.ok(Math.abs(start + INTRO.revealFrom - durationOf(INTRO)) <= 0.2, 'the film comes into view as the out ends (allowing for the start)');
  assert.ok(INTRO.revealFrom >= cues.fadeIn[1] * 0.7 && INTRO.revealFrom >= inLine.fadeIn[0], 'the film has nearly faded up from parchment, and its breath-in line has begun');
  assert.equal(revealOf(0), 0);
  assert.equal(revealOf(INTRO.revealFrom + INTRO.revealFor), 1);
  // the breathing space proper still has its rest, and its words leave only at the very end
  assert.equal(leaveOf(breathAt(outStart + 4)), 0);
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
