/* The Golden Pause: cue numbers for the preview player.
   Copied by hand from ../cues.json, which stays the single source of truth for picture, text, ring and sound.
   (A published page may not be able to fetch JSON, so the numbers the page needs are embedded here.)
   If cues.json changes, change these numbers to match. The picture-only fields (shots) are left out. */
(function (root) {
  'use strict';
  var CUES = {
    fps: 24,
    duration: 12.0,
    settle: 11.5,
    contact: 8.25,
    breath: { inhale: [0.3, 3.0], exhale: [3.2, 8.0] },
    text: [
      { id: 'in', words: 'Take a gentle breath in…', fadeIn: [0.3, 1.0], fadeOut: [2.7, 3.2] },
      { id: 'out', words: 'And slowly let it go…', fadeIn: [3.2, 3.9], fadeOut: [7.6, 8.4] },
      { id: 'permission', words: 'Breathe along if you like, or simply watch the honey.', fadeIn: [0.6, 1.4], fadeOut: [7.6, 8.4] }
    ],
    welcome: { mark: [10.0, 11.0], wordmark: [10.1, 11.1], tagline: [10.5, 11.5], words: 'Discover new pathways to yourself.' },
    audio: { resolve: 9.9, fadeOutEnd: 12.0 }
  };

  (function freeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') freeze(o[k]); });
    return Object.freeze(o);
  })(CUES);

  if (typeof module === 'object' && module && module.exports) module.exports = CUES;
  if (root) root.GOLDEN_PAUSE_CUES = CUES;
})(typeof window !== 'undefined' ? window : null);
