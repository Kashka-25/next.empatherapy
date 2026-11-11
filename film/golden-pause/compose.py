"""
The Golden Pause: film compositor.

Builds the 12-second film from the still plates in source/ with Blender's Python (numpy), following cues.json:
slow eased camera moves, honey that really flows inside the stream, refracting ripples where the honey meets the
lemon, glassy bubbles drifting inside the honey, soft sunlit motes, a breathing glow (brighter on the in-breath,
easing on the out-breath), gentle dissolves in linear light, and a calm parchment end plate for the HTML welcome.
No words are drawn into the picture: the breathing lines, the logo and the tagline are live HTML on the site.

Run (from this folder):
  blender -b --factory-startup --python compose.py -- --variant wide --frames 0,60,120   # a few test frames
  blender -b --factory-startup --python compose.py -- --variant wide --all               # every frame
  blender -b --factory-startup --python compose.py -- --variant wide --encode            # frames -> MP4
Variants: wide (1600x900) and square (900x900).

Motion safety: no cuts (only dissolves of 0.6 s or more), no rotation above 2 degrees, slow pans, no flashes
(the breathing glow changes over seconds), nothing rushing past the camera.
"""
import bpy, numpy as np, json, os, sys, math, time

HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, 'cues.json'), encoding='utf-8'))
FPS, DUR, SETTLE = CUES['fps'], CUES['duration'], CUES['settle']
NFRAMES = int(round(FPS * DUR))
VARIANTS = {'wide': (1600, 900), 'square': (900, 900)}

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

# ---------------------------------------------------------------- colour helpers (work in linear light)
def srgb_to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)
def lin_to_srgb(c):
    c = np.clip(c, 0.0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055).astype(np.float32)
def hexlin(h): return srgb_to_lin(np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32))

PARCHMENT, LEMON_SOFT, HONEY_LIGHT, HONEY = hexlin('#FBF7EE'), hexlin('#FAF3CE'), hexlin('#E8BE67'), hexlin('#D9A441')
WARM_WHITE = srgb_to_lin(np.array([1.0, 0.93, 0.78], np.float32))
SUN = srgb_to_lin(np.array([1.0, 0.82, 0.5], np.float32))

def clamp01(x): return np.clip(x, 0.0, 1.0)
def smooth(x):
    x = clamp01(x); return x * x * (3 - 2 * x)
def ease(p):  # mostly linear with soft ends, so moves keep breathing through the dissolves
    p = float(np.clip(p, 0, 1)); return 0.5 * p + 0.5 * (0.5 - 0.5 * math.cos(math.pi * p))
def lerp(a, b, t): return a + (b - a) * t
def window(t, a, b): return float(smooth((t - a) / max(1e-6, b - a)))

# ---------------------------------------------------------------- plates
def load_plate(rel):
    im = bpy.data.images.load(os.path.join(HERE, rel))
    w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    return srgb_to_lin(px.reshape(h, w, 4)[::-1, :, :3].copy())

def sample(img, xs, ys):
    """Bilinear sample at continuous source coords (pixel centres at i + 0.5), clamped at the edges."""
    h, w, _ = img.shape
    x = np.clip(xs - 0.5, 0, w - 1.001); y = np.clip(ys - 0.5, 0, h - 1.001)
    x0 = x.astype(np.int32); y0 = y.astype(np.int32)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def blur(img, sigma):
    """Separable gaussian on a small image."""
    r = max(1, int(sigma * 3)); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    out = img
    for axis in (0, 1):
        pad = [(0, 0)] * img.ndim; pad[axis] = (r, r)
        p = np.pad(out, pad, mode='edge'); acc = np.zeros_like(out)
        n = out.shape[axis]
        for i, kv in enumerate(k):
            sl = [slice(None)] * img.ndim; sl[axis] = slice(i, i + n); acc += kv * p[tuple(sl)]
        out = acc
    return out

