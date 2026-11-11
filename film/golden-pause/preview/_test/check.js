// Browser checks for the Golden Pause preview (throwaway).
//   node _test/serve.js 8765   (in another shell, from the preview folder)
//   node _test/check.js [port] [media]
//     media: _test/ (default: the throwaway test media, ?media=_test/) or real (the preview folder's own media, no query string)
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright-core'); } catch {
  pw = require('C:/Users/cassi/AppData/Local/Temp/claude/3b0c31a9197ea945/f9537179-5bb9-4119-a4e4-4e01683b94f9/scratchpad/shots/node_modules/playwright-core');
}
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
const PAGE_HELPERS = () => {
  window.__gp = {
    g: (n) => document.querySelector('[data-gp="' + n + '"]'),
    scale(el) {
      const m = getComputedStyle(el).transform;
      const v = /matrix\(([^)]+)\)/.exec(m);
      if (!v) return 1;
      const p = v[1].split(',').map(Number);
      return Math.hypot(p[0], p[1]);
    },
    dom() {
      const g = this.g, op = (n) => parseFloat(getComputedStyle(g(n)).opacity);
      return {
        t: g('video').currentTime,
        ring: { opacity: op('ring'), scale: this.scale(g('ring')) },
        wordsBacking: { opacity: op('words-backing') },
        lineIn: { opacity: op('line-in') }, lineOut: { opacity: op('line-out') },
        permission: { opacity: op('permission') }, welcomeBacking: { opacity: op('welcome-backing') },
        mark: { opacity: op('mark') }, wordmark: { opacity: op('wordmark') }, tagline: { opacity: op('tagline') }
      };
    },
    async seek(t) {
      const v = this.g('video');
      await new Promise((res) => { const on = () => { v.removeEventListener('seeked', on); res(); }; v.addEventListener('seeked', on); v.currentTime = t; });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return this.dom();
    },
    // the two pictures over the video: the cup (still) and the settled welcome plate (end)
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
    ringClear() {
      // at full breath, the ring (with its glow) must stay clear of the permission words
      const ring = this.g('ring').getBoundingClientRect();
      const words = this.textRects(this.g('permission').querySelector('span'));
      const top = Math.min(...words.map((q) => q.top));
      return { ringBottom: Math.round(ring.bottom), permissionTop: Math.round(top), gap: Math.round(top - ring.bottom) };
    },
    contrastAll() {
      const g = this.g;
      const bgOf = (el, pseudo) => getComputedStyle(el, pseudo).backgroundImage;
      const out = {};
      const wb = g('words-backing');
      const wbo = parseFloat(getComputedStyle(wb).opacity);
      if (parseFloat(getComputedStyle(g('line-in')).opacity) > 0.99) out.lineIn = this.contrast(g('line-in'), wb.getBoundingClientRect(), bgOf(wb), wbo);
      if (parseFloat(getComputedStyle(g('line-out')).opacity) > 0.99) out.lineOut = this.contrast(g('line-out'), wb.getBoundingClientRect(), bgOf(wb), wbo);
      const perm = g('permission');
      if (parseFloat(getComputedStyle(perm).opacity) > 0.99) {
        const span = perm.querySelector('span'), sr = span.getBoundingClientRect(), cs = getComputedStyle(span, '::before');
        const L = parseFloat(cs.left), T = parseFloat(cs.top), R = parseFloat(cs.right), B = parseFloat(cs.bottom);
        const rect = { left: sr.left + L, top: sr.top + T, width: sr.width - L - R, height: sr.height - T - B };
        out.permission = this.contrast(span, rect, cs.backgroundImage, 1);
      }
      const welB = g('welcome-backing'), wo = parseFloat(getComputedStyle(welB).opacity);
      if (parseFloat(getComputedStyle(g('wordmark')).opacity) > 0.99) out.wordmark = this.contrast(g('wordmark'), welB.getBoundingClientRect(), bgOf(welB), wo);
      if (parseFloat(getComputedStyle(g('tagline')).opacity) > 0.99) out.tagline = this.contrast(g('tagline'), welB.getBoundingClientRect(), bgOf(welB), wo);
      const calm = document.querySelector('.gp__calm');
      if (getComputedStyle(calm).display !== 'none') {
        const cb = g('calm-backing');
        calm.querySelectorAll('p').forEach((p, i) => { out['calm' + i] = this.contrast(p, cb.getBoundingClientRect(), bgOf(cb), parseFloat(getComputedStyle(cb).opacity)); });
      }
      return out;
    }
  };
};

