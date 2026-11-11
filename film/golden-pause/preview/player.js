/* The Golden Pause: preview player.
   One clock: the video's currentTime. The ring, the words, the welcome and the sound all follow it.
   stateAt(t) is a pure function of time and the cue numbers (cues.js), so it can be unit-tested in Node:
     const cues = require('./cues.js'); const { stateAt } = require('./player.js'); stateAt(1.0, cues)
   No storage of any kind, no analytics. Network: the page's own media files, plus the Google Fonts stylesheet
   and font files, which tell Google the visitor's IP address (on the live site, self-host the fonts). */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Pure timing. No DOM, no globals read except the default cue numbers.
  // ---------------------------------------------------------------------------------------------
  var RING_MIN = 0.82;
  var RING_MAX = 1.0;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ramp(t, a, b) { if (!(b > a)) return t >= a ? 1 : 0; return clamp01((t - a) / (b - a)); }
  /** ease in-out (sine): 0..1 -> 0..1 */
  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x)); }
  function round(x) { return Math.round(x * 10000) / 10000; }
  /** opacity of a cue that fades in across fadeIn=[a,b] and (optionally) out across fadeOut=[c,d] */
  function fade(t, fadeIn, fadeOut) {
    var up = ease(ramp(t, fadeIn[0], fadeIn[1]));
    var down = fadeOut ? 1 - ease(ramp(t, fadeOut[0], fadeOut[1])) : 1;
    return round(Math.min(up, down));
  }
  /** ring scale: grows across the inhale window, holds, shrinks across the exhale window */
  function breathScale(t, breath) {
    var span = RING_MAX - RING_MIN;
    if (t <= breath.inhale[0]) return RING_MIN;
    if (t < breath.inhale[1]) return round(RING_MIN + span * ease(ramp(t, breath.inhale[0], breath.inhale[1])));
    if (t <= breath.exhale[0]) return RING_MAX;
    if (t < breath.exhale[1]) return round(RING_MAX - span * ease(ramp(t, breath.exhale[0], breath.exhale[1])));
    return RING_MIN;
  }
  function textCue(cues, id) {
    for (var i = 0; i < cues.text.length; i++) if (cues.text[i].id === id) return cues.text[i];
    throw new Error('cues.text has no "' + id + '" cue');
  }

  /**
   * The state of every overlay at film time t (seconds).
   * Each overlay: { opacity: 0..1, scale }. Welcome items also carry offset (0 = at rest, 1 = fully lowered).
   */
  function stateAt(t, cues) {
    cues = cues || (root && root.GOLDEN_PAUSE_CUES);
    if (!cues) throw new Error('stateAt needs the cue numbers from cues.js');
    var T = typeof t === 'number' && isFinite(t) ? Math.min(Math.max(t, 0), cues.duration) : 0;
    var cIn = textCue(cues, 'in');
    var cOut = textCue(cues, 'out');
    var cPerm = textCue(cues, 'permission');
    var w = cues.welcome;
    var b = cues.breath;

    // The ring and the backing behind the words share one envelope: in with the first line, out with the second.
    var words = fade(T, cIn.fadeIn, cOut.fadeOut);
    var mark = fade(T, w.mark);
    var wordmark = fade(T, w.wordmark);
    var tagline = fade(T, w.tagline);

    var phase =
      T < b.inhale[0] ? 'arrive' :
      T < b.inhale[1] ? 'inhale' :
      T < b.exhale[0] ? 'turn' :
      T < b.exhale[1] ? 'exhale' :
      T < w.mark[0] ? 'meeting' :
      T < cues.settle ? 'welcome' : 'settled';

    return {
      t: round(T),
      phase: phase,
      settled: T >= cues.settle,
      ring: { opacity: words, scale: breathScale(T, b) },
      wordsBacking: { opacity: words, scale: 1 },
      lineIn: { opacity: fade(T, cIn.fadeIn, cIn.fadeOut), scale: 1 },
      lineOut: { opacity: fade(T, cOut.fadeIn, cOut.fadeOut), scale: 1 },
      permission: { opacity: fade(T, cPerm.fadeIn, cPerm.fadeOut), scale: 1 },
      welcomeBacking: { opacity: mark, scale: 1 },
      mark: { opacity: mark, scale: round(0.94 + 0.06 * mark), offset: round(1 - mark) },
      wordmark: { opacity: wordmark, scale: 1, offset: round(1 - wordmark) },
      tagline: { opacity: tagline, scale: 1, offset: round(1 - tagline) }
    };
  }

  var api = { stateAt: stateAt, breathScale: breathScale, fade: fade, ease: ease, ramp: ramp, RING_MIN: RING_MIN, RING_MAX: RING_MAX };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (!root || typeof document === 'undefined') return;
  root.GoldenPause = api;

  // ---------------------------------------------------------------------------------------------
  // The player (browser only)
  // ---------------------------------------------------------------------------------------------
  var html = document.documentElement;

  // Apply the preloaded web fonts without ever blocking the page (a slow font server must not hold up the film).
  (function applyFonts() {
    var pre = document.querySelector('link[data-gp-fonts]');
    if (!pre || pre.getAttribute('data-applied')) return;
    pre.setAttribute('data-applied', '1');
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = pre.href;
    document.head.appendChild(css);
  })();

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // The page says "no-js" (the calm still, no controls) until the player has really started. Only then does it
  // become "js". If anything here fails, the calm still stays, rather than controls that do nothing.
  function init() {
    var stage = document.querySelector('[data-gp-stage]');
    if (!stage || !root.GOLDEN_PAUSE_CUES || api.player) return;
    try {
      api.player = createPlayer(stage, root.GOLDEN_PAUSE_CUES);
    } catch (e) {
      api.player = undefined;
      try { var v = stage.querySelector('[data-gp="video"]'); v.pause(); v.removeAttribute('src'); v.load(); } catch (e2) { /* ignore */ }
      return;
    }
    html.className = html.className.replace(/\bno-js\b/, 'js').replace(/\s*\bgp-wait\b/, '');
  }
  // The scripts sit at the end of <body>, so the stage is already there: start now, before the first paint if possible.
  if (document.querySelector('[data-gp-stage]')) init(); else ready(init);

  /** Optional ?media=folder/ prefix for the media files (for testing). Relative paths only. */
  function mediaBase() {
    var v = '';
    try { v = new URLSearchParams(root.location.search).get('media') || ''; } catch (e) { v = ''; }
    if (!v || !/^[A-Za-z0-9_\-./]+$/.test(v) || v.charAt(0) === '/' || v.indexOf('..') !== -1) return '';
    return v.charAt(v.length - 1) === '/' ? v : v + '/';
  }

  function createPlayer(stage, cues) {
    function q(name) {
      var el = stage.querySelector('[data-gp="' + name + '"]');
      if (!el) throw new Error('The Golden Pause: missing [data-gp="' + name + '"]');
      return el;
    }
    var frame = q('frame');
    var video = q('video');
    var still = q('still');
    var endImg = q('end');
    var audioEl = q('audio');
    var btnToggle = q('toggle');
    var btnSound = q('sound');
    var btnSkip = q('skip');
    var els = {
      ring: q('ring'), wordsBacking: q('words-backing'), lineIn: q('line-in'), lineOut: q('line-out'),
      permission: q('permission'), welcomeBacking: q('welcome-backing'), mark: q('mark'), wordmark: q('wordmark'), tagline: q('tagline')
    };
    var END = cues.duration;
    var FPS = cues.fps || 24;

    // ---------- which film: wide (16:9) or square, by the width of the window ----------
    // Chosen at load. On a rotation or resize it is chosen again only while the film is not running
    // (autoplay refused, the calm still, the end, or still loading for the first time); otherwise at the next Play.
    function wantFormat() { return (root.innerWidth || html.clientWidth || 0) > 700 ? 'wide' : 'square'; }
    var fmt = wantFormat();
    stage.classList.add('gp--' + fmt);
    var base = mediaBase();
    var media = { webm: base + 'golden-pause.webm', m4a: base + 'golden-pause.m4a' };
    function setMediaUrls() {
      media.film = base + 'film-' + fmt + '.mp4';
      media.poster = base + 'poster-' + fmt + '.jpg';
      media.still = base + 'still-' + fmt + '.jpg';
      media.end = base + 'end-' + fmt + '.jpg';
    }
    setMediaUrls();

    var reduceMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var conn = root.navigator && root.navigator.connection;
    var saveData = !!(conn && conn.saveData === true);

    var mode = 'loading';        // loading | playing | paused | poster | calm | ended
    var calmReason = '';
    var videoFailed = false;
    var srcSet = false;
    var startTimer = 0;
    var lastState = null;
    var userPaused = false;
    var everPlayed = false;      // the film has shown its first moving frame at least once
    var playRequested = false;   // play() has been asked for at least once
    var lastPlayAuto = false;    // the most recent play() was the autoplay attempt
    var formatStale = false;     // the window changed shape while the film was running
    var startedAt = now();
    var modeAt = 0;

    function isHidden() { return document.visibilityState === 'hidden'; }
    /** fn now if the page is visible, otherwise on its first return to visible (background tabs defer media). */
    function whenVisible(fn) {
      if (!isHidden()) { fn(); return; }
      function on() {
        if (isHidden()) return;
        document.removeEventListener('visibilitychange', on);
        fn();
      }
      document.addEventListener('visibilitychange', on);
    }

    // ---------- media setup ----------
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false;
    function usePoster() { if (!video.getAttribute('poster')) video.poster = media.poster; }

    function setSrc(preload) {
      if (srcSet) return;
      srcSet = true;
      video.preload = preload;
      video.src = media.film;
    }

    // Two images over the video: the cup (still) and the settled welcome plate (end). Never both.
    // A missing image hides itself; the video (its poster or its last frame) shows through instead.
    function imageLayer(img, url) {
      img.addEventListener('error', function () { img.hidden = true; img.removeAttribute('src'); img.dataset.failed = '1'; });
      return {
        load: function () { if (!img.getAttribute('src') && !img.dataset.failed) img.src = url(); },
        show: function () { if (img.dataset.failed) return; this.load(); img.hidden = false; },
        hide: function () { img.hidden = true; },
        retarget: function () {
          delete img.dataset.failed;
          if (img.getAttribute('src')) img.src = url();
        }
      };
    }
    var stillLayer = imageLayer(still, function () { return media.still; });
    var endLayer = imageLayer(endImg, function () { return media.end; });
    function showStill() { endLayer.hide(); stillLayer.show(); }
    function hideStill() { stillLayer.hide(); }
    function showEnd() { stillLayer.hide(); endLayer.show(); }
    function hideEnd() { endLayer.hide(); }

    // ---------- rendering ----------
    var cache = {};
    function put(key, node, opacity, transform) {
      if (!node) return;
      var c = cache[key] || (cache[key] = {});
      if (c.o !== opacity) { node.style.opacity = String(opacity); c.o = opacity; }
      if (transform !== undefined && c.tf !== transform) { node.style.transform = transform; c.tf = transform; }
    }
    function render(t) {
      var s = stateAt(t, cues);
      lastState = s;
      put('ring', els.ring, s.ring.opacity, 'translate(-50%, -50%) scale(' + s.ring.scale + ')');
      put('wordsBacking', els.wordsBacking, s.wordsBacking.opacity);
      put('lineIn', els.lineIn, s.lineIn.opacity);
      put('lineOut', els.lineOut, s.lineOut.opacity);
      put('permission', els.permission, s.permission.opacity);
      put('welcomeBacking', els.welcomeBacking, s.welcomeBacking.opacity);
      put('mark', els.mark, s.mark.opacity, 'translateY(' + round(s.mark.offset * 6) + 'px) scale(' + s.mark.scale + ')');
      put('wordmark', els.wordmark, s.wordmark.opacity, 'translateY(' + round(s.wordmark.offset * 8) + 'px)');
      put('tagline', els.tagline, s.tagline.opacity, 'translateY(' + round(s.tagline.offset * 6) + 'px)');
      return s;
    }
    function renderCalm() {
      // The calm still: its two static lines (.gp__calm), and the permission line in its usual place.
      // Every timed overlay is at rest, the ring included (no ring on the calm still).
      render(0);
      put('permission', els.permission, 1);
    }

    // ---------- the clock ----------
    // requestVideoFrameCallback samples the video's time once per decoded frame; between frames
    // requestAnimationFrame carries it forward (never more than one frame ahead) so the ring stays smooth.
    // Without requestVideoFrameCallback, requestAnimationFrame reads video.currentTime directly.
    var hasVFC = typeof video.requestVideoFrameCallback === 'function';
    var clock = { running: false, raf: 0, vfc: 0, media: 0, wall: 0, last: -1 };
    function now() { return root.performance && performance.now ? performance.now() : Date.now(); }
    function startClock() {
      if (clock.running) return;
      clock.running = true;
      clock.media = video.currentTime;
      clock.wall = now();
      clock.last = -1;
      if (hasVFC) clock.vfc = video.requestVideoFrameCallback(onVideoFrame);
      clock.raf = requestAnimationFrame(onTick);
    }
    function stopClock() {
      clock.running = false;
      if (clock.raf) cancelAnimationFrame(clock.raf);
      if (hasVFC && clock.vfc && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(clock.vfc);
      clock.raf = 0; clock.vfc = 0;
    }
    function onVideoFrame(ts, meta) {
      if (!clock.running) return;
      clock.media = meta && typeof meta.mediaTime === 'number' ? meta.mediaTime : video.currentTime;
      clock.wall = meta && meta.expectedDisplayTime ? meta.expectedDisplayTime : ts;
      clock.vfc = video.requestVideoFrameCallback(onVideoFrame);
    }
    function onTick(ts) {
      if (!clock.running) return;
      var t;
      if (hasVFC) {
        var ahead = Math.max(0, (ts - clock.wall) / 1000) * (video.playbackRate || 1);
        t = clock.media + Math.min(ahead, 1 / FPS);
        if (t < clock.last && clock.last - t < 0.1) t = clock.last; // no tiny backward steps
      } else {
        t = video.currentTime;
      }
      clock.last = t;
      render(t);
      syncAudio();
      clock.raf = requestAnimationFrame(onTick);
    }

    // ---------- controls ----------
    function setLabel(btn, text, state) {
      var l = btn.querySelector('.gp-btn__label');
      if (l.textContent !== text) l.textContent = text;
      if (state) btn.setAttribute('data-state', state);
    }
    function updateControls() {
      var running = mode === 'playing' || mode === 'loading';
      setLabel(btnToggle, running ? 'Pause' : 'Play', running ? 'pause' : 'play');
      setLabel(btnSkip, mode === 'ended' ? 'Replay' : 'Skip', mode === 'ended' ? 'replay' : 'skip');
      btnToggle.classList.toggle('gp-btn--primary', mode === 'poster' || mode === 'calm');
      var deadEnd = mode === 'ended' && videoFailed;   // the film broke after it ended: nothing left to replay
      var show = {
        toggle: mode !== 'ended' && !(mode === 'calm' && videoFailed),
        skip: mode !== 'calm' && !deadEnd,
        sound: mode !== 'calm' && !deadEnd             // the calm still is silent: no Sound button that does nothing
      };
      var order = [[btnSkip, show.skip], [btnToggle, show.toggle], [btnSound, show.sound]];
      // show first, so focus can move to a visible control before anything focused is hidden
      order.forEach(function (p) { if (p[1]) p[0].hidden = false; });
      order.forEach(function (p) {
        if (p[1]) return;
        if (document.activeElement === p[0]) {
          var target = null;
          order.forEach(function (o) { if (!target && o[1]) target = o[0]; });
          (target || stage).focus({ preventScroll: true });
        }
        p[0].hidden = true;
      });
    }
    function setMode(next) {
      if (next !== mode) modeAt = now();
      mode = next;
      stage.setAttribute('data-gp-mode', next);
      updateControls();
    }

    // ---------- film format on rotation / resize ----------
    function canReformat() {
      return mode === 'poster' || mode === 'calm' || mode === 'ended' || (mode === 'loading' && !everPlayed);
    }
    function applyFormat(reshow) {
      var next = wantFormat();
      formatStale = false;
      if (next === fmt) return false;
      stage.classList.remove('gp--' + fmt);
      fmt = next;
      stage.classList.add('gp--' + fmt);
      setMediaUrls();
      if (video.getAttribute('poster')) video.poster = media.poster;
      stillLayer.retarget();
      endLayer.retarget();
      if (srcSet) {
        videoFailed = false;
        try { video.src = media.film; } catch (e) { /* ignore */ }   // a pending play() ends with AbortError (ignored)
      }
      // re-show whichever picture this state uses, in the new shape
      if (reshow) {
        if (mode === 'poster' || mode === 'calm') showStill();
        else if (mode === 'ended') showEnd();
      }
      updateControls();
      return true;
    }
    function onShapeChange() {
      if (wantFormat() === fmt) { formatStale = false; return; }
      if (!canReformat()) { formatStale = true; return; }
      var wasLoading = mode === 'loading';
      if (applyFormat(true) && wasLoading && playRequested && !userPaused) playVideo(lastPlayAuto);
    }
    var shapeTimer = 0;
    function onResize() { clearTimeout(shapeTimer); shapeTimer = setTimeout(onShapeChange, 150); }
    root.addEventListener('resize', onResize);
    root.addEventListener('orientationchange', onResize);

    // ---------- states ----------
    function armStartTimer() {
      // An honest fallback: if the film has not started within 1.5 s, show the calm still instead of a blank frame.
      // A hidden page (a background tab) does not count: browsers hold its media back.
      clearTimeout(startTimer);
      startTimer = setTimeout(function () {
        if (mode !== 'loading') return;
        if (isHidden()) { whenVisible(function () { if (mode === 'loading') armStartTimer(); }); return; }
        enterCalm('slow');
      }, 1500);
    }
    function attemptAutoplay() {
      usePoster();
      setMode('loading');
      armStartTimer();
      playVideo(true);
    }
    function playVideo(isAutoplay) {
      if (!srcSet) setSrc('auto');
      playRequested = true;
      lastPlayAuto = !!isAutoplay;
      var p;
      try { p = video.play(); } catch (e) { p = null; }
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          if (mode !== 'loading') return;              // we have already moved on (paused, calm, ended)
          var name = err && err.name;
          if (name === 'AbortError') return;           // a pause or new load interrupted it
          clearTimeout(startTimer);
          if (videoFailed) return;                     // the error handler shows the calm still
          if (name === 'NotAllowedError' || !isAutoplay) enterPoster();
          else enterCalm('slow');
        });
      }
    }
    function enterPoster() {
      // autoplay refused: the cup still with a Play button (never the blank parchment of frame 0)
      clearTimeout(startTimer);
      stopClock();
      setMode('poster');
      showStill();
      render(0);
    }
    function enterCalm(reason) {
      clearTimeout(startTimer);
      stopClock();
      calmReason = reason;
      setMode('calm');
      stage.setAttribute('data-gp-calm', reason);
      try { video.pause(); } catch (e) { /* ignore */ }
      showStill();
      renderCalm();
      audioStop(0.15);
    }
    function leaveCalm() {
      stage.removeAttribute('data-gp-calm');
      hideStill();
    }
    function startFromTop() {
      if (formatStale) applyFormat(false);           // the window changed shape while the film ran: the right film now
      if (videoFailed) { enterCalm('error'); return; }  // nothing to play: the calm still, not a dead Pause button
      userPaused = false;
      if (sound.wanted) wakeContext();               // inside the tap: the sound slept at the end (or on the calm still)
      usePoster();
      leaveCalm();
      hideEnd();
      setMode('loading');
      if (srcSet) { try { video.currentTime = 0; } catch (e) { /* ignore */ } }
      clock.last = -1;
      render(0);
      playVideo(false);
    }
    function pauseFilm() {
      userPaused = true;
      clearTimeout(startTimer);
      setMode('paused');
      try { video.pause(); } catch (e) { /* ignore */ }
      stopClock();
      render(video.currentTime);
      audioStop(0.15);
    }
    function resumeFilm() {
      userPaused = false;
      setMode('loading');
      playVideo(false);
    }
    function finish(skipped) {
      clearTimeout(startTimer);
      stopClock();
      setMode('ended');
      showEnd();                                      // the settled welcome plate under the welcome
      render(END);
      audioStop(skipped ? 0.12 : 0.4);
    }
    function skip() {
      if (mode === 'ended' || mode === 'calm') return;
      showEnd();                                      // the welcome plate, instantly (never the cup)
      mode = 'ended';                                 // so the pause event below is not read as a user pause
      try { video.pause(); } catch (e) { /* ignore */ }
      try {
        var d = isFinite(video.duration) && video.duration > 0 ? video.duration : END;
        if (srcSet) video.currentTime = Math.max(0, d - 0.5 / FPS);   // last frame, in case the end image is missing
      } catch (e) { /* ignore */ }
      finish(true);
    }

    // ---------- video events ----------
    video.addEventListener('playing', function () {
      clearTimeout(startTimer);
      if (mode === 'calm' || mode === 'ended' || mode === 'poster' || userPaused) { video.pause(); return; }
      everPlayed = true;
      setMode('playing');
      startClock();
      audioStart();
      endLayer.load();                                // ready for Skip and the end
    });
    video.addEventListener('waiting', function () {
      // the network ran dry mid-play: the picture holds, so the sound must not run on (or loop) without it.
      // The 'playing' event brings it back, in sync, once the picture moves again.
      if (mode === 'playing') audioStop(0.12);
    });
    video.addEventListener('pause', function () {
      if (video.ended || mode !== 'playing') return;
      // paused by the browser or the system (not by our buttons): say so honestly
      setMode('paused');
      stopClock();
      render(video.currentTime);
      audioStop(0.15);
    });
    video.addEventListener('ended', function () { if (mode !== 'ended') finish(false); });
    video.addEventListener('seeked', function () { clock.last = -1; if (!clock.running && mode !== 'calm' && mode !== 'ended') render(video.currentTime); });
    video.addEventListener('timeupdate', function () { if (!clock.running && (mode === 'paused' || mode === 'loading')) render(video.currentTime); });
    video.addEventListener('error', function () {
      if (!srcSet) return;
      videoFailed = true;
      if (mode === 'ended') { updateControls(); return; }   // keep the welcome; Replay and Sound go away
      enterCalm('error');
    });

    // ---------- buttons and keys ----------
    btnToggle.addEventListener('click', function () {
      if (mode === 'playing' || mode === 'loading') pauseFilm();
      else if (mode === 'paused') resumeFilm();
      else if (mode === 'poster' || mode === 'calm') startFromTop();
    });
    btnSkip.addEventListener('click', function () {
      if (mode === 'ended') startFromTop();
      else skip();
    });
    btnSound.addEventListener('click', function () {
      if (btnSound.getAttribute('aria-disabled') === 'true') return;
      if (sound.wanted) soundOff(); else soundOn();
    });
    frame.addEventListener('click', function () { if (mode === 'poster') startFromTop(); });
    stage.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (mode === 'playing' || mode === 'loading' || mode === 'paused' || mode === 'poster') { e.preventDefault(); skip(); }
    });

    // ---------- sound ----------
    // Never starts by itself. A Web Audio gain node makes every start and stop a short fade, so nothing clicks.
    var sound = {
      wanted: false, ready: false, failed: false, ctx: null, gain: null, webaudio: false,
      gen: 0,          // bumps on every start/stop, so stale callbacks do nothing
      lead: 0,         // learned: how far the sound falls behind while it restarts after a seek (s)
      aligning: false, nudging: false, lastFix: 0, fixes: 0, volRaf: 0
    };
    var NUDGE_MAX = 0.12;   // drift (s) below this is corrected by a gentle speed change; above it, a quick re-seat
    var RATE_MAX = 0.02;    // the speed change never exceeds 2%, so it stays inaudible on sustained tones
    function ensureAudio() {
      if (sound.ready) return;
      sound.ready = true;
      var webm = audioEl.canPlayType('audio/webm; codecs="opus"') === 'probably';
      audioEl.src = webm ? media.webm : media.m4a;
      audioEl.preload = 'auto';
      audioEl.addEventListener('error', function () {
        sound.failed = true;
        sound.wanted = false;
        btnSound.setAttribute('aria-pressed', 'false');
        btnSound.setAttribute('aria-disabled', 'true');
        btnSound.title = 'Sound is not available';
      });
      var AC = root.AudioContext || root.webkitAudioContext;
      if (AC) {
        try {
          sound.ctx = new AC();
          var src = sound.ctx.createMediaElementSource(audioEl);
          sound.gain = sound.ctx.createGain();
          sound.gain.gain.value = 0;
          src.connect(sound.gain);
          sound.gain.connect(sound.ctx.destination);
          sound.webaudio = true;
        } catch (e) {
          sound.webaudio = false;
        }
      }
      if (!sound.webaudio) { try { audioEl.volume = 0; } catch (e) { /* read-only on some devices */ } }
    }
    /** wake the audio context (iOS can leave it 'interrupted', not only 'suspended') */
    function wakeContext() {
      var c = sound.ctx;
      if (!c || c.state === 'running' || c.state === 'closed') return;
      try { var p = c.resume(); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (e) { /* ignore */ }
    }
    /** how long the speakers lag behind the audio clock (Bluetooth can be 100-250 ms); 0 where unknown */
    function outLatency() {
      if (!sound.webaudio || !sound.ctx) return 0;
      var l = sound.ctx.outputLatency;
      return typeof l === 'number' && isFinite(l) && l > 0 ? Math.min(l, 0.5) : 0;
    }
    /** how far the sound we hear is ahead of the picture (s): the audio clock, less what is still on its way out */
    function soundDrift() { return audioEl.currentTime - outLatency() - video.currentTime; }
    function currentGain() {
      if (sound.webaudio) return sound.gain.gain.value;
      return audioEl.volume;
    }
    function setGainNow(v) {
      if (sound.webaudio) {
        var g = sound.gain.gain, t = sound.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(v, t);
      } else {
        cancelAnimationFrame(sound.volRaf);
        try { audioEl.volume = v; } catch (e) { /* ignore */ }
      }
    }
    function rampGain(target, sec) {
      sec = Math.max(0.01, sec);
      if (sound.webaudio) {
        var g = sound.gain.gain, t = sound.ctx.currentTime;
        if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t);
        else { var v = g.value; g.cancelScheduledValues(t); g.setValueAtTime(v, t); }
        g.linearRampToValueAtTime(target, t + sec);
        return;
      }
      // element.volume fallback (where it is writable)
      cancelAnimationFrame(sound.volRaf);
      var from = audioEl.volume, t0 = now(), dur = sec * 1000;
      (function step() {
        var k = Math.min(1, (now() - t0) / dur);
        try { audioEl.volume = from + (target - from) * k; } catch (e) { return; }
        if (k < 1) sound.volRaf = requestAnimationFrame(step);
      })();
    }
    function filmRunning() { return mode === 'playing' && !video.paused; }
    /** where the audio clock should be so that what we hear matches the picture */
    function audioTarget(lead) {
      var d = isFinite(audioEl.duration) && audioEl.duration > 0 ? audioEl.duration : END;
      return Math.min(Math.max(video.currentTime + outLatency() + (lead || 0), 0), Math.max(0, d - 0.05));
    }
    function setRate(r) {
      if (audioEl.playbackRate !== r) { try { audioEl.playbackRate = r; } catch (e) { /* ignore */ } }
    }
    function nudgeRate(drift) { return 1 - Math.max(-RATE_MAX, Math.min(RATE_MAX, drift * 0.5)); }
    /**
     * Silently bring the sound onto the film clock: wait until its clock is really moving (a media element
     * takes a moment to start, and again after each seek), compare it with the film, and if it is more than
     * 40 ms out, seek it ahead by the restart lag learned so far and look again. Calls done() when aligned.
     */
    function align(gen, attempt, done) {
      var from = audioEl.currentTime, t0 = now();
      sound.aligning = true;
      (function look() {
        if (gen !== sound.gen || !sound.wanted || !filmRunning()) { sound.aligning = false; return; }
        var moving = !audioEl.seeking && audioEl.currentTime > from + 0.004;
        if (!moving && now() - t0 < 2000) { setTimeout(look, 16); return; }
        var drift = soundDrift();
        if (Math.abs(drift) <= 0.04 || attempt >= 4) { sound.aligning = false; sound.lastFix = now(); done(); return; }
        sound.lead = Math.min(0.6, Math.max(0, sound.lead - drift));
        try { audioEl.currentTime = audioTarget(sound.lead); } catch (e) { sound.aligning = false; done(); return; }
        align(gen, attempt + 1, done);
      })();
    }
    function audioStart() {
      if (!sound.wanted || sound.failed) return;
      ensureAudio();
      wakeContext();
      var gen = ++sound.gen;
      function go() {
        if (gen !== sound.gen || !sound.wanted || !filmRunning()) return;
        setRate(1);
        sound.nudging = false;
        try { audioEl.currentTime = audioTarget(sound.lead); } catch (e) { /* ignore */ }
        var p;
        try { p = audioEl.play(); } catch (e) { p = null; }
        var aligned = function () { if (gen === sound.gen) rampGain(1, 0.35); };
        var started = function () { if (gen === sound.gen) align(gen, 0, aligned); };
        if (p && typeof p.then === 'function') p.then(started, function () { /* refused: stay quiet */ });
        else started();
      }
      // gain is 0 unless the sound is already audible (a quick restart): then dip first so nothing clicks
      if (!audioEl.paused && currentGain() > 0.02) { rampGain(0, 0.04); setTimeout(go, 50); }
      else { setGainNow(0); go(); }
    }
    function audioStop(sec) {
      if (!sound.ready) return;
      var gen = ++sound.gen;
      sound.aligning = false;
      rampGain(0, sec);
      setTimeout(function () {
        if (gen !== sound.gen) return;
        try { audioEl.pause(); } catch (e) { /* ignore */ }
        setRate(1);
        sound.nudging = false;
        // Sound is off, or the film has ended or gone to the calm still: let the audio device sleep.
        // (soundOn, Play and Replay wake it again, inside the tap.)
        if ((!sound.wanted || mode === 'ended' || mode === 'calm') && sound.ctx && sound.ctx.state === 'running') {
          try { var p = sound.ctx.suspend(); if (p && typeof p.catch === 'function') p.catch(function () {}); } catch (e) { /* ignore */ }
        }
      }, sec * 1000 + 40);
    }
    function soundOn() {
      sound.wanted = true;
      btnSound.setAttribute('aria-pressed', 'true');
      ensureAudio();
      if (sound.failed) return;
      if (filmRunning()) { audioStart(); return; }
      // Not running yet: unlock the element inside this tap (mobile browsers need that), silently.
      wakeContext();
      var gen = ++sound.gen;
      setGainNow(0);
      try {
        var p = audioEl.play();
        if (p && typeof p.then === 'function') p.then(function () { if (gen === sound.gen && !filmRunning()) audioEl.pause(); }, function () {});
      } catch (e) { /* ignore */ }
    }
    function soundOff() {
      sound.wanted = false;
      btnSound.setAttribute('aria-pressed', 'false');
      audioStop(0.25);
    }
    /**
     * Keep the sound on the picture's clock (called every frame while the film plays).
     * Drift above ~50 ms: under 120 ms, a gentle speed nudge of at most 2% (no seek);
     * larger, a short fade down, a silent re-seat (align), and a fade back up.
     * Nothing is corrected while the picture is starved of data (it is about to hold; 'waiting' stops the sound).
     */
    function syncAudio() {
      if (!sound.wanted || !sound.ready || sound.aligning || audioEl.paused || audioEl.seeking || video.paused || video.readyState < 3) return;
      var drift = soundDrift();
      var size = Math.abs(drift);
      if (sound.nudging) {
        if (size < 0.012 || size > NUDGE_MAX) { setRate(1); sound.nudging = false; }
        else { setRate(nudgeRate(drift)); return; }
      }
      if (size <= 0.05) return;
      var t = now();
      if (t - sound.lastFix < 400) return;
      sound.lastFix = t;
      sound.fixes++;
      if (size < NUDGE_MAX) {
        sound.nudging = true;
        setRate(nudgeRate(drift));
        return;
      }
      var gen = sound.gen;
      sound.aligning = true;
      rampGain(0, 0.05);
      setTimeout(function () {
        if (gen !== sound.gen || !sound.wanted || !filmRunning()) { sound.aligning = false; return; }
        try { audioEl.currentTime = audioTarget(sound.lead); } catch (e) { /* ignore */ }
        align(gen, 1, function () { if (gen === sound.gen) rampGain(1, 0.25); });
      }, 60);
    }

    // ---------- start ----------
    render(0);
    if (saveData) {
      enterCalm('save-data');                         // only the video waits; the page is all there
    } else if (reduceMotion) {
      setSrc('none');
      enterCalm('reduced-motion');
    } else {
      setSrc('auto');
      usePoster();
      setMode('loading');
      // A background tab: wait until the page is seen, then try to play (and only then start the 1.5 s fallback).
      whenVisible(function () { if (mode === 'loading' && !userPaused) attemptAutoplay(); });
    }

    // A small read-only window for testing. Nothing here stores anything.
    return {
      stateAt: function (t) { return stateAt(t, cues); },
      get mode() { return mode; },
      get modeAt() { return modeAt; },
      get startedAt() { return startedAt; },
      get calmReason() { return calmReason; },
      get format() { return fmt; },
      get lastState() { return lastState; },
      get usesVideoFrameCallback() { return hasVFC; },
      sound: {
        get wanted() { return sound.wanted; },
        get webaudio() { return sound.webaudio; },
        get gain() { return sound.ready ? currentGain() : 0; },
        get fixes() { return sound.fixes; },
        get lead() { return sound.lead; },
        get rate() { return sound.ready ? audioEl.playbackRate : 1; },
        get drift() { return sound.ready ? soundDrift() : null; },
        get outputLatency() { return sound.ready ? outLatency() : 0; },
        get contextState() { return sound.ctx ? sound.ctx.state : 'none'; }
      },
      media: media
    };
  }
})(typeof window !== 'undefined' ? window : null);
