// node --test _test/stateAt.test.js   (from the preview folder)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const cues = require('../cues.js');
const player = require('../player.js');
const { stateAt, smooth } = player;

const JSON_CUES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'cues.json'), 'utf8'));
const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const FORMATS = ['wide', 'square'];
/** an image's pixel size: PNG (IHDR) or WebP (VP8X, VP8L or VP8 header) */
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 1, 4) === 'PNG') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  assert.ok(b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP', `${file} is a PNG or WebP`);
  const kind = b.toString('latin1', 12, 16);
  if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { width: 1 + (v & 0x3fff), height: 1 + ((v >> 14) & 0x3fff) }; }
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
};
/** the wordmark's centre y when the tilt is at s: it rides the camera tilt, plus the small lift that lands it on centerPost */
const wordmarkY = (L, s) => L.script.centerPre - L.tiltFrac * s + (L.wordmark.centerPost - (L.script.centerPre - L.tiltFrac)) * s;

test('cues.js matches ../../cues.json for every cue the page uses (version 2)', () => {
  assert.equal(JSON_CUES.version, 2, 'cues.json is version 2');
  const keys = Object.keys(cues);
  assert.deepEqual(keys.sort(), ['breath', 'duration', 'easing', 'fps', 'layout', 'settle', 'text', 'tilt', 'version', 'welcome'].sort());
  for (const k of keys) assert.deepEqual(JSON.parse(JSON.stringify(cues[k])), JSON_CUES[k], k);
  assert.equal(cues.duration, 13);
  assert.equal(cues.settle, 12.4);
  for (const f of FORMATS) {
    const L = cues.layout[f], wm = L.wordmark;
    // the wordmark is the title image, sized by the stage width (no font size any more)
    assert.deepEqual(Object.keys(wm).sort(), ['aspect', 'centerPost', 'image', 'scalePre', 'widthFrac'], `${f} wordmark fields`);
    assert.equal(wm.image, 'wordmark.webp', `${f} wordmark image`);
    const png = pngSize(path.join(__dirname, '..', wm.image));
    near(wm.aspect, png.width / png.height, 1e-4);
    // at its starting size it is as wide as the honey name it takes over from
    near(wm.widthFrac * wm.scalePre, L.script.widthFrac, 0.005);
    // the camera tilt carries the wordmark from where the honey wrote the name to where it rests; the lockup may
    // place it a little off the tilt's own path, but never so far that it stops visibly riding the tilt
    assert.ok(Math.abs(wm.centerPost - (L.script.centerPre - L.tiltFrac)) <= 0.03, `${f}: centerPost is within 0.03 of where the tilt alone carries the wordmark`);
    // in the lockup the wordmark's box ends above the teacup symbol's box
    assert.ok(wm.centerPost + (wm.widthFrac * L.size[0] / wm.aspect) / L.size[1] / 2 < L.symbol.topPost, `${f}: the wordmark ends above symbol.topPost`);
  }
});

test('player.css carries the same layout numbers for the page without the player', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'player.css'), 'utf8');
  // the first declaration of a custom property inside the first rule with exactly this selector
  const prop = (selector, name) => {
    const at = css.indexOf('\n' + selector + ' {');
    assert.ok(at >= 0, `player.css has no "${selector} {" rule`);
    const body = css.slice(at, css.indexOf('\n}', at));
    const m = new RegExp(`${name}:\\s*([\\d.]+)`).exec(body);
    assert.ok(m, `"${selector}" sets no ${name}`);
    return Number(m[1]);
  };
  for (const [sel, f] of [['.gp', 'wide'], ['.gp--square', 'square']]) {
    const L = JSON_CUES.layout[f];
    assert.equal(prop(sel, '--gp-bl-center'), L.breathLines.center, `${sel} --gp-bl-center`);
    assert.equal(prop(sel, '--gp-wm-frac'), L.wordmark.widthFrac, `${sel} --gp-wm-frac`);
    assert.equal(prop(sel, '--gp-tagline-y'), L.tagline.centerPost, `${sel} --gp-tagline-y`);
  }
  // the wordmark image is sized by the stage width (--stage-w, derived like --stage-h), its height from its own proportions
  const rule = (selector) => { const at = css.indexOf('\n' + selector + ' {'); assert.ok(at >= 0, `player.css has no "${selector} {" rule`); return css.slice(at, css.indexOf('\n}', at)); };
  assert.match(rule('.gp'), /--stage-w:\s*100cqw;/, '.gp sets --stage-w');
  const wmRule = rule('.gp__wordmark');
  assert.match(wmRule, /width:\s*calc\(var\(--gp-wm-frac\)\s*\*\s*var\(--stage-w\)\)/, 'the wordmark is widthFrac of the stage width');
  assert.match(wmRule, /height:\s*auto/, 'the wordmark keeps its own proportions');
  assert.ok(!/font-size|font-family|filter/.test(wmRule), 'no font sizing and no filters on the wordmark image');
  assert.ok(!/--gp-wm-ink/.test(css), 'no font-specific optical lift left in player.css');
  assert.ok(!/--gp-wm-ink|fontFrac/.test(fs.readFileSync(path.join(__dirname, '..', 'player.js'), 'utf8')), 'no fontFrac and no optical lift left in player.js');
  // the fallback without container units derives --stage-w for both formats too
  const noCq = css.slice(css.indexOf('@supports not (width: 1cqw)'));
  assert.match(noCq, /\.gp \{[^}]*--stage-w:/, 'the no-cqw fallback sets --stage-w (wide)');
  assert.match(noCq, /\.gp--square \{[^}]*--stage-w:/, 'the no-cqw fallback sets --stage-w (square)');
  // phones without the player use the square layout
  const phone = /\.no-js \.gp \{([^}]*)\}/.exec(css);
  assert.ok(phone && new RegExp(`--gp-bl-center:\\s*${JSON_CUES.layout.square.breathLines.center}\\b`).test(phone[1]), 'the no-js phone rule uses the square breathLines.center');
  assert.ok(!/gp__ring|gp__mark/.test(css), 'no ring and no provisional mark left in player.css');
});

