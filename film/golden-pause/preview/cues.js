/* The Golden Pause: cue numbers for the preview player (cue sheet version 2: the honey writes the name).
   Copied by hand from ../cues.json, which stays the single source of truth for picture, words and sound.
   (A published page may not be able to fetch JSON, so the numbers the page needs are embedded here.)
   If cues.json changes, change these numbers to match: _test/stateAt.test.js compares every one of them.
   Left out because the page does not use them: the picture-only cues (fadeIn, drop, write, letGo, glint, melt,
   plate, feed, contact, stills) and the sound cues (audio). */
(function (root) {
  'use strict';
  var CUES = {
    version: 2,
    fps: 24,
    duration: 13,
    settle: 12.4,
    breath: { inhale: [0.3, 3], exhale: [3.2, 8] },
    text: [
      { id: 'in', words: 'Take a gentle breath in…', fadeIn: [0.3, 1], fadeOut: [2.7, 3.2] },
      { id: 'out', words: 'And slowly let it go…', fadeIn: [3.2, 3.9], fadeOut: [6.8, 7.4] },
      { id: 'permission', words: 'Breathe along if you like, or simply watch the honey.', fadeIn: [0.6, 1.4], fadeOut: [6.8, 7.4] }
    ],
    welcome: { wordmark: [8.9, 9.7], tagline: [11, 11.8], words: 'Discover new pathways to yourself.' },
    tilt: [8.8, 10.6],
    layout: {
      wide: {
        size: [1600, 900],
        script: { widthFrac: 0.68, topPre: 0.575, centerPre: 0.716, landing: [0.5, 0.668] },
        tiltFrac: 0.466,
        wordmark: { centerPost: 0.23, widthFrac: 0.38, scalePre: 1.7895, image: 'wordmark-script.webp', aspect: 4.281 },
        symbol: { topPost: 0.33, heightFrac: 0.46 },
        tagline: { centerPost: 0.865 },
        breathLines: { center: 0.93 }
      },
      square: {
        size: [900, 900],
        script: { widthFrac: 0.86, topPre: 0.575, centerPre: 0.675, landing: [0.5, 0.641] },
        tiltFrac: 0.475,
        wordmark: { centerPost: 0.18, widthFrac: 0.56, scalePre: 1.5357, image: 'wordmark-script.webp', aspect: 4.281 },
        symbol: { topPost: 0.28, heightFrac: 0.48 },
        tagline: { centerPost: 0.85 },
        breathLines: { center: 0.9 }
      }
    },
    easing: 'All windows use smoothstep: p = clamp((t-a)/(b-a),0,1); s = p*p*(3-2p). Camera tilt offset = tiltFrac*H*s over cues.tilt. The HTML wordmark (the title image, wordmark.webp, sized by widthFrac of the stage width) rides the tilt and eases onto its lockup place: centre y = centerPre - tiltFrac*s + (centerPost - (centerPre - tiltFrac))*s, and it scales from scalePre to 1, both with the same s.'
  };

  (function freeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') freeze(o[k]); });
    return Object.freeze(o);
  })(CUES);

  if (typeof module === 'object' && module && module.exports) module.exports = CUES;
  if (root) root.GOLDEN_PAUSE_CUES = CUES;
})(typeof window !== 'undefined' ? window : null);