# ---------------------------------------------------------------- where the honey is, per plate
# Each stream is a polyline of (y, x centre, width), all as fractions of the plate. Measured on a 10% grid.
STREAMS = {
    'a': {'pts': [(0.27, 0.531, 0.034), (0.33, 0.530, 0.031), (0.39, 0.528, 0.030), (0.44, 0.527, 0.036)], 'speed': 38},
    'b': {'pts': [(0.60, 0.465, 0.055), (0.66, 0.466, 0.046), (0.75, 0.467, 0.040), (0.88, 0.468, 0.036), (1.0, 0.468, 0.033)], 'speed': 46},
    'd': {'pts': [(0.0, 0.556, 0.060), (0.10, 0.553, 0.050), (0.22, 0.551, 0.044), (0.33, 0.549, 0.044), (0.40, 0.547, 0.050)], 'speed': 52},
}

def stream_mask(xs, ys, spec, iw, ih):
    pts = spec['pts']; py = np.array([p[0] for p in pts]); px = np.array([p[1] for p in pts]); pw = np.array([p[2] for p in pts])
    yn = ys / ih; xn = xs / iw
    xc = np.interp(yn, py, px); wc = np.interp(yn, py, pw)
    d = np.abs(xn - xc) / (wc / 2)
    m = clamp01((1.0 - d) / 0.45)
    m = m * clamp01((yn - py[0]) / 0.03) * clamp01((py[-1] - yn) / 0.03 + (1.0 if py[-1] >= 0.999 else 0.0))
    return m.astype(np.float32)

def apply_flow(col, img, xs, ys, spec, t, iw, ih):
    """Two-phase flow map: the stream's own texture slides downward continuously, with no visible reset."""
    m = stream_mask(xs, ys, spec, iw, ih)
    rows = np.where(m.max(axis=1) > 0)[0]; cols = np.where(m.max(axis=0) > 0)[0]
    if len(rows) == 0 or len(cols) == 0: return col
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    period = 1.3; ph1 = (t / period) % 1.0; ph2 = (ph1 + 0.5) % 1.0
    w1 = 1 - abs(1 - 2 * ph1); w2 = 1 - w1
    sx, sy, mm = xs[r0:r1, c0:c1], ys[r0:r1, c0:c1], m[r0:r1, c0:c1, None]
    l1 = sample(img, sx, sy - ph1 * period * spec['speed'])
    l2 = sample(img, sx, sy - ph2 * period * spec['speed'])
    flowing = l1 * w1 + l2 * w2
    # a soft sheen that travels down the stream
    yn = sy / ih
    sheen = np.exp(-(((yn * 9.0 - t * 1.6) % 1.0) - 0.5) ** 2 / 0.012)[..., None] * 0.06
    col[r0:r1, c0:c1] = col[r0:r1, c0:c1] * (1 - mm) + (flowing * (1 + sheen)) * mm
    return col

# ---------------------------------------------------------------- ripples (refraction + a quiet glint)
RIPPLE_BIRTHS = {
    'd': [(CUES['contact'], 7.0), (CUES['contact'] + 0.55, 5.0), (CUES['contact'] + 1.15, 3.6), (CUES['contact'] + 1.8, 2.4)],
    'e': [(8.7, 5.0), (9.25, 3.8), (9.85, 2.8), (10.4, 1.8)],
}
def ripple_field(xs, ys, spec, births, t, iw, ih, speed=150.0):
    cx, cy, sq = spec['x'] * iw, spec['y'] * ih, spec['squash']
    dx = xs - cx; dy = (ys - cy) / sq
    r = np.sqrt(dx * dx + dy * dy) + 1e-3
    total = np.zeros_like(xs); slope = np.zeros_like(xs)
    for tb, amp in births:
        age = t - tb
        if age <= 0: continue
        R = speed * age; sigma = 16 + 14 * age
        a = amp * math.exp(-age / 1.7) * float(smooth(age / 0.25))
        g = (r - R) / sigma
        e = np.exp(-g * g)
        total += a * (-g * e)
        slope += a * (1 - 2 * g * g) * e / sigma
    ux, uy = dx / r, (dy / r) * sq
    return total * ux, total * uy, slope

# ---------------------------------------------------------------- particles (screen space, deterministic)
def make_particles(seed, n, rmin, rmax, vmin, vmax):
    rng = np.random.default_rng(seed)
    return [dict(x=rng.uniform(0, 1), y=rng.uniform(0.05, 1.15), r=rng.uniform(rmin, rmax), v=rng.uniform(vmin, vmax),
                 sway=rng.uniform(0.003, 0.012), f=rng.uniform(0.15, 0.4), ph=rng.uniform(0, 6.28), a=rng.uniform(0.5, 1.0)) for _ in range(n)]

