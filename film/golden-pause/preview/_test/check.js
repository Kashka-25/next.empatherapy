// Browser checks for the Golden Pause preview (throwaway), cue sheet version 2 (the honey writes the name).
//   node _test/serve.js 8791   (in another shell, from the preview folder; 8765 may be someone else's server)
//   node _test/check.js [port] [media]
//     media: _test/ (default: the throwaway test media, ?media=_test/) or real (the preview folder's own media, no query string)
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright-core'); } catch {
  pw = require('C:/Users/cassi/AppData/Local/Temp/claude/3b0c31a9197ea945/f9537179-5bb9-4119-a4e4-4e01683b94f9/scratchpad/shots/node_modules/playwright-core');
}
const CUES = require('../cues.js');
const PORT = Number(process.argv[2] || 8765);
const MEDIA_ARG = process.argv[3] === undefined ? '_test/' : process.argv[3];
const MEDIA = MEDIA_ARG === 'real' || MEDIA_ARG === 'none' || MEDIA_ARG === '' ? '' : MEDIA_ARG.replace(/\/?$/, '/');
const Q = MEDIA ? `?media=${MEDIA}` : '';          // the query string for the media under test
const MP = '/' + MEDIA;                            // the path prefix the media is served from
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE = `${ORIGIN}/index.html`;
const SHOTS = path.join(__dirname, 'shots', MEDIA ? '' : 'real');
fs.mkdirSync(SHOTS, { recursive: true });
console.log(`(media under test: ${MEDIA ? MEDIA : 'the real media in the preview folder'}; screenshots in ${SHOTS})`);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, 'fonts.googleapis.com', 'fonts.gstatic.com']);
const END = CUES.duration;
const WM_IN = CUES.welcome.wordmark[1];   // 9.7 s: the wordmark is fully in
const TAG_IN = CUES.welcome.tagline[1];   // 11.8 s: the tagline is fully in
const PARCHMENT = [251, 247, 238];

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
// Google Fonts: the warm-up page loads them through the browser as normal; later pages get the same
// responses replayed from memory, so a slow font connection in this sandbox cannot skew the timing tests.
const fontCache = new Map();
let fontsLearning = true;
const isFontUrl = (u) => { const h = new URL(u).hostname; return h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com'; };
async function routeFonts(ctx, page) {
  await ctx.route((u) => u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com', async (route) => {
    const hit = fontCache.get(route.request().url());
    if (hit) return route.fulfill(hit);
    if (fontsLearning) return route.continue();
    page.__fontAborts = (page.__fontAborts || 0) + 1;
    return route.abort();      // not cached: fall back to system fonts rather than wait
  });
  page.on('response', async (r) => {
    if (!fontsLearning || !isFontUrl(r.url()) || !r.ok()) return;
    try { fontCache.set(r.url(), { status: r.status(), headers: r.headers(), body: await r.body() }); } catch { /* ignore */ }
  });
}
async function open(url, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 860 },
    deviceScaleFactor: opts.dpr || 1,
    reducedMotion: opts.reducedMotion || 'no-preference',
    javaScriptEnabled: opts.js !== false,
    hasTouch: !!opts.touch,
    isMobile: !!opts.mobile
  });
  if (opts.init) await ctx.addInitScript(opts.init);
  if (opts.block) await ctx.route((u) => opts.block.test(u.pathname), (r) => r.abort());
  if (opts.delay) await ctx.route((u) => opts.delay.test(u.pathname), async (r) => { await sleep(2500); r.continue(); });
  const page = await ctx.newPage();
  await routeFonts(ctx, page);
  const errors = [];
  page.__fontAborts = 0;
  const requests = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: opts.waitUntil || 'domcontentloaded' });
  return { ctx, page, errors, requests, t0, get fontAborts() { return page.__fontAborts; } };
}

// ---------- in-page helpers ----------
const PAGE_HELPERS = (CUES) => {
  window.__gp = {
    g: (n) => document.querySelector('[data-gp="' + n + '"]'),
    matrix(el) {
      const v = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform);
      return v ? v[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
    },
    scale(el) { const p = this.matrix(el); return Math.hypot(p[0], p[1]); },
    /** the frame's inner box (inside its 1px border), which positions are fractions of */
    box() {
      const f = this.g('frame'), r = f.getBoundingClientRect();
      return { left: r.left + f.clientLeft, top: r.top + f.clientTop, width: f.clientWidth, height: f.clientHeight };
    },
    format() { return document.querySelector('[data-gp-stage]').classList.contains('gp--square') || (document.documentElement.classList.contains('no-js') && innerWidth <= 700) ? 'square' : 'wide'; },
    dom() {
      const g = this.g, op = (n) => parseFloat(getComputedStyle(g(n)).opacity);
      return {
        t: g('video').currentTime,
        wordsBacking: { opacity: op('words-backing') },
        lineIn: { opacity: op('line-in') }, lineOut: { opacity: op('line-out') }, permission: { opacity: op('permission') },
        // the track is as tall as the frame's inner box: its translateY in px over that height is the wordmark's y
        wordmark: { opacity: op('wordmark'), y: this.matrix(g('wordmark-track'))[5] / g('frame').clientHeight, scale: this.scale(g('wordmark')) },
        tagline: { opacity: op('tagline') }
      };
    },
    async seek(t) {
      const v = this.g('video');
      await new Promise((res) => { const on = () => { v.removeEventListener('seeked', on); res(); }; v.addEventListener('seeked', on); v.currentTime = t; });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return this.dom();
    },
    // the two pictures over the video: the honey-name still and the settled lockup (end)
    imgs() {
      const f = (i) => ({ shown: !i.hidden && getComputedStyle(i).display !== 'none', loaded: i.complete && i.naturalWidth > 0, src: (i.getAttribute('src') || '').split('/').pop() });
      return { still: f(this.g('still')), end: f(this.g('end')) };
    },
    storage() {
      let ls = -1, ss = -1;
      try { ls = localStorage.length; } catch (e) { ls = 'blocked'; }
      try { ss = sessionStorage.length; } catch (e) { ss = 'blocked'; }
      return { localStorage: ls, sessionStorage: ss, cookie: document.cookie };
    },
    // ---- contrast: text colour vs the feathered backing, composited over the worst-case video pixel ----
    lum(c) { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); },
    ratio(a, b) { const la = this.lum(a), lb = this.lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); },
    rgb(s) { const m = /rgba?\(([^)]+)\)/.exec(s); return m[1].split(',').map(Number); },
    stops(bg) {
      const out = []; const re = /rgba?\(([^)]+)\)\s+([\d.]+)%/g; let m;
      while ((m = re.exec(bg))) { const p = m[1].split(',').map(Number); out.push({ c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1, at: parseFloat(m[2]) / 100 }); }
      return out;
    },
    alphaAt(stops, r) {
      if (r <= stops[0].at) return stops[0].a;
      for (let i = 1; i < stops.length; i++) if (r <= stops[i].at) { const s0 = stops[i - 1], s1 = stops[i]; const k = (r - s0.at) / (s1.at - s0.at); return s0.a + (s1.a - s0.a) * k; }
      return stops[stops.length - 1].a;
    },
    textRects(el) {
      const r = document.createRange(); r.selectNodeContents(el);
      return Array.from(r.getClientRects()).filter((x) => x.width > 0 && x.height > 0);
    },
    contrast(textEl, backRect, backBg, backOpacity) {
      const stops = this.stops(backBg);
      const cx = backRect.left + backRect.width / 2, cy = backRect.top + backRect.height / 2;
      const rx = backRect.width / 2, ry = backRect.height / 2;
      let worstR = 0;
      for (const q of this.textRects(textEl)) {
        for (const [x, y] of [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]]) {
          worstR = Math.max(worstR, Math.hypot((x - cx) / rx, (y - cy) / ry));
        }
      }
      const a = this.alphaAt(stops, worstR) * backOpacity;
      const parch = stops[0].c;
      const text = this.rgb(getComputedStyle(textEl).color);
      const over = (under) => parch.map((p, i) => p * a + under[i] * (1 - a));
      const black = over([0, 0, 0]);
      const darkHoney = over([110, 62, 14]);
      return { text: getComputedStyle(textEl).color, worstEllipseRadius: +worstR.toFixed(3), backingAlphaAtWorstCorner: +a.toFixed(3),
        ratioOverBlack: +this.ratio(text, black).toFixed(2), ratioOverDarkHoney: +this.ratio(text, darkHoney).toFixed(2) };
    },
    visible(el) { const cs = getComputedStyle(el); return parseFloat(cs.opacity) > 0.99 && cs.visibility !== 'hidden' && cs.display !== 'none'; },
    /** the words in the bottom band against their backing, over a black film (the worst case) */
    contrastAll() {
      const g = this.g, out = {};
      const b = g('words-backing'), br = b.getBoundingClientRect(), bg = getComputedStyle(b).backgroundImage, bo = parseFloat(getComputedStyle(b).opacity);
      for (const [k, n] of [['lineIn', 'line-in'], ['lineOut', 'line-out'], ['permission', 'permission']]) if (this.visible(g(n))) out[k] = this.contrast(g(n), br, bg, bo);
      const calm = document.querySelector('.gp__calm');
      if (getComputedStyle(calm).display !== 'none') calm.querySelectorAll('p').forEach((p, i) => { out['calm' + i] = this.contrast(p, br, bg, bo); });
      return out;
    },
    /**
     * The bottom band against the layout the film was composed for (cues layout): where the breathing line is
     * centred, that the permission line is just under it and inside the frame, that no word is over the honey name
     * (its ink box: script.topPre to 2 * centerPre - topPre, script.widthFrac wide), and how much backing reaches
     * the tips of the descenders of p, p and y (measured on source/name-mask.png) and the foot of the letters.
     */
    band() {
      const f = this.format(), L = CUES.layout[f], B = this.box(), g = this.g;
      const fy = (y) => (y - B.top) / B.height, fx = (x) => (x - B.left) / B.width;
      const calmShown = getComputedStyle(document.querySelector('.gp__calm')).display !== 'none';
      const slotEl = calmShown ? document.querySelector('.gp__calm') : g('line-in');
      const slot = slotEl.getBoundingClientRect();
      const perm = g('permission').getBoundingClientRect();
      const words = calmShown ? [...document.querySelectorAll('.gp__calm p'), g('permission')] : [g('line-in'), g('line-out'), g('permission')];
      const rects = words.flatMap((el) => this.textRects(el));
      const nameTop = L.script.topPre, nameBottom = 2 * L.script.centerPre - L.script.topPre, nameL = 0.5 - L.script.widthFrac / 2, nameW = L.script.widthFrac;
      const overName = rects.filter((q) => fy(q.bottom) > nameTop && fy(q.top) < nameBottom && fx(q.right) > nameL && fx(q.left) < nameL + nameW);
      // backing alpha at points of the name (fractions of the ink box)
      const b = g('words-backing'), br = b.getBoundingClientRect(), stops = this.stops(getComputedStyle(b).backgroundImage), bo = parseFloat(getComputedStyle(b).opacity);
      const alphaAtName = (u, v) => {
        const x = B.left + (nameL + u * nameW) * B.width, y = B.top + (nameTop + v * (nameBottom - nameTop)) * B.height;
        const r = Math.hypot((x - (br.left + br.width / 2)) / (br.width / 2), (y - (br.top + br.height / 2)) / (br.height / 2));
        return this.alphaAt(stops, r) * bo;
      };
      const tips = { p1: alphaAtName(0.237, 0.923), p2: alphaAtName(0.787, 0.923), y: alphaAtName(0.885, 1.0) };
      const foot = Math.max(...[0.05, 0.3, 0.5, 0.7, 0.95].map((u) => alphaAtName(u, 0.7)));
      const centre = fy((slot.top + slot.bottom) / 2);
      const r4 = (x) => +x.toFixed(4);
      return {
        format: f, frame: [Math.round(B.width), Math.round(B.height)], cue: L.breathLines.center,
        breathCentre: r4(centre), offPx: +((centre - L.breathLines.center) * B.height).toFixed(1),
        permTop: r4(fy(perm.top)), permBottom: r4(fy(perm.bottom)), slotBottom: r4(fy(slot.bottom)), roomBelowPx: +(B.height - (perm.bottom - B.top)).toFixed(1),
        wordsTop: r4(fy(Math.min(...rects.map((q) => q.top)))), nameBottom: r4(nameBottom), overName: overName.length,
        backingAtTips: Object.fromEntries(Object.entries(tips).map(([k, v]) => [k, +v.toFixed(3)])), backingAtFoot: +foot.toFixed(3)
      };
    },
    /** the wordmark image's rendered box, as fractions of the frame: centre, width (of the width), height (of the height) */
    wmGeo() {
      const B = this.box(), r = this.g('wordmark').getBoundingClientRect();
      return { cx: ((r.left + r.right) / 2 - B.left) / B.width, cy: ((r.top + r.bottom) / 2 - B.top) / B.height,
        w: r.width / B.width, h: r.height / B.height, aspect: r.width / r.height, bottom: (r.bottom - B.top) / B.height };
    },
    /**
     * The wordmark image itself (wordmark.webp), drawn pxWidth device pixels wide (its own size when not given): the colour
     * of its letters (the 90th percentile by luminance of its opaque, dark pixels, so a little lighter than the typical
     * letter: the cautious side for contrast) and its ink box (the pixels inkBox would count as dark when the image lies
     * on parchment at that size: thin strokes such as the flower's outline fade out when it is drawn small), as
     * fractions of the image.
     */
    wmImage(parchment, pxWidth) {
      const img = this.g('wordmark');
      if (!(img.complete && img.naturalWidth > 0)) return null;
      const W = Math.max(1, Math.round(pxWidth || img.naturalWidth)), H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth));
      this.wmCache = this.wmCache || {};
      if (this.wmCache[W]) return this.wmCache[W];
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, c.width, c.height).data, w = c.width;
      const letters = [];
      let y0 = Infinity, y1 = -1, x0 = Infinity, x1 = -1;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3] / 255;
        if (a === 0) continue;
        const p = [0, 1, 2].map((k) => d[i + k] * a + parchment[k] * (1 - a));
        if ((0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255 <= 0.55) {
          const px = (i / 4) % w, py = Math.floor(i / 4 / w);
          if (py < y0) y0 = py; if (py > y1) y1 = py; if (px < x0) x0 = px; if (px > x1) x1 = px;
        }
        if (d[i + 3] >= 250) { const rgb = [d[i], d[i + 1], d[i + 2]], l = this.lum(rgb); if (l < 0.1) letters.push([l, rgb]); }
      }
      letters.sort((a, b) => a[0] - b[0]);
      const ink = letters.length ? letters[Math.floor(letters.length * 0.9)][1] : null;
      this.wmCache[W] = { letters: ink, letterPixels: letters.length, size: [c.width, c.height],
        ink: { cx: (x0 + x1 + 1) / 2 / c.width, cy: (y0 + y1 + 1) / 2 / c.height, w: (x1 + 1 - x0) / c.width, h: (y1 + 1 - y0) / c.height } };
      return this.wmCache[W];
    },
    /** the darkest pixel of a picture (the video's current frame, or an image) under the wordmark and the tagline,
        and the contrast of their text colour (for the wordmark image: its letters' colour) against it and against parchment */
    welcomeContrast(source, parchment) {
      const g = this.g, B = this.box();
      const c = document.createElement('canvas'); c.width = Math.round(B.width); c.height = Math.round(B.height);
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(source, 0, 0, c.width, c.height);   // the frame and the media share one aspect ratio
      const out = {};
      for (const [k, n] of [['wordmark', 'wordmark'], ['tagline', 'tagline']]) {
        const el = g(n);
        if (!this.visible(el)) continue;
        const r = el.getBoundingClientRect();
        const L = Math.max(0, Math.floor(r.left - B.left)), T = Math.max(0, Math.floor(r.top - B.top));
        const R = Math.min(c.width, Math.ceil(r.right - B.left)), D = Math.min(c.height, Math.ceil(r.bottom - B.top));
        const d = x.getImageData(L, T, R - L, D - T).data;
        let worst = null, wl = 2;
        for (let i = 0; i < d.length; i += 4) { const p = [d[i], d[i + 1], d[i + 2]]; const l = this.lum(p); if (l < wl) { wl = l; worst = p; } }
        const isImg = el.tagName === 'IMG';
        const text = isImg ? (this.wmImage(parchment) || {}).letters : this.rgb(getComputedStyle(el).color);
        if (!text) { out[k] = { text: null, error: 'the wordmark image has not loaded' }; continue; }
        out[k] = { text: isImg ? `letters of ${el.getAttribute('src')}: rgb(${text.join(', ')})` : getComputedStyle(el).color, darkestUnder: worst, ratioOverDarkest: +this.ratio(text, worst).toFixed(2), ratioOverParchment: +this.ratio(text, parchment).toFixed(2) };
      }
      return out;
    },
    /** the ink box of dark pixels inside the wordmark's box, from a screenshot of the frame (PNG as base64) */
    async inkBox(b64, wm, B) {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const s = img.naturalWidth / B.width;
      // the title image holds all its ink inside its own box (with a transparent margin): look only just around it,
      // so nothing of the film nearby (the cup's steam in the lockup) is counted
      const m = 3;
      const L = Math.max(0, Math.floor((wm.left - B.left - m) * s)), T = Math.max(0, Math.floor((wm.top - B.top - m) * s));
      const R = Math.min(c.width, Math.ceil((wm.right - B.left + m) * s)), D = Math.min(c.height, Math.ceil((wm.bottom - B.top + m) * s));
      const d = x.getImageData(L, T, R - L, D - T).data, w = R - L;
      let y0 = Infinity, y1 = -1, x0 = Infinity, x1 = -1;
      for (let i = 0; i < d.length; i += 4) {
        if ((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255 > 0.55) continue;
        const px = (i / 4) % w, py = Math.floor(i / 4 / w);
        if (py < y0) y0 = py; if (py > y1) y1 = py; if (px < x0) x0 = px; if (px > x1) x1 = px;
      }
      if (y1 < 0) return null;
      return { top: (T + y0) / s / B.height, bottom: (T + y1 + 1) / s / B.height, centreY: (T + (y0 + y1 + 1) / 2) / s / B.height,
        height: (y1 + 1 - y0) / s / B.height, width: (x1 + 1 - x0) / s / B.width, centreX: (L + (x0 + x1 + 1) / 2) / s / B.width };
    }
  };
};

