// The Golden Pause on the homepage hero (components/golden-pause). The film itself, its timing and its player are
// tested in a real browser with the preview (film/golden-pause/preview/_test); these checks keep the site's copy honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

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

test('the player stores and measures nothing (Seeker privacy)', () => {
  const src = read('film/golden-pause/preview/player.js').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  for (const word of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'sendBeacon', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
    assert.ok(!src.includes(word), `player.js uses ${word}`);
  }
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
});