async function helpers(page) { await page.evaluate(PAGE_HELPERS); }
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
function compareState(dom, st, tol = 0.012) {
  const diffs = [];
  for (const k of ['ring', 'wordsBacking', 'lineIn', 'lineOut', 'permission', 'welcomeBacking', 'mark', 'wordmark', 'tagline']) {
    if (Math.abs(dom[k].opacity - st[k].opacity) > tol) diffs.push(`${k}.opacity dom ${dom[k].opacity} vs ${st[k].opacity}`);
  }
  if (Math.abs(dom.ring.scale - st.ring.scale) > tol) diffs.push(`ring.scale dom ${dom.ring.scale.toFixed(4)} vs ${st.ring.scale}`);
  return diffs;
}
async function fontsReady(page) { await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 20000))]).then(() => document.fonts.status)); }
async function modeTiming(page) { return page.evaluate(() => { const p = window.GoldenPause.player; return Math.round(p.modeAt - p.startedAt); }); }

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
    const info = await page.evaluate(() => { const v = document.querySelector('[data-gp="video"]'); return { src: v.currentSrc, muted: v.muted, playsInline: v.playsInline, ariaHidden: v.getAttribute('aria-hidden'), fmt: window.GoldenPause.player.format, vfc: window.GoldenPause.player.usesVideoFrameCallback }; });
    check('wide: uses film-wide.mp4 (muted, playsinline, aria-hidden)', info.src.endsWith(`${MP}film-wide.mp4`) && info.muted && info.playsInline && info.ariaHidden === 'true' && info.fmt === 'wide', info);
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    check('the page switches from no-js to js only once the player is running', htmlClass === 'js', htmlClass);
    check('wide: clock sampled with requestVideoFrameCallback', info.vfc === true);
    const region = await page.evaluate(() => { const s = document.querySelector('[data-gp-stage]'); return { tag: s.tagName, label: s.getAttribute('aria-label') }; });
    check('stage is a labelled region', region.tag === 'SECTION' && region.label === 'The Golden Pause, a short optional breathing moment', region);

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
      const words = C.text.map((x) => x.words).concat([C.welcome.words, 'Empatherapy']);
      const cs = getComputedStyle(d);
      // everything else inside the frame is hidden from assistive technology (the description stands in for it)
      const frame = stage.querySelector('[data-gp="frame"]');
      const exposed = Array.from(frame.children).filter((el) => el.getAttribute('aria-hidden') !== 'true').map((el) => el.className);
      return { liveRegions: document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length,
        inStage: stage.contains(d), visuallyHidden: d.getBoundingClientRect().width <= 1 && cs.position === 'absolute',
        missing: words.filter((w) => !d.textContent.includes(w)), exposed, text: d.textContent };
    });
    check('screen readers: no live announcements (nothing is spoken on a timer)', sr.liveRegions === 0, sr.liveRegions);
    check('screen readers: one static, visually hidden description in the stage with all three lines and the welcome', sr.inStage && sr.visuallyHidden && sr.missing.length === 0 && sr.exposed.length === 0, { missing: sr.missing, exposed: sr.exposed, visuallyHidden: sr.visuallyHidden });

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
    const times = [0, 0.3, 0.65, 1.0, 1.6, 2.7, 3.0, 3.2, 3.55, 3.9, 5.0, 7.6, 8.0, 8.4, 9.0, 10.0, 10.5, 11.0, 11.5, 11.9];
    const mism = [];
    const at = {};
    for (const t of times) {
      const d = await page.evaluate((t) => window.__gp.seek(t), t);
      const exp = await player(page, `p.stateAt(${t})`);
      const diff = compareState(d, exp);
      if (diff.length) mism.push({ t, diff });
      at[t] = d;
    }
    check(`seeking: DOM matches stateAt(t) at ${times.length} times`, mism.length === 0, mism.slice(0, 4));
    const near = (a, b) => Math.abs(a - b) < 0.015;
    check('cue: "Take a gentle breath in" fades in 0.3 to 1.0 and out 2.7 to 3.2', near(at[0.3].lineIn.opacity, 0) && near(at[0.65].lineIn.opacity, 0.5) && near(at[1.0].lineIn.opacity, 1) && near(at[2.7].lineIn.opacity, 1) && near(at[3.2].lineIn.opacity, 0));
    check('cue: "And slowly let it go" fades in 3.2 to 3.9 and out 7.6 to 8.4', near(at[3.2].lineOut.opacity, 0) && near(at[3.9].lineOut.opacity, 1) && near(at[7.6].lineOut.opacity, 1) && near(at[8.4].lineOut.opacity, 0));
    check('cue: permission line in 0.6 to 1.4, out 7.6 to 8.4', near(at[0.3].permission.opacity, 0) && near(at[1.6].permission.opacity, 1) && near(at[7.6].permission.opacity, 1) && near(at[8.4].permission.opacity, 0));
    check('cue: ring 0.82 at inhale start, 1.0 at inhale end, 0.82 at exhale end, gone by 8.4', near(at[0.3].ring.scale, 0.82) && near(at[3.0].ring.scale, 1) && near(at[3.2].ring.scale, 1) && near(at[8.0].ring.scale, 0.82) && near(at[8.4].ring.opacity, 0), { s03: at[0.3].ring.scale, s30: at[3.0].ring.scale, s80: at[8.0].ring.scale });
    check('cue: welcome mark 10.0 to 11.0, wordmark to 11.1, tagline 10.5 to 11.5', near(at[10.0].mark.opacity, 0) && near(at[11.0].mark.opacity, 1) && near(at[10.5].tagline.opacity, 0) && near(at[11.5].tagline.opacity, 1) && near(at[11.5].wordmark.opacity, 1));
    check('cue: nothing over the picture at 9.0 (the meeting)', ['ring', 'lineIn', 'lineOut', 'permission', 'mark', 'wordmark', 'tagline'].every((k) => at[9.0][k].opacity === 0));

    const clearW = await page.evaluate(async () => { await window.__gp.seek(3.1); return window.__gp.ringClear(); });
    check('wide: at full breath the ring stays clear of the permission line', clearW.gap > 0, clearW);
    // screenshots and contrast at key moments
    await fontsReady(page);
    const contrast = {};
    for (const [t, name] of [[1.6, 'wide-1-inhale'], [5.0, 'wide-2-exhale'], [9.0, 'wide-3-meeting'], [11.9, 'wide-4-welcome']]) {
      await page.evaluate((t) => window.__gp.seek(t), t);
      await page.locator('.gp').screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 });
      Object.assign(contrast, await page.evaluate(() => window.__gp.contrastAll()));
    }
    for (const [k, v] of Object.entries(contrast)) check(`contrast (wide) ${k}: >= 4.5:1 over the worst case (black under the backing)`, v.ratioOverBlack >= 4.5, v);

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
    const sk = await page.evaluate(() => { const p = window.GoldenPause.player; const d = window.__gp.dom(); return { mode: p.mode, focus: document.activeElement.getAttribute('data-gp'), wordmark: d.wordmark.opacity, tagline: d.tagline.opacity, ring: d.ring.opacity, lineOut: d.lineOut.opacity, imgs: window.__gp.imgs(), videoPaused: document.querySelector('[data-gp="video"]').paused }; });
    check('keyboard: Skip jumps to the settled end within one frame', sk.mode === 'ended' && sk.wordmark === 1 && sk.tagline === 1 && sk.ring === 0 && sk.lineOut === 0 && sk.videoPaused, sk);
    check('Skip: the welcome sits on the end plate (end-wide.jpg), never on the cup still', sk.imgs.end.shown && sk.imgs.end.loaded && sk.imgs.end.src === 'end-wide.jpg' && !sk.imgs.still.shown, sk.imgs);
    check('Skip turns into Replay without moving focus', (await label(page, 'skip')) === 'Replay' && sk.focus === 'skip', { label: await label(page, 'skip'), focus: sk.focus });
    await sleep(250);
    snd = await page.evaluate(() => ({ paused: document.querySelector('[data-gp="audio"]').paused, gain: +window.GoldenPause.player.sound.gain.toFixed(3) }));
    check('sound: Skip fades the sound out and stops it', snd.paused && snd.gain < 0.01, snd);
    check('ended: Pause is hidden, Replay and Sound remain', (await label(page, 'toggle')) === '(hidden)' && (await label(page, 'sound')) === 'Sound');
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, 'wide-5-after-skip.png'), timeout: 60000 });

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
    await page.evaluate(() => { document.querySelector('[data-gp="video"]').currentTime = 11.2; });
    const ended = await waitMode(page, 'ended', 4000);
    const endState = await page.evaluate(() => ({ d: window.__gp.dom(), ended: document.querySelector('[data-gp="video"]').ended, imgs: window.__gp.imgs() }));
    const endLabel = await label(page, 'skip');
    check('natural end: settles on the welcome, offers Replay, plays once (no loop)', ended && endState.ended && endState.d.wordmark.opacity === 1 && endLabel === 'Replay', { ended, videoEnded: endState.ended, wordmark: endState.d.wordmark, endLabel, mode: await player(page, 'p.mode') });
    check('natural end: the welcome sits on the end plate, not the cup', endState.imgs.end.shown && endState.imgs.end.src === 'end-wide.jpg' && !endState.imgs.still.shown, endState.imgs);
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
    const contrast = {};
    for (const [t, name] of [[1.6, 'narrow-1-inhale'], [5.0, 'narrow-2-exhale'], [11.9, 'narrow-3-welcome']]) {
      await page.evaluate((t) => window.__gp.seek(t), t);
      await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 });
      Object.assign(contrast, await page.evaluate(() => window.__gp.contrastAll()));
    }
    for (const [k, v] of Object.entries(contrast)) check(`contrast (narrow) ${k}: >= 4.5:1 over the worst case`, v.ratioOverBlack >= 4.5, v);
    const clearN = await page.evaluate(async () => { await window.__gp.seek(3.1); return window.__gp.ringClear(); });
    check('narrow: at full breath the ring stays clear of the permission line', clearN.gap > 0, clearN);
    // words fit inside the smallest ring
    const fit = await page.evaluate(async () => {
      const out = {};
      for (const [t, k] of [[1.6, 'line-in'], [5.0, 'line-out']]) {
        await window.__gp.seek(t);
        const ring = document.querySelector('[data-gp="ring"]').getBoundingClientRect();
        const r = (ring.width / 2) * (0.82 / window.__gp.scale(document.querySelector('[data-gp="ring"]')));
        const cx = ring.left + ring.width / 2, cy = ring.top + ring.height / 2;
        let worst = 0;
        for (const q of window.__gp.textRects(document.querySelector('[data-gp="' + k + '"]'))) for (const [x, y] of [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]]) worst = Math.max(worst, Math.hypot(x - cx, y - cy));
        out[k] = { textCornerDist: Math.round(worst), smallestRingRadius: Math.round(r) };
      }
      return out;
    });
    check('narrow: the words stay inside the ring even at its smallest', Object.values(fit).every((f) => f.textCornerDist < f.smallestRingRadius), fit);
    await page.tap('[data-gp="skip"]');
    await sleep(80);
    await page.screenshot({ path: path.join(SHOTS, 'narrow-4-after-skip.png'), timeout: 60000 });
    const nImgs = await page.evaluate(() => window.__gp.imgs());
    check('touch: Skip shows the end on the end plate (end-square.jpg), Replay offered', (await player(page, 'p.mode')) === 'ended' && (await label(page, 'skip')) === 'Replay' && nImgs.end.shown && nImgs.end.src === 'end-square.jpg' && !nImgs.still.shown, nImgs);
    await storageClean(page, ctx, 'narrow');
    networkClean(requests, 'narrow');
    consoleClean(errors, 'narrow', null, page);
    await ctx.close();
  }

  // ======================= 3. Reduced motion =======================
  {
    const { ctx, page, errors, requests } = await open(`${BASE}${Q}`, { reducedMotion: 'reduce' });
    await helpers(page);
    await sleep(1200);
    const rm = await page.evaluate(() => { const p = window.GoldenPause.player; const v = document.querySelector('[data-gp="video"]'); const calm = document.querySelector('.gp__calm'); const perm = document.querySelector('[data-gp="permission"]'); const ring = document.querySelector('[data-gp="ring"]'); return { mode: p.mode, reason: p.calmReason, paused: v.paused, t: v.currentTime, imgs: window.__gp.imgs(), calmShown: getComputedStyle(calm).display !== 'none', calmText: calm.textContent.replace(/\s+/g, ' ').trim(), calmAriaHidden: calm.getAttribute('aria-hidden'), permission: { text: perm.textContent.replace(/\s+/g, ' ').trim(), opacity: getComputedStyle(perm).opacity, visibility: getComputedStyle(perm).visibility }, ringShown: getComputedStyle(ring).visibility !== 'hidden' && parseFloat(getComputedStyle(ring).opacity) > 0 }; });
    check('reduced motion: no autoplay; the cup still with the two lines as static text', rm.mode === 'calm' && rm.reason === 'reduced-motion' && rm.paused && rm.t === 0 && rm.imgs.still.shown && rm.imgs.still.loaded && rm.imgs.still.src === 'still-wide.jpg' && !rm.imgs.end.shown && rm.calmShown && rm.calmText === 'Take a gentle breath in\u2026 And slowly let it go\u2026' && rm.calmAriaHidden === 'true', rm);
    check('reduced motion: the permission line is there too ("Breathe along if you like, or simply watch the honey.")', rm.permission.text === 'Breathe along if you like, or simply watch the honey.' && rm.permission.opacity === '1' && rm.permission.visibility === 'visible', rm.permission);
    check('reduced motion: no ring on the calm still', !rm.ringShown);
    const filmReqs = requests.filter((r) => /film-wide\.mp4/.test(r.url));
    check('reduced motion: the film is not downloaded until asked', filmReqs.length === 0, filmReqs.length);
    check('reduced motion: an optional Play button; no Skip, and no Sound (the calm still is silent)', (await label(page, 'toggle')) === 'Play' && (await label(page, 'skip')) === '(hidden)' && (await label(page, 'sound')) === '(hidden)', { toggle: await label(page, 'toggle'), skip: await label(page, 'skip'), sound: await label(page, 'sound') });
    await fontsReady(page);
    await page.locator('.gp').screenshot({ path: path.join(SHOTS, 'reduced-motion-calm.png'), timeout: 60000 });
    const c = await page.evaluate(() => window.__gp.contrastAll());
    for (const [k, v] of Object.entries(c)) check(`contrast (calm) ${k}: >= 4.5:1 over the worst case`, v.ratioOverBlack >= 4.5, v);
    await page.focus('[data-gp="toggle"]');
    await page.keyboard.press('Enter');
    const rmPlay = await waitMode(page, 'playing');
    const rmAfter = await page.evaluate(() => ({ imgs: window.__gp.imgs(), permission: getComputedStyle(document.querySelector('[data-gp="permission"]')).opacity }));
    check('reduced motion: Play starts the film when asked (the still and the static lines go; Sound comes back)', rmPlay && !rmAfter.imgs.still.shown && (await label(page, 'sound')) === 'Sound' && parseFloat(rmAfter.permission) < 1, rmAfter);
    await storageClean(page, ctx, 'reduced motion');
    networkClean(requests, 'reduced motion');
    consoleClean(errors, 'reduced motion', null, page);
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
    const ps = await page.evaluate(() => ({ glyph: getComputedStyle(document.querySelector('.gp__glyph')).display, primary: document.querySelector('[data-gp="toggle"]').classList.contains('gp-btn--primary'), imgs: window.__gp.imgs() }));
    check('autoplay refused: the cup still (still-wide.jpg, not the blank poster) and a Play button', ok && (await label(page, 'toggle')) === 'Play' && ps.glyph !== 'none' && ps.primary && ps.imgs.still.shown && ps.imgs.still.loaded && ps.imgs.still.src === 'still-wide.jpg' && !ps.imgs.end.shown, ps);
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
      calmShown: cs('.gp__calm').display !== 'none', permissionOpacity: cs('[data-gp="permission"]').opacity, ringHidden: cs('[data-gp="ring"]').visibility === 'hidden',
      controlsShown: cs('.gp__controls').display !== 'none', description: !!document.querySelector('[data-gp="description"]') };
  });
  {
    const { ctx, page } = await open(`${BASE}${Q}`, { js: false });
    await sleep(500);
    const s = await noPlayerState(page);
    const vis = { fallback: await page.isVisible('.gp__fallback'), calm: await page.isVisible('.gp__calm'), permission: await page.isVisible('[data-gp="permission"]'), controls: await page.isVisible('.gp__controls'), hero: await page.isVisible('a.btn--honey') };
    check('JavaScript off: the cup still with both lines and the permission line, no ring, no dead controls', vis.fallback && vis.calm && vis.permission && vis.hero && !vis.controls && s.fallbackImage === 'still-wide.jpg' && s.permissionOpacity === '1' && s.ringHidden && s.description, { ...vis, ...s });
    await page.screenshot({ path: path.join(SHOTS, 'no-javascript.png'), timeout: 60000 });
    await ctx.close();
  }

  // ======================= 10. JavaScript on, but player.js or cues.js does not load =======================
  for (const f of ['player.js', 'cues.js']) {
    const { ctx, page, errors } = await open(`${BASE}${Q}`, { block: new RegExp('/' + f.replace('.', '\\.') + '$') });
    await sleep(1200);
    const s = await noPlayerState(page);
    check(`${f} blocked: stays no-js, so the cup still with the lines and the permission line shows and there are no dead controls`, s.htmlClass === 'no-js' && s.fallbackShown && s.fallbackImage === 'still-wide.jpg' && s.calmShown && s.permissionOpacity === '1' && s.ringHidden && !s.controlsShown, s);
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
    check('while player.js loads: fallback held back (no-js gp-wait), controls keep their room but are invisible', s.htmlClass === 'no-js gp-wait' && !s.fallbackShown && !s.calmShown && ctl.visibility === 'hidden' && ctl.h >= 44, { ...s, controls: ctl });
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
    const r1 = await page.evaluate(() => { const p = window.GoldenPause && window.GoldenPause.player; return { player: !!p, html: document.documentElement.className, cues: !!window.GOLDEN_PAUSE_CUES, fmt: p && p.format, cls: document.querySelector('[data-gp-stage]').className, src: document.querySelector('[data-gp="video"]').getAttribute('src') || '', imgs: window.__gp.imgs() }; });
    check('rotate on the calm still: square film, square still', calmOk && r1.fmt === 'square' && /gp--square/.test(r1.cls) && !/gp--wide/.test(r1.cls) && r1.src.endsWith('film-square.mp4') && r1.imgs.still.src === 'still-square.jpg' && r1.imgs.still.shown, r1.player ? r1 : { ...r1, errors });
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
    await page.setViewportSize({ width: 1280, height: 860 });
    await sleep(500);
    const r5 = await page.evaluate(() => ({ fmt: window.GoldenPause.player.format, mode: window.GoldenPause.player.mode, imgs: window.__gp.imgs() }));
    check('rotate at the end: back to the wide film at once, on the wide end plate', r5.fmt === 'wide' && r5.mode === 'ended' && r5.imgs.end.shown && r5.imgs.end.src === 'end-wide.jpg', r5);
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