async function helpers(page) { await page.evaluate(PAGE_HELPERS, JSON.parse(JSON.stringify(CUES))); }
const player = (page, expr) => page.evaluate(`(() => { const p = window.GoldenPause.player; return ${expr}; })()`);
async function waitMode(page, mode, timeout = 6000) {
  try { await page.waitForFunction((m) => window.GoldenPause && window.GoldenPause.player && window.GoldenPause.player.mode === m, mode, { timeout }); return true; }
  catch { return false; }
}
async function label(page, name) { return page.evaluate((n) => { const b = document.querySelector('[data-gp="' + n + '"]'); return b.hidden ? '(hidden)' : b.textContent.trim(); }, name); }
async function active(page) { return page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-gp') || a.textContent.trim().slice(0, 40) || a.tagName) : null; }); }
async function storageClean(page, ctx, tag) {
  const s = await page.evaluate(async () => {
    const st = window.__gp ? window.__gp.storage() : {};
    let idb = null; try { idb = indexedDB.databases ? (await indexedDB.databases()).length : 'n/a'; } catch (e) { idb = 'blocked'; }
    return { ...st, indexedDB: idb };
  });
  const cookies = await ctx.cookies();
  check(`${tag}: nothing stored (localStorage, sessionStorage, cookies, IndexedDB)`, s.localStorage === 0 && s.sessionStorage === 0 && s.cookie === '' && cookies.length === 0 && (s.indexedDB === 0 || s.indexedDB === 'n/a'), { ...s, contextCookies: cookies.length });
}
function networkClean(reqs, tag) {
  const bad = reqs.filter((r) => !ALLOWED_HOSTS.has(new URL(r.url).host) && !r.url.startsWith('data:'));
  check(`${tag}: no network calls beyond the page, its media and Google Fonts`, bad.length === 0, bad.length ? bad.map((b) => b.url) : `${reqs.length} requests`);
}
function consoleClean(errors, tag, allow, page) {
  let aborted = page ? page.__fontAborts || 0 : 0;
  const bad = errors.filter((e) => {
    if (allow && allow.test(e)) return false;
    if (aborted > 0 && /net::ERR_FAILED/.test(e)) { aborted--; return false; }   // a font request this harness aborted
    return true;
  });
  check(`${tag}: no console errors`, bad.length === 0, bad.length ? bad : undefined);
}
const OVERLAYS = ['wordsBacking', 'lineIn', 'lineOut', 'permission', 'wordmark', 'tagline'];
function compareState(dom, st, tol = 0.012) {
  const diffs = [];
  for (const k of OVERLAYS) {
    if (Math.abs(dom[k].opacity - st[k].opacity) > tol) diffs.push(`${k}.opacity dom ${dom[k].opacity} vs ${st[k].opacity}`);
  }
  if (Math.abs(dom.wordmark.y - st.wordmark.y) > 0.002) diffs.push(`wordmark.y dom ${dom.wordmark.y.toFixed(4)} vs ${st.wordmark.y}`);
  if (Math.abs(dom.wordmark.scale - st.wordmark.scale) > 0.005) diffs.push(`wordmark.scale dom ${dom.wordmark.scale.toFixed(4)} vs ${st.wordmark.scale}`);
  return diffs;
}
async function fontsReady(page) { await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 20000))]).then(() => document.fonts.status)); }
async function modeTiming(page) { return page.evaluate(() => { const p = window.GoldenPause.player; return Math.round(p.modeAt - p.startedAt); }); }

/** checks on the bottom band (see __gp.band): centred at the cue unless lifted to stay in the frame; clear of the name */
function bandChecks(b, tag) {
  const centred = Math.abs(b.offPx) <= 1.5;
  const lifted = b.offPx < -1.5 && Math.abs(b.roomBelowPx - 6) <= 1.5;   // risen just enough to keep 6px under the permission line
  check(`${tag}: the breathing line is centred at breathLines.center (${b.cue}) of the height, or lifted only to keep the permission line in the frame`, centred || lifted, { ...b, centred, lifted });
  check(`${tag}: the permission line sits just under the breathing line, inside the frame`, b.permTop >= b.slotBottom - 0.001 && b.permTop - b.slotBottom < 0.03 && b.roomBelowPx >= 4.5, { slotBottom: b.slotBottom, permTop: b.permTop, roomBelowPx: b.roomBelowPx });
  check(`${tag}: no word covers the honey name (all below ${b.nameBottom} of the height); the backing barely reaches its descenders`, b.overName === 0 && b.wordsTop >= b.nameBottom && Math.max(...Object.values(b.backingAtTips)) <= 0.15 && b.backingAtFoot <= 0.05, { wordsTop: b.wordsTop, nameBottom: b.nameBottom, backingAtTips: b.backingAtTips, backingAtFoot: b.backingAtFoot });
}
/** the wordmark image's geometry against stateAt (its rendered box: centre on y, width widthFrac x stage width x scale,
    the image's own proportions); returns the misfits and the worst deviations */
