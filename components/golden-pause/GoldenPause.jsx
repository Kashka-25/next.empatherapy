'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import cues from '@/film/golden-pause/cues.json';
// The player is shared with the film's preview (film/golden-pause/preview), where it is tested in a real browser.
import GoldenPausePlayer from '@/film/golden-pause/preview/player.js';
import './golden-pause.css';
import BreathingSpace from './BreathingSpace';

// Start the player before the first paint, so the no-player still never flashes up on a client-side visit.
const useBeforePaint = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Runs while the page is still being read, before any of the site's scripts: it holds back the no-player still
// (gp--wait) so a visitor with JavaScript never sees it flash up before the film. If the player has not started
// a little after the page has loaded (its scripts failed, or something broke), it lets the calm still show after all.
const HOLD_STILL = "(function(s){if(!s||!s.classList)return;s.classList.add('gp--wait');function lift(){setTimeout(function(){s.classList.remove('gp--wait')},2500)}if(document.readyState==='complete')lift();else window.addEventListener('load',lift)})(document.currentScript&&document.currentScript.parentNode)";

/**
 * The Golden Pause at the top of the homepage. It opens with one breath in the breathing space (BreathingSpace, as
 * Cassidy asked): Prepare, Breathe in, Hold, Breathe out, and on the breath out it dissolves into the 13-second honey
 * film. Never a gate: Skip goes straight to the welcome at any time, the film can be paused, it is silent unless the
 * visitor turns the sound on, and nothing is stored or measured.
 * Reduced motion and Save-Data get a calm still instead (no opening breath); without JavaScript the same still shows by
 * CSS alone. All words on screen are live text; the picture itself is hidden from screen readers and described once.
 * When the film is not running, "Breathe with us" opens the breathing space again, for three easy rounds.
 */