test('the words in index.html match cues.json (film lines, calm still, screen-reader description, welcome)', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ENT = { hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', amp: '&', nbsp: ' ', mdash: '—', ndash: '–' };
  const text = (frag) => frag.replace(/<[^>]+>/g, ' ').replace(/&([a-z]+);/g, (m, n) => (n in ENT ? ENT[n] : m)).replace(/\s+/g, ' ').trim();
  // the inner HTML of the first <tag ... data-gp="name" ...>...</tag> (no nesting of the same tag inside)
  const byGp = (name) => {
    const m = new RegExp(`<(\\w+)[^>]*\\bdata-gp="${name}"[^>]*>([\\s\\S]*?)</\\1>`).exec(page);
    assert.ok(m, `index.html has no data-gp="${name}"`);
    return text(m[2]);
  };
  const words = Object.fromEntries(JSON_CUES.text.map((c) => [c.id, c.words]));
  assert.ok(words.in && words.out && words.permission, 'cues.json text has in, out and permission');

  assert.equal(byGp('line-in'), words.in);
  assert.equal(byGp('line-out'), words.out);
  assert.equal(byGp('permission'), words.permission);
  assert.equal(byGp('tagline'), JSON_CUES.welcome.words);

  // the wordmark is Cassidy's title image, named "Empatherapy", inside the aria-hidden welcome (the description names it)
  const imgs = [...page.matchAll(/<img\b[^>]*\bdata-gp="wordmark"[^>]*>/g)];
  assert.equal(imgs.length, 1, 'one wordmark image');
  const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? m[1] : null; };
  const wmTag = imgs[0][0];
  assert.equal(attr(wmTag, 'class'), 'gp__wordmark');
  for (const f of FORMATS) assert.equal(attr(wmTag, 'src'), JSON_CUES.layout[f].wordmark.image, `src is layout.${f}.wordmark.image`);
  assert.equal(attr(wmTag, 'alt'), 'Empatherapy');
  const png = pngSize(path.join(__dirname, '..', attr(wmTag, 'src')));
  assert.equal(Number(attr(wmTag, 'width')), png.width, 'width attribute is the image\'s own');
  assert.equal(Number(attr(wmTag, 'height')), png.height, 'height attribute is the image\'s own');
  assert.equal(attr(wmTag, 'decoding'), 'async');
  assert.ok(!/<p[^>]*class="gp__wordmark"/.test(page), 'no typed wordmark left');
  const welcome = /<div class="gp__welcome"([^>]*)>([\s\S]*?)<p class="gp__tagline"/.exec(page);
  assert.ok(welcome && /aria-hidden="true"/.test(welcome[1]) && welcome[2].includes(wmTag), 'the wordmark image sits in the aria-hidden welcome, in its track');
  assert.ok(/data-gp="wordmark-track"[^>]*>\s*<img\b[^>]*data-gp="wordmark"/.test(page), 'the wordmark image is inside the track');

  // the invisible twin of the permission line (it only balances the band) says the same
  const ghost = /<p class="gp__ghost"[^>]*>([\s\S]*?)<\/p>/.exec(page);
  assert.ok(ghost, 'index.html has the permission line twin');
  assert.equal(text(ghost[1]), words.permission);

  // the calm still shows both breathing lines (with the shared permission line)
  const calm = /<div class="gp__calm"[^>]*>([\s\S]*?)<\/div>/.exec(page);
  assert.ok(calm, 'index.html has the calm block');
  const calmLines = [...calm[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
  assert.deepEqual(calmLines, [words.in, words.out]);

  // the screen-reader description: version 2, all three lines and the welcome, word for word
  const desc = byGp('description');
  for (const w of [words.in, words.out, words.permission, JSON_CUES.welcome.words, 'Empatherapy']) assert.ok(desc.includes(w), `description lacks "${w}"`);
  for (const w of [`${JSON_CUES.duration}-second`, 'honey dipper', 'drop', 'script', 'teacup', 'lemon', 'chamomile']) assert.ok(desc.includes(w), `description lacks "${w}"`);
  assert.ok(page.includes(`${JSON_CUES.duration} seconds, just if you like`), 'the caption gives the length');
  assert.ok(!/data-gp="(ring|mark|welcome-backing|calm-backing)"/.test(page), 'no ring, no provisional mark, no old backings');

  // and cues.js says the same (the player uses its words for nothing on screen, but keep them honest)
  for (const c of cues.text) assert.equal(c.words, words[c.id]);
  assert.equal(cues.welcome.words, JSON_CUES.welcome.words);
});

test('is pure and clamps time', () => {
  for (const f of FORMATS) {
    assert.deepEqual(stateAt(5, cues, f), stateAt(5, cues, f));
    assert.deepEqual(stateAt(-3, cues, f), stateAt(0, cues, f));
    assert.deepEqual(stateAt(99, cues, f), stateAt(cues.duration, cues, f));
    assert.deepEqual(stateAt(NaN, cues, f), stateAt(0, cues, f));
  }
  assert.deepEqual(stateAt(9.7, cues), stateAt(9.7, cues, 'wide'), 'wide when no format is given');
  assert.throws(() => stateAt(1, cues, 'portrait'), /portrait/);
});

test('no ring and no provisional mark any more', () => {
  const s = stateAt(2, cues);
  for (const k of ['ring', 'mark', 'welcomeBacking']) assert.ok(!(k in s), k);
  for (const k of ['breathScale', 'RING_MIN', 'RING_MAX']) assert.ok(!(k in player), k);
});

test('every window eases with smoothstep, as the cue sheet says', () => {
  assert.equal(smooth(0), 0); assert.equal(smooth(1), 1); assert.equal(smooth(0.5), 0.5);
  near(smooth(0.25), 0.15625, 1e-9);
  const [a, b] = cues.text[0].fadeIn;
  near(stateAt(a + (b - a) * 0.25, cues).lineIn.opacity, 0.1563, 1e-4);
});

test('nothing shows at frame 0', () => {
  for (const f of FORMATS) {
    const s = stateAt(0, cues, f);
    for (const k of ['wordsBacking', 'lineIn', 'lineOut', 'permission', 'wordmark', 'tagline']) assert.equal(s[k].opacity, 0, `${f} ${k}`);
  }
});

test('breathing lines follow their fades, one at a time, on a backing that is never thinner than they are', () => {
  const [a, b] = cues.text[0].fadeIn, [c, d] = cues.text[0].fadeOut;
  near(stateAt(a, cues).lineIn.opacity, 0); near(stateAt(b, cues).lineIn.opacity, 1);
  near(stateAt(c, cues).lineIn.opacity, 1); near(stateAt(d, cues).lineIn.opacity, 0);
  near(stateAt((a + b) / 2, cues).lineIn.opacity, 0.5);
  const o = cues.text[1];
  near(stateAt(o.fadeIn[0], cues).lineOut.opacity, 0); near(stateAt(o.fadeIn[1], cues).lineOut.opacity, 1);
  near(stateAt(o.fadeOut[0], cues).lineOut.opacity, 1); near(stateAt(o.fadeOut[1], cues).lineOut.opacity, 0);
  for (let t = 0; t <= cues.duration; t += 1 / 96) {
    const s = stateAt(t, cues);
    assert.ok(Math.min(s.lineIn.opacity, s.lineOut.opacity) === 0, `overlap at ${t}`);
    assert.ok(s.wordsBacking.opacity >= Math.max(s.lineIn.opacity, s.lineOut.opacity, s.permission.opacity) - 1e-9, `backing thinner than the words at ${t}`);
  }
  // full backing from the end of the first fade-in to the start of the last fade-out, gone after it
  near(stateAt(1.0, cues).wordsBacking.opacity, 1); near(stateAt(3.2, cues).wordsBacking.opacity, 1); near(stateAt(6.8, cues).wordsBacking.opacity, 1);
  near(stateAt(7.4, cues).wordsBacking.opacity, 0);
});

test('permission line', () => {
  const p = cues.text[2];
  near(stateAt(p.fadeIn[0], cues).permission.opacity, 0); near(stateAt(p.fadeIn[1], cues).permission.opacity, 1);
  near(stateAt(p.fadeOut[0], cues).permission.opacity, 1); near(stateAt(p.fadeOut[1], cues).permission.opacity, 0);
});

test('nothing over the honey name once it is written, nor while it melts', () => {
  for (const t of [7.4, 7.9, 8.2, 8.5, 8.9]) {
    const s = stateAt(t, cues);
    for (const k of ['wordsBacking', 'lineIn', 'lineOut', 'permission', 'wordmark', 'tagline']) assert.equal(s[k].opacity, 0, `${k} at ${t}`);
  }
});

test('wordmark: fades in over welcome.wordmark, rides the tilt from the honey name to its place, settling to its own size', () => {
  const [w0, w1] = cues.welcome.wordmark;
  near(stateAt(w0, cues).wordmark.opacity, 0); near(stateAt((w0 + w1) / 2, cues).wordmark.opacity, 0.5); near(stateAt(w1, cues).wordmark.opacity, 1);
  const [a, b] = cues.tilt;
  for (const f of FORMATS) {
    const L = cues.layout[f], wm = L.wordmark;
    const at = (t) => stateAt(t, cues, f).wordmark;
    // before the tilt: where the honey script was written, at scalePre
    for (const t of [0, 5, a]) { near(at(t).y, L.script.centerPre); near(at(t).scale, wm.scalePre); }
    // halfway through the tilt (smoothstep 0.5): halfway from centerPre to centerPost
    near(stateAt((a + b) / 2, cues, f).tilt, 0.5);
    near(at((a + b) / 2).y, wordmarkY(L, 0.5));
    near(at((a + b) / 2).y, (L.script.centerPre + wm.centerPost) / 2);
    near(at((a + b) / 2).scale, (wm.scalePre + 1) / 2);
    // a quarter of the way (smoothstep 0.15625): the same s for position and scale
    const q = a + (b - a) / 4, sq = 0.15625;
    near(at(q).y, wordmarkY(L, sq));
    near(at(q).scale, wm.scalePre + (1 - wm.scalePre) * sq);
    // when the wordmark is fully in (9.7 s)
    const s97 = smooth((w1 - a) / (b - a));
    near(at(w1).y, wordmarkY(L, s97)); near(at(w1).scale, wm.scalePre + (1 - wm.scalePre) * s97);
    // after the tilt: exactly centerPost at its own size, and it stays
    for (const t of [b, cues.settle, cues.duration]) { near(at(t).y, wm.centerPost, 1e-9); assert.equal(at(t).scale, 1); }
    // it only ever rises and shrinks, and it rides the tilt: never further from the camera's own path than the lift
    const lift = Math.abs(wm.centerPost - (L.script.centerPre - L.tiltFrac));
    let prev = at(0);
    for (let t = 0; t <= cues.duration; t += 1 / 48) {
      const s = at(t), cam = L.script.centerPre - L.tiltFrac * stateAt(t, cues, f).tilt;
      assert.ok(s.y <= prev.y + 1e-9 && s.scale <= prev.scale + 1e-9, `${f}: moved back at ${t}`);
      assert.ok(Math.abs(s.y - cam) <= lift + 1e-4, `${f}: strayed from the tilt at ${t}`);
      prev = s;
    }
  }
});

test('tagline: fades in over welcome.tagline at tagline.centerPost, and stays', () => {
  const [t0, t1] = cues.welcome.tagline;
  for (const f of FORMATS) {
    near(stateAt(t0, cues, f).tagline.opacity, 0); near(stateAt(t1, cues, f).tagline.opacity, 1);
    for (const t of [0, t0, t1, cues.duration]) assert.equal(stateAt(t, cues, f).tagline.y, cues.layout[f].tagline.centerPost);
  }
});

test('the welcome settles by the settle cue and stays', () => {
  for (const f of FORMATS) {
    const s = stateAt(cues.settle, cues, f);
    assert.equal(s.settled, true);
    assert.equal(s.phase, 'settled');
    near(s.wordmark.opacity, 1); near(s.tagline.opacity, 1);
    assert.deepEqual(stateAt(cues.duration, cues, f).wordmark, s.wordmark);
    assert.deepEqual(stateAt(cues.duration, cues, f).tagline, s.tagline);
  }
  assert.equal(stateAt(cues.settle - 0.01, cues).settled, false);
});

test('phases follow the breath, then the melt, then the welcome', () => {
  const ph = (t) => stateAt(t, cues).phase;
  assert.deepEqual([0.1, 1, 3.1, 5, 8.5, 9, 12.5].map(ph), ['arrive', 'inhale', 'turn', 'exhale', 'melt', 'welcome', 'settled']);
});