function wordmarkGeo(geo, st, wm) {
  const wantW = wm.widthFrac * st.wordmark.scale;
  const dy = Math.abs(geo.cy - st.wordmark.y), dx = Math.abs(geo.cx - 0.5), dw = Math.abs(geo.w - wantW) / wantW, da = Math.abs(geo.aspect - wm.aspect) / wm.aspect;
  return { ok: dy <= 0.006 && dx <= 0.004 && dw <= 0.01 && da <= 0.01, dy, dx, dw, da, wantW, geo };
}
async function wordmarkLoaded(page) {
  await page.waitForFunction(() => { const i = document.querySelector('[data-gp="wordmark"]'); return i.complete && i.naturalWidth > 0; }, null, { timeout: 10000 }).catch(() => {});
}
/** the wordmark's ink (from a screenshot): where the image's own ink box should be, given its rendered box */
async function wordmarkInkExpected(page) {
  return page.evaluate((p) => {
    const g = window.__gp.wmGeo(), i = window.__gp.wmImage(p, window.__gp.g('wordmark').getBoundingClientRect().width * devicePixelRatio);
    return i && { cx: g.cx + (i.ink.cx - 0.5) * g.w, cy: g.cy + (i.ink.cy - 0.5) * g.h, w: i.ink.w * g.w, h: i.ink.h * g.h };
  }, PARCHMENT);
}
/** the wordmark's ink (from a screenshot) is centred on stateAt's y and drawn at its scale */
async function wordmarkInk(page) {
  const geo = await page.evaluate(() => { const B = window.__gp.box(); const r = window.__gp.g('wordmark').getBoundingClientRect(); return { B, wm: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }; });
  const buf = await page.screenshot({ clip: { x: geo.B.left, y: geo.B.top, width: geo.B.width, height: geo.B.height }, timeout: 60000 });
  return page.evaluate(({ b64, wm, B }) => window.__gp.inkBox(b64, wm, B), { b64: buf.toString('base64'), wm: geo.wm, B: geo.B });
}