export default function GoldenPause({ skipTo }) {
  const stageRef = useRef(null);
  const playerRef = useRef(null);
  // the breathing space: 'intro' (how the page opens), 'open' (Breathe with us), or closed
  const [space, setSpace] = useState(null);

  // the stage says when "Breathe with us" is open (the film's own buttons step aside); React never sets this class itself
  useEffect(() => {
    stageRef.current?.classList.toggle('gp--breathing', space === 'open');
  }, [space]);

  useBeforePaint(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    let player;
    try {
      player = GoldenPausePlayer.createPlayer(stage, cues, {
        intro: true,
        // Skip, Escape, a refused or failed start, or a pause while the film comes into view: the opening steps aside
        onMode: (m) => { if (m !== 'intro' && m !== 'loading' && m !== 'playing') setSpace((s) => (s === 'intro' ? null : s)); },
      });
    } catch {
      // the calm still stays, rather than controls that do nothing
      try { const v = stage.querySelector('[data-gp="video"]'); v.pause(); v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
      stage.classList.remove('gp--wait');
      return undefined;
    }
    stage.classList.remove('gp--nojs', 'gp--wait');
    playerRef.current = player;
    if (player.mode === 'intro') setSpace('intro');     // before the first paint: the page opens on the breath
    return () => {
      playerRef.current = null;
      player.destroy();
      stage.classList.add('gp--nojs');
    };
  }, []);

  return (
    <>
      {skipTo ? <a className="skip-link" href={`#${skipTo}`}>Skip past the film</a> : null}
      <section
        ref={stageRef}
        className="gp gp--nojs"
        data-gp-stage=""
        data-gp-manual=""
        data-gp-media="/golden-pause/"
        data-gp-mode="loading"
        tabIndex={-1}
        aria-label="The Golden Pause, a short optional breathing moment"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: HOLD_STILL }} />
        <div className="gp__inner">
          <p className="sr-only">About the film: it opens with one breath, just if you like: a golden orb grows as you breathe in, rests for a moment, and settles as you breathe out, with the words Prepare, Breathe in, Hold and Breathe out. As you breathe out, it gives way to a short film: honey drips from a wooden honey dipper and flows out, writing the name Empatherapy in joined, flowing golden script. Then the honey script drips away, the scene turns to warm parchment, and honey drops fall into a teacup of chamomile tea with lemon and a chamomile flower; the cup fills, honey runs over the rim and steam rises. The name Empatherapy rests above the cup, with &ldquo;Discover new pathways to yourself.&rdquo; below it.</p>
          <div className="gp__frame" data-gp="frame">
            <video className="gp__video" data-gp="video" muted playsInline webkit-playsinline="true" preload="none"
              disablePictureInPicture disableRemotePlayback aria-hidden="true" tabIndex={-1} />
            {/* the honey name, just written (7.9 s): reduced motion, Save-Data, slow or failed video, autoplay refused */}
            <img className="gp__still" data-gp="still" alt="" aria-hidden="true" decoding="async" hidden />
            {/* the settled lockup (the teacup symbol on parchment): after Skip and at the end */}
            <img className="gp__end" data-gp="end" alt="" aria-hidden="true" decoding="async" hidden />
            {/* the honey name, by CSS alone, when the player is not running */}
            <div className="gp__fallback" aria-hidden="true" />

            {/* The bottom band: the breathing line, and the permission line just under it, on one soft backing. */}
            <div className="gp__band" aria-hidden="true">
              {/* an invisible twin of the permission line, above, so that the breathing line sits at the band's centre */}
              <p className="gp__ghost"><span className="gp__l">Breathe along if you like,</span> <span className="gp__l">or simply watch the honey.</span></p>
              <div className="gp__band-words">
                <span className="gp__backing" data-gp="words-backing" />
                <div className="gp__slot">
                  <p className="gp__line" data-gp="line-in">Take a gentle breath in&hellip;</p>
                  <p className="gp__line" data-gp="line-out">And slowly let it go&hellip;</p>
                  <div className="gp__calm">
                    <p>Take a gentle breath in&hellip;</p>
                    <p>And slowly let it go&hellip;</p>
                  </div>
                </div>
                <p className="gp__permission" data-gp="permission"><span className="gp__l">Breathe along if you like,</span> <span className="gp__l">or simply watch the honey.</span></p>
              </div>
            </div>

            {/* The welcome: the name in the honey's own script, solid brown, rides the camera tilt up above the teacup;
                the tagline settles under the cup. */}
            <div className="gp__welcome" aria-hidden="true">
              <div className="gp__wm-track" data-gp="wordmark-track">
                <img className="gp__wordmark" data-gp="wordmark" src="/golden-pause/wordmark-script.webp" alt="Empatherapy" width="2620" height="612" decoding="async" />
              </div>
              <p className="gp__tagline" data-gp="tagline">Discover new pathways to yourself.</p>
            </div>

            {space ? (
              <BreathingSpace key={space} intro={space === 'intro'} onClose={() => setSpace(null)}
                onFilm={() => playerRef.current?.start()} />
            ) : null}

            <span className="gp__glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M9 6.5v11l8.5-5.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            </span>
          </div>

          <div className="gp__bar">
            <p className="gp__caption"><b>The Golden Pause</b> <span>{space === 'open' ? 'breathe along if you like, or in your own way' : space === 'intro' ? 'one breath, then the honey film, just if you like' : '13 seconds, just if you like'}</span></p>
            <div className="gp__controls" role="group" aria-label="Film controls">
              <button type="button" className="gp-btn gp-btn--breathe" onClick={() => setSpace((s) => (s === 'open' ? null : 'open'))}>
                <svg className="gp-ico gp-ico--orb" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="8.2" strokeDasharray="2.6 2.4" /></svg>
                <span className="gp-btn__label">{space === 'open' ? 'Finish' : 'Breathe with us'}</span>
              </button>
              <button type="button" className="gp-btn" data-gp="toggle" data-state="pause">
                <svg className="gp-ico gp-ico--pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6.5v11M15 6.5v11" /></svg>
                <svg className="gp-ico gp-ico--play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 6v12l9.5-6z" fill="currentColor" /></svg>
                <span className="gp-btn__label">Pause</span>
              </button>
              <button type="button" className="gp-btn" data-gp="sound" aria-pressed="false">
                <svg className="gp-ico gp-ico--muted" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 10l4 4M19.5 10l-4 4" /></svg>
                <svg className="gp-ico gp-ico--sound" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" /></svg>
                <span className="gp-btn__label">Sound</span>
              </button>
              <button type="button" className="gp-btn" data-gp="skip" data-state="skip">
                <svg className="gp-ico gp-ico--skip" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 6.5l7 5.5-7 5.5zM17.5 6.5v11" /></svg>
                <svg className="gp-ico gp-ico--replay" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12a7 7 0 1 0 2.05-4.95" /><path d="M5 4.8v3.4h3.4" /></svg>
                <span className="gp-btn__label">Skip</span>
              </button>
            </div>
          </div>
          <audio data-gp="audio" preload="none" crossOrigin="anonymous" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