MOTES = make_particles(7, 16, 0.010, 0.030, 0.010, 0.026)    # sunlit dust and bokeh in shots a and b
BUBBLES = make_particles(11, 22, 0.0035, 0.016, 0.010, 0.030) # bubbles drifting up inside the honey (shot c)

def add_motes(col, t, W, H, alpha):
    if alpha <= 0.001: return col
    S = min(W, H)
    for p in MOTES:
        x = (p['x'] + p['sway'] * math.sin(p['f'] * t * 6.28 + p['ph']) + 0.006 * t) * W
        y = (p['y'] - p['v'] * t) * H
        R = p['r'] * S * 1.6
        x0, x1, y0, y1 = int(max(0, x - R)), int(min(W, x + R + 1)), int(max(0, y - R)), int(min(H, y + R + 1))
        if x0 >= x1 or y0 >= y1: continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        d = np.sqrt((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2) / R
        disc = clamp01((1 - d) / 0.35) * (0.75 + 0.25 * clamp01((d - 0.6) / 0.3))  # soft disc with a faint rim
        twinkle = 0.85 + 0.15 * math.sin(t * 1.1 + p['ph'])
        col[y0:y1, x0:x1] += (disc * 0.05 * p['a'] * twinkle * alpha)[..., None] * SUN
    return col

def bubble_lens(xs, ys, t, W, H, t0):
    """Bend the sampling coordinates inside each bubble, so the honey behind it is magnified like real glass."""
    S = min(W, H); lens = []
    for p in BUBBLES:
        x = (p['x'] + p['sway'] * math.sin(p['f'] * t * 6.28 + p['ph'])) * W
        y = (p['y'] - p['v'] * (t - t0) * 1.4) * H
        R = p['r'] * S * 1.3
        x0, x1, y0, y1 = int(max(0, x - R)), int(min(W, x + R + 1)), int(max(0, y - R)), int(min(H, y + R + 1))
        if x0 >= x1 or y0 >= y1: continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        rr = np.sqrt((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2) / R
        inside = rr < 1
        cxs, cys = xs[int(min(H - 1, max(0, y))), int(min(W - 1, max(0, x)))], ys[int(min(H - 1, max(0, y))), int(min(W - 1, max(0, x)))]
        f = np.where(inside, 0.62 + 0.38 * rr * rr, 1.0)
        xs[y0:y1, x0:x1] = cxs + (xs[y0:y1, x0:x1] - cxs) * f
        ys[y0:y1, x0:x1] = cys + (ys[y0:y1, x0:x1] - cys) * f
        lens.append((x0, x1, y0, y1, x, y, R, rr, p['a']))
    return lens

def bubble_light(col, lens, alpha):
    for (x0, x1, y0, y1, x, y, R, rr, a) in lens:
        yy, xx = np.mgrid[y0:y1, x0:x1]
        rim = clamp01((rr - 0.78) / 0.14) * clamp01((1.02 - rr) / 0.06)
        hx, hy = x - 0.36 * R, y - 0.38 * R
        hd = np.sqrt((xx + 0.5 - hx) ** 2 + (yy + 0.5 - hy) ** 2) / (0.2 * R)
        spec = np.exp(-hd * hd * 2.2)
        shade = clamp01((rr - 0.55) / 0.4) * clamp01((yy + 0.5 - y) / R) * (rr < 1)   # a touch darker low inside
        k = alpha * (0.6 + 0.4 * a)
        c = col[y0:y1, x0:x1]
        c *= (1 - 0.12 * shade * k)[..., None]
        c += (rim * 0.10 * k)[..., None] * WARM_WHITE + (spec * 0.55 * k)[..., None] * WARM_WHITE
    return col

# ---------------------------------------------------------------- the breath (a slow glow, never a flash)
def breath(t):
    i0, i1 = CUES['breath']['inhale']; e0, e1 = CUES['breath']['exhale']
    if t < i1: return 0.25 + 0.75 * window(t, i0, i1)
    if t < e0: return 1.0
    return 1.0 - 0.85 * window(t, e0, e1)

# ---------------------------------------------------------------- the frame
class Film:
    def __init__(self, variant):
        self.W, self.H = VARIANTS[variant]
        self.shots = CUES['shots']
        self.plates = {s['id']: load_plate(s['src']) for s in self.shots if s['src']}
        W, H = self.W, self.H
        v, u = np.mgrid[0:H, 0:W].astype(np.float32)
        self.U, self.V = u + 0.5 - W / 2, v + 0.5 - H / 2
        nx, ny = self.U / (W / 2), self.V / (H / 2)
        rad = np.sqrt((nx * W / max(W, H)) ** 2 + (ny * H / max(W, H)) ** 2)
        self.vignette = (1 - 0.20 * np.clip(rad, 0, 1.4) ** 2.2)[..., None].astype(np.float32)
        # the end plate: warm parchment with a broad lemon-honey warmth, framed by soft-focus chamomile in sunlight
        g = np.exp(-(rad / 0.95) ** 2)[..., None]
        plate = PARCHMENT * (1 - 0.7 * g) + LEMON_SOFT * (0.7 * g)
        plate = plate + (np.exp(-(rad / 0.7) ** 2) * 0.03)[..., None] * HONEY_LIGHT
        cham = load_plate('source/f-chamomile.webp'); ch, cw = cham.shape[:2]
        kc = max(W / cw, H / ch) * 1.04
        full = sample(cham, cw / 2 + self.U / kc, ch / 2 + self.V / kc)
        hs4, ws4 = H // 4, W // 4
        small = blur(full[:hs4 * 4, :ws4 * 4].reshape(hs4, 4, ws4, 4, 3).mean(axis=(1, 3)), 2.2)
        soft = sample(small, *np.meshgrid((np.arange(W) + 0.5) / W * ws4, (np.arange(H) + 0.5) / H * hs4))
        warm = np.array([1.05, 0.99, 0.84], np.float32)          # keep the frame golden rather than grey-green
        airy = soft * warm * 0.72 + PARCHMENT * 0.28
        frame_mask = (smooth((rad - 0.44) / 0.6) * 0.88)[..., None]
        plate = plate * (1 - frame_mask) + airy * frame_mask
        rng = np.random.default_rng(3)
        grain = blur(rng.standard_normal((H // 2, W // 2, 1)).astype(np.float32), 0.8)
        grain = np.repeat(np.repeat(grain, 2, 0), 2, 1)[:H, :W]
        self.plate = (plate * (1 + 0.010 * grain)).astype(np.float32)
        self.rad = rad.astype(np.float32)
        self.fixed_dither = np.random.default_rng(99).triangular(-1, 0, 1, (H, W, 3)).astype(np.float32)

    def camera(self, s, t, img):
        ih, iw, _ = img.shape
        p = ease((t - s['in']) / (s['out'] - s['in']))
        f, to = s['from'], s['to']
        sc = lerp(f['scale'], to['scale'], p); rot = math.radians(lerp(f.get('rot', 0), to.get('rot', 0), p))
        k = max(self.W / iw, self.H / ih) * sc
        hw, hh = self.W / 2 / k, self.H / 2 / k
        cx = float(np.clip(lerp(f['cx'], to['cx'], p) * iw, hw, iw - hw))
        cy = float(np.clip(lerp(f['cy'], to['cy'], p) * ih, hh, ih - hh))
        c, sn = math.cos(rot), math.sin(rot)
        xs = cx + (c * self.U + sn * self.V) / k
        ys = cy + (-sn * self.U + c * self.V) / k
        return xs.astype(np.float32), ys.astype(np.float32), iw, ih

    def shot_alpha(self, i, t):
        s = self.shots[i]
        if t < s['in'] or t > s['out']: return 0.0
        if i == 0: return 1.0
        prev = self.shots[i - 1]
        return window(t, s['in'], prev['out'])

    def render_shot(self, s, t):
        sid = s['id']
        if sid == 'plate':
            col = self.plate.copy()
            # faint golden rings settling into stillness by the settle time
            for tb, amp in [(9.9, 1.0), (10.45, 0.75), (11.0, 0.5)]:
                age = t - tb
                if age <= 0: continue
                fade = amp * math.exp(-age / 0.9) * (1 - window(t, SETTLE - 0.6, SETTLE)) * float(smooth(age / 0.3))
                if fade <= 1e-4: continue
                R = 0.12 + 0.30 * age
                ring = np.exp(-((self.rad - R) / (0.02 + 0.02 * age)) ** 2)
                col += (ring * 0.05 * fade)[..., None] * HONEY_LIGHT
            return col
        img = self.plates[sid]
        xs, ys, iw, ih = self.camera(s, t, img)
        lens = None
        if sid in RIPPLE_BIRTHS:
            dxr, dyr, slope = ripple_field(xs, ys, s['ripple'], RIPPLE_BIRTHS[sid], t, iw, ih)
            xs = xs + dxr; ys = ys + dyr
        if sid == 'c':
            lens = bubble_lens(xs, ys, t, self.W, self.H, s['in'])
        col = sample(img, xs, ys)
        if sid in STREAMS:
            col = apply_flow(col, img, xs, ys, STREAMS[sid], t, iw, ih)
        if sid in RIPPLE_BIRTHS:
            col += (clamp01(slope * 1.4) * 0.10)[..., None] * WARM_WHITE * col.mean(axis=2, keepdims=True).clip(0.2, 1.0)
        if lens:
            col = bubble_light(col, lens, 1.0)
        if sid == 'e':
            # the ripple drifts out of focus into golden light as the welcome arrives
            plate = self.shots[-1]
            d = window(t, plate['in'] - 0.2, plate['out'] - 1.2)
            if d > 0.001:
                H, W = col.shape[:2]; h4, w4 = H // 4, W // 4
                small = blur(col[:h4 * 4, :w4 * 4].reshape(h4, 4, w4, 4, 3).mean(axis=(1, 3)), 1.0 + 3.0 * d)
                soft = sample(small, *np.meshgrid((np.arange(W) + 0.5) / W * w4, (np.arange(H) + 0.5) / H * h4))
                col = col * (1 - d) + (soft * (1 + 0.25 * d) + 0.04 * d * HONEY_LIGHT) * d
        return col

    def frame(self, n):
        t = n / FPS
        out = None
        for i, s in enumerate(self.shots):
            a = self.shot_alpha(i, t)
            if a <= 0: continue
            col = self.render_shot(s, t)
            if s['id'] in ('a', 'b'):
                col = add_motes(col, t, self.W, self.H, 1.0 if s['id'] == 'a' else 0.7)
            out = col if out is None else out * (1 - a) + col * a
        # the breathing glow: soft bloom plus a slight warm lift, rising on the in-breath and easing on the out-breath
        plate_a = self.shot_alpha(len(self.shots) - 1, t)
        b = breath(t)
        strength = (0.10 + 0.14 * b) * (1 - plate_a)
        if strength > 0.001:
            small = out[::6, ::6]
            bl = blur(np.clip(small - 0.35, 0, None), 5.0)
            hs, ws = bl.shape[:2]
            ys_ = (np.arange(self.H) + 0.5) / self.H * hs; xs_ = (np.arange(self.W) + 0.5) / self.W * ws
            bloom = sample(bl, *np.meshgrid(xs_, ys_))
            out = out * (1 + 0.04 * b * (1 - plate_a)) + bloom * strength * SUN
        out = out * (self.vignette * (1 - plate_a) + plate_a)
        # open from warm parchment, never from black
        out = PARCHMENT * (1 - window(t, 0.0, 1.2)) + out * window(t, 0.0, 1.2)
        srgb = lin_to_srgb(out)
        dither = self.fixed_dither if t >= SETTLE else np.random.default_rng(1000 + n).triangular(-1, 0, 1, out.shape).astype(np.float32)
        return np.clip(np.round(srgb * 255 + dither * 0.75), 0, 255).astype(np.uint8)

# ---------------------------------------------------------------- output
def save_png(arr, path, holder={}):
    H, W, _ = arr.shape
    key = (W, H)
    if key not in holder:
        holder[key] = bpy.data.images.new(f'frame{W}x{H}', W, H, alpha=True)
    im = holder[key]
    rgba = np.concatenate([arr.astype(np.float32) / 255.0, np.ones((H, W, 1), np.float32)], axis=2)[::-1]
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = path; im.file_format = 'PNG'; im.save()

def encode(variant, frames_dir, out_path, kbps, audio=None):
    W, H = VARIANTS[variant]
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
    sc.render.fps, sc.render.fps_base = FPS, 1.0
    sc.frame_start, sc.frame_end = 1, NFRAMES
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0; sc.view_settings.gamma = 1.0
    sc.sequencer_colorspace_settings.name = 'sRGB'
    ed = sc.sequence_editor_create()
    strips = ed.strips if hasattr(ed, 'strips') else ed.sequences
    for s in list(strips): strips.remove(s)
    files = sorted(f for f in os.listdir(frames_dir) if f.endswith('.png'))
    st = strips.new_image(name='film', filepath=os.path.join(frames_dir, files[0]), channel=1, frame_start=1)
    for f in files[1:]: st.elements.append(f)
    st.colorspace_settings.name = 'sRGB'
    if audio:
        strips.new_sound(name='sound', filepath=audio, channel=2, frame_start=1)
    r = sc.render
    try: r.image_settings.media_type = 'VIDEO'
    except Exception: pass
    r.image_settings.file_format = 'FFMPEG'
    ff = r.ffmpeg
    ff.format = 'MPEG4'; ff.codec = 'H264'
    ff.constant_rate_factor = 'NONE'; ff.video_bitrate = kbps; ff.maxrate = int(kbps * 1.6); ff.minrate = 0; ff.buffersize = kbps * 2
    ff.ffmpeg_preset = 'BEST'; ff.gopsize = 48; ff.use_max_b_frames = True; ff.max_b_frames = 2
    ff.audio_codec = 'AAC' if audio else 'NONE'
    if audio: ff.audio_bitrate = 160; ff.audio_mixrate = 48000; ff.audio_channels = 'STEREO'
    r.use_sequencer = True; r.use_compositing = False
    r.filepath = out_path
    bpy.ops.render.render(animation=True)
    print('ENCODED', out_path, os.path.getsize(out_path) if os.path.exists(out_path) else 'missing')

def stills(variant, frames_dir, out_dir):
    """poster (frame 0, matches the first frame so nothing jumps), still (the cup, for reduced motion and when
    autoplay is refused) and end (the settled welcome plate)."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    s = sc.render.image_settings
    try: s.media_type = 'IMAGE'
    except Exception: pass
    s.file_format = 'JPEG'; s.quality = 84; s.color_mode = 'RGB'
    for name, n in (('poster', 0), ('still', int(1.25 * FPS)), ('end', NFRAMES - 1)):
        im = bpy.data.images.load(os.path.join(frames_dir, f'{n:04d}.png'))
        path = os.path.join(out_dir, f'{name}-{variant}.jpg')
        if os.path.exists(path): os.remove(path)
        im.save_render(filepath=path, scene=sc)
        print('STILL', path, os.path.getsize(path), open(path, 'rb').read(3).hex())

if __name__ == '__main__':
    variant = arg('--variant', 'wide')
    film_dir = os.path.join(HERE, 'out', f'frames-{variant}')
    if arg('--stills'):
        stills(variant, film_dir, os.path.join(HERE, 'out'))
    elif arg('--encode'):
        name = arg('--name', f'film-{variant}.mp4')
        encode(variant, film_dir, os.path.join(HERE, 'out', name), int(arg('--kbps', 2600)), arg('--audio'))
    else:
        film = Film(variant)
        if arg('--all'):
            frames = range(NFRAMES); os.makedirs(film_dir, exist_ok=True); dest = film_dir
        else:
            frames = [int(x) for x in str(arg('--frames', '0,48,96,144,198,240,287')).split(',')]
            dest = os.path.join(HERE, 'work', f'test-{variant}'); os.makedirs(dest, exist_ok=True)
        t0 = time.time()
        for n in frames:
            save_png(film.frame(n), os.path.join(dest, f'{n:04d}.png'))
            if n % 24 == 0 or not arg('--all'): print('frame', n, f'{time.time() - t0:.1f}s', flush=True)
        print('DONE', len(list(frames)), 'frames in', f'{time.time() - t0:.1f}s')
