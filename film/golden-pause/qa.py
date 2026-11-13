"""
Quality checks on rendered frames:  blender -b --factory-startup --python qa.py -- <frames dir>

- Flash safety (WCAG 2.3.1 style, conservative): relative luminance is measured on an 8x8 grid of regions per frame.
  A "transition" is a change of 10% or more of max relative luminance in a region where the darker state is below 0.80.
  Pairs of opposing transitions are counted per one-second window; WCAG fails at more than 3 flashes per second.
- Motion: the largest mean absolute change between consecutive frames (a cut or jump would spike here).
- Settle: frames from the settle time to the end must be pixel-identical (a clean hold for the HTML welcome).
"""
import bpy, numpy as np, os, sys, json
argv = sys.argv[sys.argv.index('--') + 1:]
src = argv[0]
cues = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cues.json'), encoding='utf-8'))
fps = cues['fps']; settle_frame = int(round(cues['settle'] * fps))
files = sorted(f for f in os.listdir(src) if f.endswith('.png'))

def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
G = 8
lum, means, frames = [], [], []
prev = None; diffs = []
for i, f in enumerate(files):
    im = bpy.data.images.load(os.path.join(src, f)); w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px); a = px.reshape(h, w, 4)[:, :, :3]
    bpy.data.images.remove(im)
    L = (0.2126 * lin(a[..., 0]) + 0.7152 * lin(a[..., 1]) + 0.0722 * lin(a[..., 2]))
    grid = L[: h - h % G, : w - w % G].reshape(G, (h - h % G) // G, G, (w - w % G) // G).mean(axis=(1, 3))
    lum.append(grid); means.append(float(L.mean()))
    if prev is not None: diffs.append(float(np.abs(a - prev).mean()))
    if i >= settle_frame: frames.append((i, a.copy()))
    prev = a

lum = np.array(lum)  # (n, G, G)
worst_flashes = 0
for gy in range(G):
    for gx in range(G):
        s = lum[:, gy, gx]
        # turning points of the luminance curve, then count opposing changes >= 0.1 with darker < 0.8
        events = []
        last = s[0]; direction = 0; extreme = s[0]; t_ext = 0
        for t in range(1, len(s)):
            d = s[t] - extreme
            if direction >= 0 and s[t] > extreme: extreme, t_ext = s[t], t
            elif direction <= 0 and s[t] < extreme: extreme, t_ext = s[t], t
            if abs(s[t] - extreme) >= 0.1 and min(s[t], extreme) < 0.8:
                events.append(t); direction = 1 if s[t] > extreme else -1; extreme, t_ext = s[t], t
        for t in events:
            n = sum(1 for e in events if t <= e < t + fps)
            worst_flashes = max(worst_flashes, n // 2)
print('QA frames', len(files))
print('QA max flashes in any 1 s window (region-level):', worst_flashes, '(WCAG fails above 3)')
print('QA biggest frame-to-frame mean change (0-1 scale):', round(max(diffs), 4), 'at frame', int(np.argmax(diffs)) + 1)
print('QA mean frame-to-frame change:', round(float(np.mean(diffs)), 4))
held = [i for i, a in frames[1:] if not np.array_equal(a, frames[0][1])]
print('QA settle hold from frame', settle_frame, 'identical:', 'yes' if not held else f'no, differs at {held[:5]}')
print('QA mean luminance at 0, 1, 3, 8, 11.9 s:', [round(means[min(len(means) - 1, int(s * fps))], 3) for s in (0, 1, 3, 8, 11.9)])