(async () => {
  browser = await pw.chromium.launch({ executablePath: CHROME, headless: true });
  // Warm up: the first H264 decoder start in a fresh headless browser is slow (a test-machine artefact),
  // which would trip the page's honest 1.5 s fallback. Play the test film once, then start the checks.
  {
    const w = await open(`${BASE}${Q}`, { noFontWait: true });
    // wait (up to 60 s; this sandbox's font connection is slow) for the stylesheet, then load every face the page uses
    const fontStatus = await w.page.evaluate(async () => {
      const t0 = performance.now();
      while (performance.now() - t0 < 60000) {
        const l = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((x) => x.href.includes('fonts.googleapis'));
        if (l && l.sheet) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      const faces = ['italic 400 20px Fraunces', 'italic 300 20px Fraunces', '400 20px Fraunces', '500 20px Fraunces', '400 20px "Nunito Sans"', '600 20px "Nunito Sans"', '700 20px "Nunito Sans"', '500 20px Caveat'];
      await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f, 'Take a gentle breath in… Empatherapy'))), new Promise((r) => setTimeout(r, 60000))]);
      return faces.map((f) => (document.fonts.check(f) ? 'ok ' : 'MISSING ') + f).join(', ');
    });
    await w.page.waitForTimeout(500);
    console.log(`(fonts: ${fontStatus}, ${fontCache.size} Google Fonts responses cached for the run)`);
    await w.page.evaluate(() => { const v = document.querySelector('[data-gp="video"]'); return new Promise((r) => { if (!v.paused && v.currentTime > 0) return r(); v.addEventListener('playing', r, { once: true }); v.play().catch(() => {}); setTimeout(r, 8000); }); });
    const sq = await open(`${BASE}${Q}`, { noFontWait: true, viewport: { width: 390, height: 844 } });
    await sq.page.waitForTimeout(1500);
    // the square page may ask for font files the wide page did not use
    await sq.page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 20000))]));
    await w.ctx.close(); await sq.ctx.close();
    fontsLearning = false;
  }

  // ======================= 1. Wide, autoplay, cue timing, keyboard, sound =======================
  {
    const { ctx, page, errors, requests } = await open(`${BASE}${Q}`);
    await helpers(page);
    check('wide: film autoplays muted', await waitMode(page, 'playing'));
    const info = await page.evaluate(() => { const v = document.querySelector('[data-gp="video"]'); return { src: v.currentSrc, muted: v.muted, playsInline: v.playsInline, ariaHidden: v.getAttribute('aria-hidden'), fmt: window.GoldenPause.player.format, vfc: window.GoldenPause.player.usesVideoFrameCallback, poster: v.getAttribute('poster') }; });
    check('wide: uses film-wide.mp4 (muted, playsinline, aria-hidden), poster-wide.jpg as its poster', info.src.endsWith(`${MP}film-wide.mp4`) && info.muted && info.playsInline && info.ariaHidden === 'true' && info.fmt === 'wide' && info.poster === `${MEDIA}poster-wide.jpg`, info);
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    check('the page switches from no-js to js only once the player is running', htmlClass === 'js', htmlClass);
    check('wide: clock sampled with requestVideoFrameCallback', info.vfc === true);
    const region = await page.evaluate(() => { const s = document.querySelector('[data-gp-stage]'); return { tag: s.tagName, label: s.getAttribute('aria-label') }; });
    check('stage is a labelled region', region.tag === 'SECTION' && region.label === 'The Golden Pause, a short optional breathing moment', region);
    const gone = await page.evaluate(() => ({ ring: document.querySelectorAll('.gp__ring, [data-gp="ring"]').length, mark: document.querySelectorAll('.gp__mark, [data-gp="mark"], svg.gp__mark').length, welcomeBacking: document.querySelectorAll('[data-gp="welcome-backing"]').length }));
    check('no breathing ring and no provisional mark on the page (the film has its own picture and the teacup symbol)', gone.ring === 0 && gone.mark === 0 && gone.welcomeBacking === 0, gone);
    const vars = await page.evaluate(() => { const s = document.querySelector('[data-gp-stage]').style; return { bl: s.getPropertyValue('--gp-bl-center'), wm: s.getPropertyValue('--gp-wm-frac'), tag: s.getPropertyValue('--gp-tagline-y') }; });
    const Lw = CUES.layout.wide;
    check('wide: the player sets the stage positions from cues.js (breath line, wordmark width, tagline)', +vars.bl === Lw.breathLines.center && +vars.wm === Lw.wordmark.widthFrac && +vars.tag === Lw.tagline.centerPost, vars);
    await wordmarkLoaded(page);
    const wmEl = await page.evaluate(() => { const el = window.__gp.g('wordmark'); return { tag: el.tagName, alt: el.getAttribute('alt'), src: el.getAttribute('src'), loaded: el.complete && el.naturalWidth > 0, natural: [el.naturalWidth, el.naturalHeight], attrs: [+el.getAttribute('width'), +el.getAttribute('height')], hiddenFromAT: !!el.closest('[aria-hidden="true"]'), inTrack: el.parentElement === window.__gp.g('wordmark-track'), filter: getComputedStyle(el).filter }; });
    check(`the wordmark is the title image (<img src="${Lw.wordmark.image}" alt="Empatherapy">), loaded at its own size and proportions (${Lw.wordmark.aspect}), in its track, hidden from assistive technology with the rest of the picture, no filter`,
      wmEl.tag === 'IMG' && wmEl.alt === 'Empatherapy' && wmEl.src === Lw.wordmark.image && wmEl.loaded && wmEl.natural.join() === wmEl.attrs.join() && Math.abs(wmEl.natural[0] / wmEl.natural[1] - Lw.wordmark.aspect) / Lw.wordmark.aspect < 0.001 && wmEl.inTrack && wmEl.hiddenFromAT && wmEl.filter === 'none', wmEl);

    // live sync during real playback: rendered state vs the video clock
    const samples = [];
    for (let i = 0; i < 30; i++) {
      samples.push(await page.evaluate(() => { const p = window.GoldenPause.player; const v = document.querySelector('[data-gp="video"]'); const d = window.__gp.dom(); return { vt: v.currentTime, st: p.lastState.t, dom: d, expect: p.stateAt(p.lastState.t) }; }));
      await sleep(90);
    }
    const lag = Math.max(...samples.map((s) => Math.abs(s.vt - s.st)));
    const domMismatch = samples.map((s) => compareState(s.dom, s.expect)).filter((d) => d.length);
    const span = samples[samples.length - 1].vt - samples[0].vt;
    check('playback: rendered overlay time stays within ~1.5 frames of video.currentTime', span > 1.5 && lag < 0.065, `max |video - rendered| = ${(lag * 1000).toFixed(1)} ms over ${samples.length} samples (${samples[0].vt.toFixed(2)}s to ${samples[samples.length - 1].vt.toFixed(2)}s)`);
    check('playback: DOM matches stateAt(rendered time)', domMismatch.length === 0, domMismatch.slice(0, 3));
    const sr = await page.evaluate(() => {
      const stage = document.querySelector('[data-gp-stage]');
      const d = stage.querySelector('[data-gp="description"]');
      const C = window.GOLDEN_PAUSE_CUES;
      const words = C.text.map((x) => x.words).concat([C.welcome.words, 'Empatherapy', C.duration + '-second', 'honey dipper', 'drop', 'script', 'teacup', 'lemon', 'chamomile']);
      const cs = getComputedStyle(d);
      // everything else inside the frame is hidden from assistive technology (the description stands in for it)
      const frame = stage.querySelector('[data-gp="frame"]');
      const exposed = Array.from(frame.children).filter((el) => el.getAttribute('aria-hidden') !== 'true').map((el) => el.className);
      return { liveRegions: document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length,
        inStage: stage.contains(d), visuallyHidden: d.getBoundingClientRect().width <= 1 && cs.position === 'absolute',
        missing: words.filter((w) => !d.textContent.includes(w)), exposed, text: d.textContent };
    });
    check('screen readers: no live announcements (nothing is spoken on a timer)', sr.liveRegions === 0, sr.liveRegions);
    check('screen readers: one static, visually hidden description of the v2 film in the stage, with all three lines and the welcome', sr.inStage && sr.visuallyHidden && sr.missing.length === 0 && sr.exposed.length === 0, { missing: sr.missing, exposed: sr.exposed, visuallyHidden: sr.visuallyHidden });

    // the page scrolls and the hero button is reachable while the film plays
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 700);
    await sleep(400);
    const scrolled = await page.evaluate(() => ({ y: window.scrollY, mode: window.GoldenPause.player.mode }));
    check('page scrolls while the film plays (not a gate)', scrolled.y > 100 && scrolled.mode === 'playing', scrolled);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press('Tab'); // skip link
    const order = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); order.push(await active(page)); }
    check('keyboard: tab order Pause, Sound, Skip, then the hero button', order.join(' | ') === 'toggle | sound | skip | Begin your discovery', order.join(' | '));
    const hero = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { inView: r.top >= 0 && r.bottom <= innerHeight, hitIsButton: hit === a || a.contains(hit), mode: window.GoldenPause.player.mode }; });
    check('hero button focusable, scrolled into view and not covered, while the film plays', hero.inView && hero.hitIsButton && hero.mode === 'playing', hero);
    await page.screenshot({ path: path.join(SHOTS, 'wide-hero-button-focused-while-playing.png'), timeout: 60000 });
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });

    // Pause / Play by keyboard
    await page.focus('[data-gp="toggle"]');
    await page.keyboard.press('Enter');
    await sleep(150);
    let st = await page.evaluate(() => ({ mode: window.GoldenPause.player.mode, paused: document.querySelector('[data-gp="video"]').paused }));
    check('keyboard: Enter on Pause pauses the film and the button reads Play', st.mode === 'paused' && st.paused && (await label(page, 'toggle')) === 'Play', { ...st, label: await label(page, 'toggle') });
    const tPaused = await page.evaluate(() => document.querySelector('[data-gp="video"]').currentTime);
    await sleep(500);
    const tStill = await page.evaluate(() => document.querySelector('[data-gp="video"]').currentTime);
    check('paused: the clock and every overlay hold still', Math.abs(tPaused - tStill) < 0.001);

    // cue timing by seeking (paused)
    const times = [0, 0.3, 0.65, 1.0, 1.4, 2.7, 3.0, 3.2, 3.55, 3.9, 5.0, 6.8, 7.1, 7.4, 7.9, 8.5, 8.8, 8.9, 9.3, 9.7, 10.2, 10.6, 11.0, 11.4, 11.8, 12.4, 12.9];
    const mism = [];
    const at = {};
    const geoBad = [];
    let worstGeo = { dy: 0, dw: 0 };
    for (const t of times) {
      const d = await page.evaluate((t) => window.__gp.seek(t), t);
      const exp = await player(page, `p.stateAt(${t})`);
      const diff = compareState(d, exp);
      if (diff.length) mism.push({ t, diff });
      at[t] = d;
      const g = wordmarkGeo(await page.evaluate(() => window.__gp.wmGeo()), exp, Lw.wordmark);
      worstGeo = { dy: Math.max(worstGeo.dy, g.dy), dw: Math.max(worstGeo.dw, g.dw) };
      if (!g.ok) geoBad.push({ t, y: exp.wordmark.y, scale: exp.wordmark.scale, ...g });
    }
    check(`seeking: DOM matches stateAt(t) at ${times.length} times (opacities, wordmark y and scale)`, mism.length === 0, mism.slice(0, 4));
    check(`wide wordmark image at the same ${times.length} times: width widthFrac (${Lw.wordmark.widthFrac}) x stage width x scale within 1%, its own proportions, centred on x 0.5 and on stateAt's y within 0.006`, geoBad.length === 0, geoBad.length ? geoBad.slice(0, 3) : { worstDy: +worstGeo.dy.toFixed(4), worstWidthErr: +(worstGeo.dw * 100).toFixed(2) + '%' });
    const near = (a, b, e = 0.015) => Math.abs(a - b) < e;
    check('cue: "Take a gentle breath in" fades in 0.3 to 1.0 and out 2.7 to 3.2', near(at[0.3].lineIn.opacity, 0) && near(at[0.65].lineIn.opacity, 0.5) && near(at[1.0].lineIn.opacity, 1) && near(at[2.7].lineIn.opacity, 1) && near(at[3.2].lineIn.opacity, 0));
    check('cue: "And slowly let it go" fades in 3.2 to 3.9 and out 6.8 to 7.4', near(at[3.2].lineOut.opacity, 0) && near(at[3.9].lineOut.opacity, 1) && near(at[6.8].lineOut.opacity, 1) && near(at[7.1].lineOut.opacity, 0.5) && near(at[7.4].lineOut.opacity, 0));
    check('cue: permission line in 0.6 to 1.4, out 6.8 to 7.4', near(at[0.3].permission.opacity, 0) && near(at[1.4].permission.opacity, 1) && near(at[6.8].permission.opacity, 1) && near(at[7.4].permission.opacity, 0));
    check('cue: the backing is in with the first line and out with the last (full at 1.0, 3.2 and 6.8, gone by 7.4)', near(at[1.0].wordsBacking.opacity, 1) && near(at[3.2].wordsBacking.opacity, 1) && near(at[6.8].wordsBacking.opacity, 1) && near(at[7.4].wordsBacking.opacity, 0));
    check('cue: nothing over the picture while the honey name is written and melts (7.9 and 8.5)', [7.9, 8.5].every((t) => OVERLAYS.every((k) => at[t][k].opacity === 0)));
    check('cue: wordmark fades in 8.9 to 9.7 (half at 9.3), tagline 11.0 to 11.8 (half at 11.4)', near(at[8.9].wordmark.opacity, 0) && near(at[9.3].wordmark.opacity, 0.5) && near(at[9.7].wordmark.opacity, 1) && near(at[11.0].tagline.opacity, 0) && near(at[11.4].tagline.opacity, 0.5) && near(at[11.8].tagline.opacity, 1));
    const sc = Lw.script, wm = Lw.wordmark;
    const wmAt = (t) => ({ y: +at[t].wordmark.y.toFixed(4), scale: +at[t].wordmark.scale.toFixed(4) });
    check(`cue: wordmark before the tilt (8.8) sits where the honey wrote the name (y ${sc.centerPre}) at scale ${wm.scalePre}`, near(at[8.8].wordmark.y, sc.centerPre, 0.002) && near(at[8.8].wordmark.scale, wm.scalePre, 0.005) && near(at[5.0].wordmark.y, sc.centerPre, 0.002), wmAt(8.8));
    check(`cue: wordmark halfway through the tilt (9.7) at y ${((sc.centerPre + wm.centerPost) / 2).toFixed(3)} (halfway to centerPost), scale ${((wm.scalePre + 1) / 2).toFixed(3)} (smoothstep 0.5)`, near(at[9.7].wordmark.y, (sc.centerPre + wm.centerPost) / 2, 0.002) && near(at[9.7].wordmark.scale, (wm.scalePre + 1) / 2, 0.005), wmAt(9.7));
    check(`cue: wordmark after the tilt (10.6 on) at y ${wm.centerPost}, scale 1`, [10.6, 11.0, 12.4, 12.9].every((t) => near(at[t].wordmark.y, wm.centerPost, 0.002) && near(at[t].wordmark.scale, 1, 0.005)), wmAt(10.6));
    check('cue: the wordmark only rises and shrinks', times.every((t, i) => i === 0 || (at[t].wordmark.y <= at[times[i - 1]].wordmark.y + 1e-4 && at[t].wordmark.scale <= at[times[i - 1]].wordmark.scale + 1e-4)));

    // screenshots, the bottom band and contrast at key moments
    await fontsReady(page);
    const contrast = {};
    for (const [t, name] of [[1.6, 'wide-1-inhale'], [5.0, 'wide-2-exhale']]) {
      await page.evaluate((t) => window.__gp.seek(t), t);
      await page.locator('.gp').screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 });
      Object.assign(contrast, await page.evaluate(() => window.__gp.contrastAll()));
      bandChecks(await page.evaluate(() => window.__gp.band()), `wide band at ${t}s`);
    }
    for (const [k, v] of Object.entries(contrast)) check(`contrast (wide) ${k}: >= 4.5:1 over the worst case (black under the backing)`, v.ratioOverBlack >= 4.5, v);
    for (const [t, name] of [[7.9, 'wide-3-honey-name'], [9.3, 'wide-4-wordmark-takes-over'], [WM_IN, 'wide-5-wordmark-in'], [10.6, 'wide-6-tilted'], [12.9, 'wide-7-lockup']]) {
      await page.evaluate((t) => window.__gp.seek(t), t);
      await page.locator('.gp').screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 });
      if (t === WM_IN) {
        const wc = await page.evaluate((p) => window.__gp.welcomeContrast(window.__gp.g('video'), p), PARCHMENT);
        check(`contrast (wide) wordmark at ${WM_IN}s, when fully in: >= 4.5:1 on parchment and on the film under it`, wc.wordmark && wc.wordmark.ratioOverParchment >= 4.5 && wc.wordmark.ratioOverDarkest >= 4.5, wc.wordmark);
        const ink = await wordmarkInk(page);
        const want = await wordmarkInkExpected(page);
        const s = await player(page, `p.stateAt(${t})`);
        page.__ink97 = { ink, s };
        check(`wide wordmark at ${WM_IN}s: the image is drawn (its ink, from a screenshot) centred on stateAt's y (${s.wordmark.y}) within 0.006, and on x 0.5`, ink && want && Math.abs(ink.centreY - want.cy) <= 0.006 && Math.abs(ink.centreX - want.cx) <= 0.004 && Math.abs(want.cy - s.wordmark.y) <= 0.006, ink && want && { inkCentreY: +ink.centreY.toFixed(4), expectedInkCentreY: +want.cy.toFixed(4), inkCentreX: +ink.centreX.toFixed(4), inkHeight: +ink.height.toFixed(4), inkWidth: +ink.width.toFixed(4), expectedInkWidth: +want.w.toFixed(4) });
      }
      if (t === 12.9) {
        const wc = await page.evaluate((p) => window.__gp.welcomeContrast(window.__gp.g('video'), p), PARCHMENT);
        check('contrast (wide) wordmark and tagline in the lockup: >= 4.5:1 on parchment and on the film under them', wc.wordmark && wc.tagline && wc.wordmark.ratioOverDarkest >= 4.5 && wc.wordmark.ratioOverParchment >= 4.5 && wc.tagline.ratioOverDarkest >= 4.5 && wc.tagline.ratioOverParchment >= 4.5, wc);
        const ink = await wordmarkInk(page);
        const want = await wordmarkInkExpected(page);
        const { ink: ink97, s: s97 } = page.__ink97 || {};
        const ratio = ink && ink97 ? ink97.height / ink.height : 0;
        check(`wide wordmark in the lockup: the image's ink centred on y ${wm.centerPost} within 0.006, as wide as the image's ink at widthFrac (${wm.widthFrac}) within 2%, drawn ${s97 ? s97.wordmark.scale : '?'}x as tall at ${WM_IN}s`, ink && want && Math.abs(ink.centreY - want.cy) <= 0.006 && Math.abs(want.cy - wm.centerPost) <= 0.006 && Math.abs(ink.width - want.w) / want.w <= 0.02 && Math.abs(ratio - (s97 ? s97.wordmark.scale : 0)) <= 0.03, ink && want && { inkCentreY: +ink.centreY.toFixed(4), expectedInkCentreY: +want.cy.toFixed(4), inkWidth: +ink.width.toFixed(4), expectedInkWidth: +want.w.toFixed(4), inkHeight: +ink.height.toFixed(4), heightRatio97: +ratio.toFixed(3) });
        const g = await page.evaluate(() => window.__gp.wmGeo());
        check(`wide wordmark in the lockup: widthFrac (${wm.widthFrac}) of the stage width within 1%, its height from the image's proportions (${wm.aspect})`, Math.abs(g.w - wm.widthFrac) / wm.widthFrac <= 0.01 && Math.abs(g.aspect - wm.aspect) / wm.aspect <= 0.01, { width: +g.w.toFixed(4), aspect: +g.aspect.toFixed(3) });
        check(`wide lockup: the wordmark's box ends above the teacup symbol's box (symbol.topPost ${Lw.symbol.topPost})`, g.bottom < Lw.symbol.topPost, { wordmarkBottom: +g.bottom.toFixed(4), symbolTop: Lw.symbol.topPost, gapPx: Math.round((Lw.symbol.topPost - g.bottom) * (await page.evaluate(() => window.__gp.box().height))) });
        const tg = await page.evaluate(() => { const B = window.__gp.box(), r = window.__gp.g('tagline').getBoundingClientRect(); return { centre: ((r.top + r.bottom) / 2 - B.top) / B.height, font: getComputedStyle(window.__gp.g('tagline')).fontFamily }; });
        check(`wide tagline centred at tagline.centerPost (${Lw.tagline.centerPost}), in Nunito Sans`, Math.abs(tg.centre - Lw.tagline.centerPost) <= 0.004 && /Nunito Sans/.test(tg.font), { centre: +tg.centre.toFixed(4), font: tg.font });
      }
    }

    // resume
    await page.evaluate((t) => window.__gp.seek(t), 2.0);
    await page.focus('[data-gp="toggle"]');
    await page.keyboard.press('Enter');
    check('keyboard: Enter on Play resumes', await waitMode(page, 'playing'), await label(page, 'toggle'));

    // Sound, by keyboard
    await page.focus('[data-gp="sound"]');
    const tSound = Date.now();
    await page.keyboard.press('Space');
    let audible = true;
    try { await page.waitForFunction(() => window.GoldenPause.player.sound.gain > 0.95, null, { timeout: 5000 }); } catch { audible = false; }
    const msToAudible = Date.now() - tSound;
    let snd = await page.evaluate(() => { const a = document.querySelector('[data-gp="audio"]'); const p = window.GoldenPause.player; return { pressed: document.querySelector('[data-gp="sound"]').getAttribute('aria-pressed'), src: a.currentSrc.split('/').pop(), paused: a.paused, gain: +p.sound.gain.toFixed(3), webaudio: p.sound.webaudio, drift: +p.sound.drift.toFixed(3), learnedLead: +p.sound.lead.toFixed(3) }; });
    check('sound: Space turns it on; silent until on the film clock, then fades up (Web Audio gain)', audible && snd.pressed === 'true' && !snd.paused && snd.webaudio && Math.abs(snd.drift) <= 0.05, { ...snd, msToAudible });
    // stays in sync for a while
    const drifts = [];
    for (let i = 0; i < 15; i++) { drifts.push(await player(page, 'p.sound.drift')); await sleep(100); }
    check('sound: stays within ~50 ms of the film over 1.5 s', drifts.every((d) => Math.abs(d) <= 0.06), { maxDriftMs: Math.round(Math.max(...drifts.map(Math.abs)) * 1000) });
    // large drift: dip, silent re-seat, fade back
    let fixes0 = await player(page, 'p.sound.fixes');
    await page.evaluate(() => { const a = document.querySelector('[data-gp="audio"]'); a.currentTime = a.currentTime + 0.4; });
    let fixedBig = true;
    try { await page.waitForFunction((f) => { const s = window.GoldenPause.player.sound; return s.fixes > f && Math.abs(s.drift) <= 0.05 && s.gain > 0.9; }, fixes0, { timeout: 4000, polling: 50 }); } catch { fixedBig = false; }
    let after = await page.evaluate(() => { const p = window.GoldenPause.player; return { drift: +p.sound.drift.toFixed(3), fixes: p.sound.fixes, gain: +p.sound.gain.toFixed(3) }; });
    check('sound: a 400 ms drift is re-seated to within 50 ms (with a short fade)', fixedBig, after);
    await sleep(500);
    // small drift: speed nudge of at most 2%, no dip (slow by design, so first go back near the start to leave room)
    const settle = () => page.waitForFunction(() => { const s = window.GoldenPause.player.sound; return s.gain > 0.95 && Math.abs(s.drift) <= 0.03 && s.rate === 1; }, null, { timeout: 6000, polling: 50 }).catch(() => {});
    await page.evaluate(() => { document.querySelector('[data-gp="video"]').currentTime = 1.0; });
    await settle();
    fixes0 = await player(page, 'p.sound.fixes');
    // let the sound fall behind gradually (no seek, so no restart lag): slow it until the player notices and takes over
    await page.evaluate(() => { document.querySelector('[data-gp="audio"]').playbackRate = 0.9; });
    let minGain = 1, maxRate = 1, maxDrift = 0, fixedSmall = false;
    const tS = Date.now();
    while (Date.now() - tS < 9000) {
      const s = await page.evaluate(() => { const p = window.GoldenPause.player.sound; return { d: p.drift, g: p.gain, r: p.rate, f: p.fixes }; });
      minGain = Math.min(minGain, s.g); maxRate = Math.max(maxRate, s.r); maxDrift = Math.max(maxDrift, Math.abs(s.d));
      if (s.f > fixes0 && Math.abs(s.d) <= 0.03 && s.r === 1) { fixedSmall = true; break; }
      await sleep(40);
    }
    check('sound: a small drift (under 120 ms) is nudged back by speed, never more than 2% (no dip, no seek)', fixedSmall && minGain > 0.95 && maxRate > 1 && maxRate <= 1.0201 && maxDrift > 0.03, { secs: ((Date.now() - tS) / 1000).toFixed(1), maxDriftMs: Math.round(maxDrift * 1000), minGain: +minGain.toFixed(3), maxRate: +maxRate.toFixed(4) });
    // a network stall: the picture waits, so the sound stops (no looping); when the picture moves again, so does the sound, in sync
    await page.evaluate(() => document.querySelector('[data-gp="video"]').dispatchEvent(new Event('waiting')));
    await sleep(300);
    const stalled = await page.evaluate(() => ({ paused: document.querySelector('[data-gp="audio"]').paused, gain: +window.GoldenPause.player.sound.gain.toFixed(3), wanted: window.GoldenPause.player.sound.wanted }));
    await page.evaluate(() => document.querySelector('[data-gp="video"]').dispatchEvent(new Event('playing')));
    let back = true;
    try { await page.waitForFunction(() => { const s = window.GoldenPause.player.sound; return s.gain > 0.95 && Math.abs(s.drift) <= 0.05 && !document.querySelector('[data-gp="audio"]').paused; }, null, { timeout: 4000 }); } catch { back = false; }
    check('sound: a stall (video "waiting") fades the sound out and stops it; "playing" brings it back in sync', stalled.paused && stalled.gain < 0.01 && stalled.wanted && back, { stalled, back });
    await page.evaluate(() => { document.querySelector('[data-gp="video"]').currentTime = 2.0; });
    await settle();
    // pause fades and stops the sound
    await page.focus('[data-gp="toggle"]');
    await page.keyboard.press('Enter');
    await sleep(350);
    snd = await page.evaluate(() => { const a = document.querySelector('[data-gp="audio"]'); return { paused: a.paused, gain: +window.GoldenPause.player.sound.gain.toFixed(3) }; });
    check('sound: Pause fades the sound out and stops it', snd.paused && snd.gain < 0.01, snd);
    await page.keyboard.press('Enter');
    await waitMode(page, 'playing');
    await page.waitForFunction(() => window.GoldenPause.player.sound.gain > 0.95, null, { timeout: 4000 }).catch(() => {});
    snd = await page.evaluate(() => { const a = document.querySelector('[data-gp="audio"]'); const p = window.GoldenPause.player; return { paused: a.paused, gain: +p.sound.gain.toFixed(3), drift: +p.sound.drift.toFixed(3) }; });
    check('sound: Play resumes the sound in sync', !snd.paused && snd.gain > 0.9 && Math.abs(snd.drift) <= 0.05, snd);
    await page.focus('[data-gp="sound"]');
    await page.keyboard.press('Enter');
    await sleep(400);
    snd = await page.evaluate(() => { const a = document.querySelector('[data-gp="audio"]'); return { paused: a.paused, pressed: document.querySelector('[data-gp="sound"]').getAttribute('aria-pressed'), gain: +window.GoldenPause.player.sound.gain.toFixed(3), context: window.GoldenPause.player.sound.contextState }; });
    check('sound: off again fades out and stops, and the audio context is suspended', snd.paused && snd.pressed === 'false' && snd.gain < 0.01 && snd.context === 'suspended', snd);
    await page.keyboard.press('Enter'); // on again
    await page.waitForFunction(() => { const p = window.GoldenPause.player.sound; return p.contextState === 'running' && p.gain > 0.9 && Math.abs(p.drift) <= 0.05; }, null, { timeout: 4000, polling: 50 }).catch(() => {});
    snd = await page.evaluate(() => { const p = window.GoldenPause.player.sound; return { context: p.contextState, gain: +p.gain.toFixed(3), drift: +p.drift.toFixed(3) }; });
    check('sound: on again wakes the audio context and comes back in sync', snd.context === 'running' && snd.gain > 0.9 && Math.abs(snd.drift) <= 0.05, snd);

    // Skip by keyboard: settled end instantly, button becomes Replay, focus stays
    await page.focus('[data-gp="skip"]');
    await page.keyboard.press('Enter');
    await sleep(60);
    const sk = await page.evaluate(() => { const p = window.GoldenPause.player; const d = window.__gp.dom(); return { mode: p.mode, focus: document.activeElement.getAttribute('data-gp'), wordmark: d.wordmark, tagline: d.tagline.opacity, backing: d.wordsBacking.opacity, lineIn: d.lineIn.opacity, lineOut: d.lineOut.opacity, permission: d.permission.opacity, imgs: window.__gp.imgs(), videoPaused: document.querySelector('[data-gp="video"]').paused }; });
    check('keyboard: Skip jumps to the settled lockup within one frame (wordmark at its place at scale 1, tagline; no breathing words)', sk.mode === 'ended' && sk.wordmark.opacity === 1 && Math.abs(sk.wordmark.y - wm.centerPost) < 0.002 && Math.abs(sk.wordmark.scale - 1) < 0.005 && sk.tagline === 1 && sk.backing === 0 && sk.lineIn === 0 && sk.lineOut === 0 && sk.permission === 0 && sk.videoPaused, sk);
    check('Skip: the wordmark and tagline sit on the lockup frame (end-wide.jpg), never on the honey-name still', sk.imgs.end.shown && sk.imgs.end.loaded && sk.imgs.end.src === 'end-wide.jpg' && !sk.imgs.still.shown, sk.imgs);
    check('Skip turns into Replay without moving focus', (await label(page, 'skip')) === 'Replay' && sk.focus === 'skip', { label: await label(page, 'skip'), focus: sk.focus });
    await page.waitForFunction(() => { const i = document.querySelector('[data-gp="end"]'); return i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).catch(() => {});
    const endC = await page.evaluate((p) => window.__gp.welcomeContrast(window.__gp.g('end'), p), PARCHMENT);
    check('contrast (wide) on the lockup image: the wordmark\'s letters and the tagline >= 4.5:1 against the darkest pixel under them', endC.wordmark && endC.tagline && endC.wordmark.ratioOverDarkest >= 4.5 && endC.tagline.ratioOverDarkest >= 4.5, endC);
    await sleep(250);
    snd = await page.evaluate(() => ({ paused: document.querySelector('[data-gp="audio"]').paused, gain: +window.GoldenPause.player.sound.gain.toFixed(3) }));
    check('sound: Skip fades the sound out and stops it', snd.paused && snd.gain < 0.01, snd);
    check('ended: Pause is hidden, Replay and Sound remain', (await label(page, 'toggle')) === '(hidden)' && (await label(page, 'sound')) === 'Sound');
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, 'wide-8-after-skip.png'), timeout: 60000 });

    // Replay by keyboard
    await page.keyboard.press('Enter');
    const rep = await waitMode(page, 'playing');
    const rp = await page.evaluate(() => ({ t: document.querySelector('[data-gp="video"]').currentTime, focus: document.activeElement.getAttribute('data-gp'), imgs: window.__gp.imgs() }));
    check('keyboard: Replay plays again from the start, focus stays, button reads Skip', rep && rp.t < 1.5 && rp.focus === 'skip' && !rp.imgs.still.shown && !rp.imgs.end.shown && (await label(page, 'skip')) === 'Skip', rp);
    await page.waitForFunction(() => window.GoldenPause.player.sound.gain > 0.95, null, { timeout: 4000 }).catch(() => {});
    snd = await page.evaluate(() => { const p = window.GoldenPause.player; return { paused: document.querySelector('[data-gp="audio"]').paused, drift: +p.sound.drift.toFixed(3) }; });
    check('sound: Replay restarts the sound with the film', !snd.paused && Math.abs(snd.drift) <= 0.05, snd);

    // Esc skips only when focus is inside the stage
    await page.focus('[data-gp="toggle"]');
    await page.keyboard.press('Escape');
    await sleep(60);
    const esc1 = await page.evaluate(() => ({ mode: window.GoldenPause.player.mode, focus: document.activeElement.getAttribute('data-gp') }));
    check('Esc inside the stage skips (focus moves from the hidden Pause to Replay)', esc1.mode === 'ended' && esc1.focus === 'skip', esc1);
    await page.keyboard.press('Enter');
    await waitMode(page, 'playing');
    await page.focus('a.btn--honey');
    await page.keyboard.press('Escape');
    await sleep(100);
    check('Esc outside the stage does nothing to the film', (await player(page, 'p.mode')) === 'playing');

    // natural end
    await page.evaluate((t) => { document.querySelector('[data-gp="video"]').currentTime = t; }, END - 0.8);
    const ended = await waitMode(page, 'ended', 4000);
    const endState = await page.evaluate(() => ({ d: window.__gp.dom(), ended: document.querySelector('[data-gp="video"]').ended, imgs: window.__gp.imgs() }));
    const endLabel = await label(page, 'skip');
    check('natural end: settles on the lockup (wordmark at its place, scale 1, and the tagline), offers Replay, plays once (no loop)', ended && endState.ended && endState.d.wordmark.opacity === 1 && Math.abs(endState.d.wordmark.y - wm.centerPost) < 0.002 && Math.abs(endState.d.wordmark.scale - 1) < 0.005 && endState.d.tagline.opacity === 1 && endLabel === 'Replay', { ended, videoEnded: endState.ended, wordmark: endState.d.wordmark, tagline: endState.d.tagline, endLabel, mode: await player(page, 'p.mode') });
    check('natural end: the lockup frame (end-wide.jpg) shows, not the honey-name still', endState.imgs.end.shown && endState.imgs.end.src === 'end-wide.jpg' && !endState.imgs.still.shown, endState.imgs);
    await sleep(1500);
    check('natural end: stays ended', (await player(page, 'p.mode')) === 'ended');
    await page.focus('[data-gp="skip"]');
    const ctxState = await player(page, 'p.sound.contextState');
    // the film breaks after it has ended: no dead Replay (it would hang in "loading"); the welcome stays
    await page.evaluate(() => document.querySelector('[data-gp="video"]').dispatchEvent(new Event('error')));
    await sleep(60);
    const dead = await page.evaluate(() => ({ mode: window.GoldenPause.player.mode, focus: document.activeElement === document.querySelector('[data-gp-stage]') ? 'stage' : document.activeElement.getAttribute('data-gp'), wordmark: window.__gp.dom().wordmark.opacity, imgs: window.__gp.imgs() }));
    check('error after the end: Replay and Sound go away (no dead button), focus moves to the stage, the welcome stays', dead.mode === 'ended' && (await label(page, 'skip')) === '(hidden)' && (await label(page, 'sound')) === '(hidden)' && (await label(page, 'toggle')) === '(hidden)' && dead.focus === 'stage' && dead.wordmark === 1 && dead.imgs.end.shown, { ...dead, audioContext: ctxState });
    await storageClean(page, ctx, 'wide');
    networkClean(requests, 'wide');
    consoleClean(errors, 'wide', null, page);
    await ctx.close();
  }

  // ======================= 2. Narrow (phone): square film =======================
  {
    const { ctx, page, errors, requests } = await open(`${BASE}${Q}`, { viewport: { width: 390, height: 844 }, dpr: 2, touch: true, mobile: true });
    await helpers(page);
    check('narrow: autoplays', await waitMode(page, 'playing'));
    const n = await page.evaluate(() => { const v = document.querySelector('[data-gp="video"]'); const f = document.querySelector('[data-gp="frame"]').getBoundingClientRect(); const bar = document.querySelector('.gp__bar').getBoundingClientRect(); return { src: v.currentSrc, fmt: window.GoldenPause.player.format, w: f.width, h: f.height, frameBottom: f.bottom, barTop: bar.top, scrollW: document.documentElement.scrollWidth, innerW: innerWidth }; });
    check('narrow: uses film-square.mp4 in a square frame', n.src.endsWith(`${MP}film-square.mp4`) && n.fmt === 'square' && Math.abs(n.w - n.h) < 1, n);
    check('narrow: no horizontal scroll', n.scrollW <= n.innerW, n);
    check('controls sit below the frame, never over the words', n.barTop >= n.frameBottom, { frameBottom: n.frameBottom, barTop: n.barTop });
    const sizes = await page.evaluate(() => Array.from(document.querySelectorAll('.gp-btn')).filter((b) => !b.hidden).map((b) => { const r = b.getBoundingClientRect(); return [b.textContent.trim(), Math.round(r.width), Math.round(r.height)]; }));
    check('controls are at least 44 x 44 px', sizes.every((s) => s[1] >= 44 && s[2] >= 44), sizes);
    await page.tap('[data-gp="toggle"]');
    await sleep(150);
    check('touch: tapping Pause pauses', (await player(page, 'p.mode')) === 'paused');
    await fontsReady(page);
    const Ls = CUES.layout.square;
    const contrast = {};
    for (const [t, name] of [[1.6, 'narrow-1-inhale'], [5.0, 'narrow-2-exhale'], [7.9, 'narrow-3-honey-name'], [WM_IN, 'narrow-4-wordmark-in'], [12.9, 'narrow-5-lockup']]) {
      const d = await page.evaluate((t) => window.__gp.seek(t), t);
      await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 });
      Object.assign(contrast, await page.evaluate(() => window.__gp.contrastAll()));
      if (t < 7) bandChecks(await page.evaluate(() => window.__gp.band()), `narrow band at ${t}s`);
      const exp = await player(page, `p.stateAt(${t})`);
      const diff = compareState(d, exp);
      if (diff.length || t === 12.9) check(`narrow: DOM matches stateAt(${t}, 'square')`, diff.length === 0, diff.length ? diff : { wordmark: d.wordmark });
      if (t >= WM_IN) {
        const g = wordmarkGeo(await page.evaluate(() => window.__gp.wmGeo()), exp, Ls.wordmark);
        check(`narrow wordmark image at ${t}s: width widthFrac (${Ls.wordmark.widthFrac}) x stage width x scale (${exp.wordmark.scale}) within 1%, its own proportions, centred on stateAt's y (${exp.wordmark.y}) within 0.006`, g.ok, { dy: +g.dy.toFixed(4), widthErr: +(g.dw * 100).toFixed(2) + '%', width: +g.geo.w.toFixed(4), wantWidth: +g.wantW.toFixed(4), aspect: +g.geo.aspect.toFixed(3) });
      }
      if (t === WM_IN) {
        await wordmarkLoaded(page);
        const wc = await page.evaluate((p) => window.__gp.welcomeContrast(window.__gp.g('video'), p), PARCHMENT);
        check(`contrast (narrow) wordmark at ${WM_IN}s: >= 4.5:1 on parchment and on the film under it`, wc.wordmark && wc.wordmark.ratioOverParchment >= 4.5 && wc.wordmark.ratioOverDarkest >= 4.5, wc.wordmark);
      }
      if (t === 12.9) {
        const ink = await wordmarkInk(page);
        const want = await wordmarkInkExpected(page);
        check(`narrow wordmark in the lockup: the image's ink centred on y ${Ls.wordmark.centerPost} within 0.006, as wide as expected within 2%, inside the frame`, ink && want && Math.abs(ink.centreY - want.cy) <= 0.006 && Math.abs(want.cy - Ls.wordmark.centerPost) <= 0.006 && Math.abs(ink.width - want.w) / want.w <= 0.02 && ink.width < 0.9, ink && want && { inkCentreY: +ink.centreY.toFixed(4), expectedInkCentreY: +want.cy.toFixed(4), inkWidth: +ink.width.toFixed(4), expectedInkWidth: +want.w.toFixed(4) });
        const g = await page.evaluate(() => window.__gp.wmGeo());
        check(`narrow lockup: the wordmark's box ends above the teacup symbol's box (symbol.topPost ${Ls.symbol.topPost})`, g.bottom < Ls.symbol.topPost, { wordmarkBottom: +g.bottom.toFixed(4), symbolTop: Ls.symbol.topPost, gapPx: Math.round((Ls.symbol.topPost - g.bottom) * (await page.evaluate(() => window.__gp.box().height))) });
        const wPre = g.w * Ls.wordmark.scalePre;
        check(`narrow: at its starting size (x${Ls.wordmark.scalePre}) the wordmark still fits the frame, as wide as the honey name (script.widthFrac ${Ls.script.widthFrac})`, wPre < 0.96 && Math.abs(wPre - Ls.script.widthFrac) <= 0.01, { widthAtScalePre: +wPre.toFixed(3), aspect: +g.aspect.toFixed(3) });
      }
    }
    for (const [k, v] of Object.entries(contrast)) check(`contrast (narrow) ${k}: >= 4.5:1 over the worst case`, v.ratioOverBlack >= 4.5, v);
    await page.tap('[data-gp="skip"]');
    await sleep(80);
    await page.screenshot({ path: path.join(SHOTS, 'narrow-6-after-skip.png'), timeout: 60000 });
    const nImgs = await page.evaluate(() => window.__gp.imgs());
    const nWm = await page.evaluate(() => window.__gp.dom().wordmark);
    check('touch: Skip shows the lockup (end-square.jpg) with the wordmark at the square centerPost, Replay offered', (await player(page, 'p.mode')) === 'ended' && (await label(page, 'skip')) === 'Replay' && nImgs.end.shown && nImgs.end.src === 'end-square.jpg' && !nImgs.still.shown && Math.abs(nWm.y - Ls.wordmark.centerPost) < 0.002 && Math.abs(nWm.scale - 1) < 0.005, { imgs: nImgs, wordmark: nWm });
    await page.waitForFunction(() => { const i = document.querySelector('[data-gp="end"]'); return i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).catch(() => {});
    const nEndC = await page.evaluate((p) => window.__gp.welcomeContrast(window.__gp.g('end'), p), PARCHMENT);
    check('contrast (narrow) on the lockup image: the wordmark\'s letters >= 4.5:1 against the darkest pixel under the image', nEndC.wordmark && nEndC.wordmark.ratioOverDarkest >= 4.5 && nEndC.wordmark.ratioOverParchment >= 4.5, nEndC.wordmark);
    check('contrast (narrow) on the lockup image: the tagline >= 4.5:1 against the darkest pixel under it', nEndC.tagline && nEndC.tagline.ratioOverDarkest >= 4.5, nEndC.tagline);
    await storageClean(page, ctx, 'narrow');
    networkClean(requests, 'narrow');
    consoleClean(errors, 'narrow', null, page);
    await ctx.close();
  }

  // ======================= 2b. The edges of each format: the bottom band stays clear of the name =======================
  for (const [vw, vh, tag] of [[720, 800, 'narrowest wide (720 px window)'], [320, 640, 'small phone (320 px window)']]) {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, { viewport: { width: vw, height: vh } });
    await helpers(page);
    await waitMode(page, 'playing');
    await page.evaluate(() => document.querySelector('[data-gp="video"]').pause());
    await fontsReady(page);
    await page.evaluate(() => window.__gp.seek(1.6));
    bandChecks(await page.evaluate(() => window.__gp.band()), `${tag} band`);
    const c = await page.evaluate(() => window.__gp.contrastAll());
    check(`${tag}: contrast of the band's words >= 4.5:1 over the worst case`, Object.values(c).length === 2 && Object.values(c).every((v) => v.ratioOverBlack >= 4.5), c);
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, `edge-${vw}-inhale.png`), timeout: 60000 });
    const sw = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth }));
    check(`${tag}: no horizontal scroll`, sw.scrollW <= sw.innerW, sw);
    consoleClean(errors, tag, null, page);
    await ctx.close();
  }

  // ======================= 3. Reduced motion =======================
  {
    const { ctx, page, errors, requests } = await open(`${BASE}${Q}`, { reducedMotion: 'reduce' });
    await helpers(page);
    await sleep(1200);
    const rm = await page.evaluate(() => { const p = window.GoldenPause.player; const v = document.querySelector('[data-gp="video"]'); const calm = document.querySelector('.gp__calm'); const perm = document.querySelector('[data-gp="permission"]'); const lines = ['line-in', 'line-out'].map((n) => getComputedStyle(window.__gp.g(n)).visibility); return { mode: p.mode, reason: p.calmReason, paused: v.paused, t: v.currentTime, imgs: window.__gp.imgs(), calmShown: getComputedStyle(calm).display !== 'none', calmText: calm.textContent.replace(/\s+/g, ' ').trim(), timedLines: lines, backing: getComputedStyle(window.__gp.g('words-backing')).opacity, permission: { text: perm.textContent.replace(/\s+/g, ' ').trim(), opacity: getComputedStyle(perm).opacity, visibility: getComputedStyle(perm).visibility }, welcome: getComputedStyle(document.querySelector('.gp__welcome')).visibility }; });
    check('reduced motion: no autoplay; the honey-name still with both breathing lines as static text', rm.mode === 'calm' && rm.reason === 'reduced-motion' && rm.paused && rm.t === 0 && rm.imgs.still.shown && rm.imgs.still.loaded && rm.imgs.still.src === 'still-wide.jpg' && !rm.imgs.end.shown && rm.calmShown && rm.calmText === 'Take a gentle breath in\u2026 And slowly let it go\u2026' && rm.timedLines.every((v) => v === 'hidden') && rm.backing === '1', rm);
    check('reduced motion: the permission line is there too ("Breathe along if you like, or simply watch the honey."), and no welcome', rm.permission.text === 'Breathe along if you like, or simply watch the honey.' && rm.permission.opacity === '1' && rm.permission.visibility === 'visible' && rm.welcome === 'hidden', { ...rm.permission, welcome: rm.welcome });
    const filmReqs = requests.filter((r) => /film-wide\.mp4/.test(r.url));
    check('reduced motion: the film is not downloaded until asked', filmReqs.length === 0, filmReqs.length);
    check('reduced motion: an optional Play button; no Skip, and no Sound (the calm still is silent)', (await label(page, 'toggle')) === 'Play' && (await label(page, 'skip')) === '(hidden)' && (await label(page, 'sound')) === '(hidden)', { toggle: await label(page, 'toggle'), skip: await label(page, 'skip'), sound: await label(page, 'sound') });
    await fontsReady(page);
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, 'reduced-motion-calm.png'), timeout: 60000 });
    bandChecks(await page.evaluate(() => window.__gp.band()), 'calm (wide) band');
    const c = await page.evaluate(() => window.__gp.contrastAll());
    check('calm (wide): both breathing lines and the permission line are measured', ['calm0', 'calm1', 'permission'].every((k) => k in c), Object.keys(c));
    for (const [k, v] of Object.entries(c)) check(`contrast (calm) ${k}: >= 4.5:1 over the worst case`, v.ratioOverBlack >= 4.5, v);
    await page.focus('[data-gp="toggle"]');
    await page.keyboard.press('Enter');
    const rmPlay = await waitMode(page, 'playing');
    const rmAfter = await page.evaluate(() => ({ imgs: window.__gp.imgs(), permission: getComputedStyle(document.querySelector('[data-gp="permission"]')).opacity, calm: getComputedStyle(document.querySelector('.gp__calm')).display }));
    check('reduced motion: Play starts the film when asked (the still and the static lines go; Sound comes back)', rmPlay && !rmAfter.imgs.still.shown && (await label(page, 'sound')) === 'Sound' && parseFloat(rmAfter.permission) < 1 && rmAfter.calm === 'none', rmAfter);
    await storageClean(page, ctx, 'reduced motion');
    networkClean(requests, 'reduced motion');
    consoleClean(errors, 'reduced motion', null, page);
    await ctx.close();
  }
  {
    // the calm still on a phone: square still, both lines, permission line, clear of the name
    const { ctx, page, errors } = await open(`${BASE}${Q}`, { reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, dpr: 2 });
    await helpers(page);
    await waitMode(page, 'calm');
    await fontsReady(page);
    await page.waitForFunction(() => { const s = document.querySelector('[data-gp="still"]'); return s.complete && s.naturalWidth > 0; }, null, { timeout: 5000 }).catch(() => {});
    const imgs = await page.evaluate(() => window.__gp.imgs());
    check('reduced motion (phone): the square honey-name still', imgs.still.shown && imgs.still.src === 'still-square.jpg', imgs);
    bandChecks(await page.evaluate(() => window.__gp.band()), 'calm (phone) band');
    const c = await page.evaluate(() => window.__gp.contrastAll());
    check('contrast (calm, phone): both lines and the permission line >= 4.5:1 over the worst case', ['calm0', 'calm1', 'permission'].every((k) => k in c && c[k].ratioOverBlack >= 4.5), c);
    await page.screenshot({ path: path.join(SHOTS, 'reduced-motion-calm-phone.png'), timeout: 60000 });
    consoleClean(errors, 'reduced motion (phone)', null, page);
    await ctx.close();
  }

  // ======================= 4. Broken video URL =======================
  {
    const { ctx, page, errors, t0 } = await open(`${BASE}?media=_nope/`);
    const ok = await waitMode(page, 'calm', 3000);
    const ms = Date.now() - t0;
    const st = await page.evaluate(() => ({ reason: window.GoldenPause.player.calmReason, calm: getComputedStyle(document.querySelector('.gp__calm')).display }));
    const msIn = await modeTiming(page);
    check('broken video: falls back to the calm still within ~1.5 s', ok && msIn <= 1600 && st.reason === 'error' && st.calm !== 'none', { msAfterPlayerStart: msIn, ...st });
    check('broken video: no Play and no Sound offered (nothing to play), page still usable', (await label(page, 'toggle')) === '(hidden)' && (await label(page, 'sound')) === '(hidden)' && (await page.isVisible('a.btn--honey')));
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, 'broken-video-fallback.png'), timeout: 60000 });
    consoleClean(errors, 'broken video (404s expected)', /Failed to load resource/, page);
    await ctx.close();
  }

  // ======================= 5. The default page (no query string) uses the real media in the preview folder =======================
  {
    const { ctx, page, errors } = await open(`${BASE}`);
    await helpers(page);
    const ok = await waitMode(page, 'playing', 8000);
    const d = await page.evaluate(() => ({ src: document.querySelector('[data-gp="video"]').currentSrc, poster: document.querySelector('[data-gp="video"]').getAttribute('poster'), media: window.GoldenPause.player.media }));
    check('default page: plays the real film from the preview folder (film-wide.mp4, poster, still, end)', ok && d.src === `${ORIGIN}/film-wide.mp4` && d.poster === 'poster-wide.jpg' && d.media.still === 'still-wide.jpg' && d.media.end === 'end-wide.jpg', d);
    consoleClean(errors, 'default page', null, page);
    await ctx.close();
  }

  // ======================= 6. Slow video (not started within 1.5 s) =======================
  {
    const { ctx, page, errors, t0 } = await open(`${BASE}?media=_slow/`);
    const ok = await waitMode(page, 'calm', 3000);
    const ms = Date.now() - t0;
    const msIn = await modeTiming(page);
    check('slow video: calm still after ~1.5 s', ok && msIn >= 1450 && msIn < 1800 && (await player(page, 'p.calmReason')) === 'slow', { msAfterPlayerStart: msIn });
    check('slow video: Play offered, Sound hidden', (await label(page, 'toggle')) === 'Play' && (await label(page, 'sound')) === '(hidden)');
    await page.click('[data-gp="toggle"]');
    check('slow video: Play starts it once it arrives', await waitMode(page, 'playing', 9000));
    consoleClean(errors, 'slow video', null, page);
    await ctx.close();
  }

  // ======================= 7. Save-Data =======================
  {
    const { ctx, page, errors, requests } = await open(`${BASE}${Q}`, { init: () => { Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true }) }); } });
    await sleep(800);
    const sd = await page.evaluate(() => ({ mode: window.GoldenPause.player.mode, reason: window.GoldenPause.player.calmReason, src: document.querySelector('[data-gp="video"]').getAttribute('src') }));
    check('Save-Data: calm still, the film is not requested', sd.mode === 'calm' && sd.reason === 'save-data' && !sd.src && !requests.some((r) => /\.mp4/.test(r.url)), sd);
    await page.click('[data-gp="toggle"]');
    check('Save-Data: Play loads and plays the film on request', await waitMode(page, 'playing'));
    consoleClean(errors, 'save-data', null, page);
    await ctx.close();
  }

  // ======================= 8. Autoplay refused =======================
  {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, {
      init: () => {
        const orig = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this.tagName === 'VIDEO' && !(navigator.userActivation && navigator.userActivation.isActive)) return Promise.reject(new DOMException('autoplay refused (test)', 'NotAllowedError'));
          return orig.call(this);
        };
      }
    });
    const ok = await waitMode(page, 'poster', 3000);
    await helpers(page);
    await page.waitForFunction(() => { const s = document.querySelector('[data-gp="still"]'); return s.complete && s.naturalWidth > 0; }, null, { timeout: 5000 }).catch(() => {});
    const ps = await page.evaluate(() => { const B = window.__gp.box(), g = document.querySelector('.gp__glyph').getBoundingClientRect(); return { glyph: getComputedStyle(document.querySelector('.gp__glyph')).display, glyphBottom: +((g.bottom - B.top) / B.height).toFixed(3), primary: document.querySelector('[data-gp="toggle"]').classList.contains('gp-btn--primary'), imgs: window.__gp.imgs() }; });
    check('autoplay refused: the honey-name still (still-wide.jpg, not the blank parchment poster) and a Play button', ok && (await label(page, 'toggle')) === 'Play' && ps.glyph !== 'none' && ps.primary && ps.imgs.still.shown && ps.imgs.still.loaded && ps.imgs.still.src === 'still-wide.jpg' && !ps.imgs.end.shown, ps);
    check('autoplay refused: the play glyph sits above the honey name', ps.glyphBottom <= CUES.layout.wide.script.topPre, { glyphBottom: ps.glyphBottom, nameTop: CUES.layout.wide.script.topPre });
    await sleep(300);
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, 'autoplay-refused-still.png'), timeout: 60000 });
    await page.click('[data-gp="toggle"]');
    const apOk = await waitMode(page, 'playing');
    const apImgs = await page.evaluate(() => window.__gp.imgs());
    check('autoplay refused: Play starts the film (the still goes)', apOk && !apImgs.still.shown, apImgs);
    consoleClean(errors, 'autoplay refused', null, page);
    await ctx.close();
  }

  // ======================= 9. JavaScript off =======================
  // (the CSS fallback always uses the preview folder's own still, whatever ?media= says: CSS cannot read the query)
  const noPlayerState = (page) => page.evaluate(() => {
    const cs = (sel) => getComputedStyle(document.querySelector(sel));
    const fb = cs('.gp__fallback');
    return { htmlClass: document.documentElement.className, fallbackShown: fb.display !== 'none', fallbackImage: (fb.backgroundImage.match(/[^/"]+\.jpg/) || [''])[0],
      calmShown: cs('.gp__calm').display !== 'none', timedLinesHidden: cs('[data-gp="line-in"]').visibility === 'hidden' && cs('[data-gp="line-out"]').visibility === 'hidden',
      permissionOpacity: cs('[data-gp="permission"]').opacity, backingOpacity: cs('[data-gp="words-backing"]').opacity, welcomeOpacity: cs('[data-gp="wordmark"]').opacity,
      ring: document.querySelectorAll('.gp__ring').length, controlsShown: cs('.gp__controls').display !== 'none', description: !!document.querySelector('[data-gp="description"]') };
  });
  {
    const { ctx, page } = await open(`${BASE}${Q}`, { js: false });
    await sleep(500);
    const s = await noPlayerState(page);
    const vis = { fallback: await page.isVisible('.gp__fallback'), calm: await page.isVisible('.gp__calm'), permission: await page.isVisible('[data-gp="permission"]'), controls: await page.isVisible('.gp__controls'), hero: await page.isVisible('a.btn--honey') };
    check('JavaScript off: the honey-name still with both lines and the permission line on their backing, no wordmark, no dead controls', vis.fallback && vis.calm && vis.permission && vis.hero && !vis.controls && s.fallbackImage === 'still-wide.jpg' && s.timedLinesHidden && s.permissionOpacity === '1' && s.backingOpacity === '1' && s.welcomeOpacity === '0' && s.ring === 0 && s.description, { ...vis, ...s });
    await helpers(page);
    await page.evaluate(() => document.fonts.ready);
    bandChecks(await page.evaluate(() => window.__gp.band()), 'JavaScript off (wide) band');
    const c = await page.evaluate(() => window.__gp.contrastAll());
    check('JavaScript off: contrast of both lines and the permission line >= 4.5:1 over the worst case', ['calm0', 'calm1', 'permission'].every((k) => k in c && c[k].ratioOverBlack >= 4.5), c);
    await page.screenshot({ path: path.join(SHOTS, 'no-javascript.png'), timeout: 60000 });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(`${BASE}${Q}`, { js: false, viewport: { width: 390, height: 844 } });
    await sleep(500);
    const s = await noPlayerState(page);
    await helpers(page);
    await page.evaluate(() => document.fonts.ready);
    const b = await page.evaluate(() => window.__gp.band());
    check('JavaScript off (phone): the square still and the square layout', s.fallbackImage === 'still-square.jpg' && b.format === 'square' && Math.abs(b.frame[0] - b.frame[1]) <= 1, { fallbackImage: s.fallbackImage, frame: b.frame });
    bandChecks(b, 'JavaScript off (phone) band');
    await page.screenshot({ path: path.join(SHOTS, 'no-javascript-phone.png'), timeout: 60000 });
    await ctx.close();
  }

  // ======================= 10. JavaScript on, but player.js or cues.js does not load =======================
  for (const f of ['player.js', 'cues.js']) {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, { block: new RegExp('/' + f.replace('.', '\\.') + '$') });
    await sleep(1200);
    const s = await noPlayerState(page);
    check(`${f} blocked: stays no-js, so the honey-name still with the lines and the permission line shows and there are no dead controls`, s.htmlClass === 'no-js' && s.fallbackShown && s.fallbackImage === 'still-wide.jpg' && s.calmShown && s.timedLinesHidden && s.permissionOpacity === '1' && s.backingOpacity === '1' && !s.controlsShown, s);
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, `blocked-${f}.png`), timeout: 60000 });
    consoleClean(errors, `${f} blocked`, /Failed to load resource|net::ERR_FAILED/, page);
    await ctx.close();
  }
  {
    // while the scripts load, the fallback is held back (no flash of the calm still, no fetch of its image) and the controls keep their room
    const { ctx, page } = await open(`${BASE}${Q}`, { delay: /\/player\.js$/, waitUntil: 'commit' });
    await page.waitForSelector('.gp__controls', { state: 'attached' });
    await sleep(600);
    const s = await noPlayerState(page);
    const ctl = await page.evaluate(() => { const c = document.querySelector('.gp__controls'); return { visibility: getComputedStyle(c).visibility, h: Math.round(c.getBoundingClientRect().height) }; });
    check('while player.js loads: fallback held back (no-js gp-wait), controls keep their room but are invisible', s.htmlClass === 'no-js gp-wait' && !s.fallbackShown && !s.calmShown && s.permissionOpacity === '0' && ctl.visibility === 'hidden' && ctl.h >= 44, { ...s, controls: ctl });
    const ok = await waitMode(page, 'playing', 10000);
    check('...then the player starts normally', ok && (await page.evaluate(() => document.documentElement.className)) === 'js');
    await ctx.close();
  }

  // ======================= 11. Opened in a background tab =======================
  {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, {
      init: () => {
        let vis = 'hidden';
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => vis });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => vis === 'hidden' });
        window.__show = () => { vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); };
      }
    });
    await sleep(2500);
    const bg = await page.evaluate(() => ({ mode: window.GoldenPause.player.mode, paused: document.querySelector('[data-gp="video"]').paused }));
    check('background tab: waits (no play, and no 1.5 s fallback to the calm still) while the page is hidden', bg.mode === 'loading' && bg.paused, bg);
    await page.evaluate(() => window.__show());
    check('background tab: plays once the page is seen', await waitMode(page, 'playing', 6000), await player(page, 'p.mode'));
    consoleClean(errors, 'background tab', null, page);
    await ctx.close();
  }

  // ======================= 12. Rotation / resize: the film is chosen again only while it is not running =======================
  {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, { reducedMotion: 'reduce' });
    await helpers(page);
    const calmOk = await waitMode(page, 'calm');
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(500);
    const r1 = await page.evaluate(() => { const p = window.GoldenPause && window.GoldenPause.player; return { player: !!p, html: document.documentElement.className, cues: !!window.GOLDEN_PAUSE_CUES, fmt: p && p.format, cls: document.querySelector('[data-gp-stage]').className, src: document.querySelector('[data-gp="video"]').getAttribute('src') || '', imgs: window.__gp.imgs(), bl: document.querySelector('[data-gp-stage]').style.getPropertyValue('--gp-bl-center') }; });
    check('rotate on the calm still: square film, square still, square layout', calmOk && r1.fmt === 'square' && /gp--square/.test(r1.cls) && !/gp--wide/.test(r1.cls) && r1.src.endsWith('film-square.mp4') && r1.imgs.still.src === 'still-square.jpg' && r1.imgs.still.shown && +r1.bl === CUES.layout.square.breathLines.center, r1.player ? r1 : { ...r1, errors });
    await fontsReady(page);
    bandChecks(await page.evaluate(() => window.__gp.band()), 'rotated calm band');
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(`${BASE}${Q}`);
    await helpers(page);
    await waitMode(page, 'playing');
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(500);
    const r2 = await page.evaluate(() => ({ fmt: window.GoldenPause.player.format, mode: window.GoldenPause.player.mode }));
    check('rotate while the film plays: it keeps playing the film it started with', r2.fmt === 'wide' && r2.mode === 'playing', r2);
    await page.click('[data-gp="skip"]');
    await sleep(150);
    const r3 = await page.evaluate(() => ({ fmt: window.GoldenPause.player.format, imgs: window.__gp.imgs() }));
    await page.click('[data-gp="skip"]');                // Replay: now the right film for the new shape
    const replayed = await waitMode(page, 'playing', 8000);
    const r4 = await page.evaluate(() => ({ fmt: window.GoldenPause.player.format, src: document.querySelector('[data-gp="video"]').currentSrc }));
    check('...and takes the square film at the next Replay', r3.fmt === 'wide' && replayed && r4.fmt === 'square' && r4.src.endsWith(`${MP}film-square.mp4`), { afterSkip: r3, afterReplay: r4 });
    await page.click('[data-gp="skip"]');
    await sleep(150);
    const sqEnd = await page.evaluate(() => window.__gp.dom().wordmark);
    await page.setViewportSize({ width: 1280, height: 860 });
    await sleep(500);
    const r5 = await page.evaluate(() => ({ fmt: window.GoldenPause.player.format, mode: window.GoldenPause.player.mode, imgs: window.__gp.imgs(), wordmark: window.__gp.dom().wordmark }));
    check('rotate at the end: back to the wide film at once, on the wide lockup, the wordmark moved to the wide centerPost', r5.fmt === 'wide' && r5.mode === 'ended' && r5.imgs.end.shown && r5.imgs.end.src === 'end-wide.jpg' && Math.abs(sqEnd.y - CUES.layout.square.wordmark.centerPost) < 0.002 && Math.abs(r5.wordmark.y - CUES.layout.wide.wordmark.centerPost) < 0.002 && r5.wordmark.opacity === 1, { squareEnd: sqEnd, ...r5 });
    consoleClean(errors, 'rotation', null, page);
    await ctx.close();
  }

  // ======================= 13. Audio output latency (Bluetooth): the sound is sent early by that much =======================
  {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, {
      init: () => { const AC = window.AudioContext; if (AC) Object.defineProperty(AC.prototype, 'outputLatency', { configurable: true, get: () => 0.2 }); }
    });
    await waitMode(page, 'playing');
    await page.click('[data-gp="sound"]');
    await page.waitForFunction(() => window.GoldenPause.player.sound.gain > 0.95, null, { timeout: 5000 }).catch(() => {});
    const lat = [];
    for (let i = 0; i < 8; i++) { lat.push(await page.evaluate(() => { const p = window.GoldenPause.player.sound; return { ahead: document.querySelector('[data-gp="audio"]').currentTime - document.querySelector('[data-gp="video"]').currentTime, drift: p.drift, lat: p.outputLatency }; })); await sleep(120); }
    const worstAhead = Math.max(...lat.map((x) => Math.abs(x.ahead - 0.2))), worstDrift = Math.max(...lat.map((x) => Math.abs(x.drift)));
    check('sound: with 200 ms of output latency, the sound runs 200 ms ahead of the picture so you hear it in sync', lat[0].lat === 0.2 && worstAhead <= 0.05 && worstDrift <= 0.05, { aheadMs: lat.map((x) => Math.round(x.ahead * 1000)), worstDriftMs: Math.round(worstDrift * 1000) });
    consoleClean(errors, 'output latency', null, page);
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:'); failed.forEach((f) => console.log(' - ' + f.name)); }
  process.exit(failed.length ? 1 : 0);
})().catch(async (e) => { console.error(e); try { await browser.close(); } catch {} process.exit(2); });
