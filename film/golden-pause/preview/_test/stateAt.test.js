// node --test _test/stateAt.test.js   (from the preview folder)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const cues = require('../cues.js');
const { stateAt, RING_MIN, RING_MAX } = require('../player.js');

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('cues.js matches ../../cues.json for every number the page uses', () => {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'cues.json'), 'utf8'));
  for (const k of ['fps', 'duration', 'settle', 'contact', 'breath', 'welcome', 'audio', 'text']) {
    assert.deepEqual(JSON.parse(JSON.stringify(cues[k])), json[k], k);
  }
});

test('the words in index.html match cues.json (film lines, calm still, screen-reader description, welcome)', () => {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'cues.json'), 'utf8'));
  const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ENT = { hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', amp: '&', nbsp: ' ', mdash: '—', ndash: '–' };
  const text = (frag) => frag.replace(/<[^>]+>/g, ' ').replace(/&([a-z]+);/g, (m, n) => (n in ENT ? ENT[n] : m)).replace(/\s+/g, ' ').trim();
  // the inner HTML of the first <tag ... data-gp="name" ...>...</tag> (no nesting of the same tag inside)
  const byGp = (name) => {
    const m = new RegExp(`<(\\w+)[^>]*\\bdata-gp="${name}"[^>]*>([\\s\\S]*?)</\\1>`).exec(page);
    assert.ok(m, `index.html has no data-gp="${name}"`);
    return text(m[2]);
  };
  const words = Object.fromEntries(json.text.map((c) => [c.id, c.words]));
  assert.ok(words.in && words.out && words.permission, 'cues.json text has in, out and permission');

  assert.equal(byGp('line-in'), words.in);
  assert.equal(byGp('line-out'), words.out);
  assert.equal(byGp('permission'), words.permission);
  assert.equal(byGp('tagline'), json.welcome.words);
  assert.equal(byGp('wordmark'), 'Empatherapy');

  // the calm still repeats both breathing lines (its permission line is the shared one above)
  const calm = /<div class="gp__calm"[^>]*>([\s\S]*?)<\/div>/.exec(page);
  assert.ok(calm, 'index.html has the calm block');
  const calmLines = [...calm[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1]));
  assert.deepEqual(calmLines, [words.in, words.out]);

  // the screen-reader description carries all three lines and the welcome, word for word
  const desc = byGp('description');
  for (const w of [words.in, words.out, words.permission, json.welcome.words, 'Empatherapy']) assert.ok(desc.includes(w), `description lacks "${w}"`);

  // and cues.js says the same (the player uses its words for nothing on screen, but keep them honest)
  for (const c of cues.text) assert.equal(c.words, words[c.id]);
  assert.equal(cues.welcome.words, json.welcome.words);
});

test('is pure and clamps time', () => {
  assert.deepEqual(stateAt(5, cues), stateAt(5, cues));
  assert.deepEqual(stateAt(-3, cues), stateAt(0, cues));
  assert.deepEqual(stateAt(99, cues), stateAt(cues.duration, cues));
  assert.deepEqual(stateAt(NaN, cues), stateAt(0, cues));
});

test('nothing shows at frame 0', () => {
  const s = stateAt(0, cues);
  for (const k of ['ring', 'wordsBacking', 'lineIn', 'lineOut', 'permission', 'mark', 'wordmark', 'tagline']) assert.equal(s[k].opacity, 0, k);
});

test('breathing lines follow their fades', () => {
  const [a, b] = cues.text[0].fadeIn, [c, d] = cues.text[0].fadeOut;
  near(stateAt(a, cues).lineIn.opacity, 0); near(stateAt(b, cues).lineIn.opacity, 1);
  near(stateAt(c, cues).lineIn.opacity, 1); near(stateAt(d, cues).lineIn.opacity, 0);
  near(stateAt((a + b) / 2, cues).lineIn.opacity, 0.5);
  const o = cues.text[1];
  near(stateAt(o.fadeIn[0], cues).lineOut.opacity, 0); near(stateAt(o.fadeIn[1], cues).lineOut.opacity, 1);
  near(stateAt(o.fadeOut[0], cues).lineOut.opacity, 1); near(stateAt(o.fadeOut[1], cues).lineOut.opacity, 0);
  // never both at once
  for (let t = 0; t <= 12; t += 1 / 24) {
    const s = stateAt(t, cues);
    assert.ok(Math.min(s.lineIn.opacity, s.lineOut.opacity) === 0, `overlap at ${t}`);
  }
});

test('permission line', () => {
  const p = cues.text[2];
  near(stateAt(p.fadeIn[0], cues).permission.opacity, 0); near(stateAt(p.fadeIn[1], cues).permission.opacity, 1);
  near(stateAt(p.fadeOut[1], cues).permission.opacity, 0);
});

test('ring: modest scale, grows on the inhale, shrinks on the exhale, fades with the out line', () => {
  const { inhale, exhale } = cues.breath;
  near(stateAt(inhale[0], cues).ring.scale, RING_MIN); near(stateAt(inhale[1], cues).ring.scale, RING_MAX);
  near(stateAt(exhale[0], cues).ring.scale, RING_MAX); near(stateAt(exhale[1], cues).ring.scale, RING_MIN);
  let prev = 0;
  for (let t = inhale[0]; t <= inhale[1]; t += 0.05) { const s = stateAt(t, cues).ring.scale; assert.ok(s >= prev); prev = s; }
  for (let t = exhale[0]; t <= exhale[1]; t += 0.05) { const s = stateAt(t, cues).ring.scale; assert.ok(s <= prev + 1e-9); prev = s; }
  for (let t = 0; t <= 12; t += 0.01) { const s = stateAt(t, cues).ring.scale; assert.ok(s >= 0.82 - 1e-9 && s <= 1 + 1e-9); }
  near(stateAt(cues.text[1].fadeOut[1], cues).ring.opacity, 0);
  near(stateAt(5, cues).ring.opacity, 1);
});

test('welcome settles by the settle cue and stays', () => {
  const w = cues.welcome;
  near(stateAt(w.mark[0], cues).mark.opacity, 0); near(stateAt(w.mark[1], cues).mark.opacity, 1);
  near(stateAt(w.wordmark[1], cues).wordmark.opacity, 1); near(stateAt(w.tagline[1], cues).tagline.opacity, 1);
  const s = stateAt(cues.settle, cues);
  assert.equal(s.settled, true);
  for (const k of ['mark', 'wordmark', 'tagline']) { near(s[k].opacity, 1); near(s[k].offset, 0); }
  assert.deepEqual(stateAt(cues.duration, cues).mark, s.mark);
});
