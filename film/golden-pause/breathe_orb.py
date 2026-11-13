"""The breathing space's golden orb: a redraw of the orbs in Cassidy's design (reference/breathing-space.webp),
made with real transparency so it glows over the film's own backdrop, sharp on any screen.

A translucent sphere of honey: amber at the rim and clearer in the middle, a bright crescent where the light gathers at
the bottom, thin swirling rings of light around the rim (some pale gold, some deep amber), a faint outer bubble,
sparkles and a soft warm glow. Two looks to fade between as the breath fills and empties:
  orb-calm.webp  quieter: fewer rings, less glow (Prepare, the end of Breathe out)
  orb-full.webp  fuller: more rings, more sparkle and glow (Hold)
Both share the ring radius, so they line up exactly.

  blender -b --factory-startup --python breathe_orb.py -- [--preview]
writes public/golden-pause/breathe/orb-{calm,full}.webp, and with --preview, work/breathe/orb-preview.png
(over the film's settled backdrop: run honey.py -- --backdrop first) and orb-preview-dark.png.
"""
import bpy, numpy as np, sys, os, math

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(SITE, 'public', 'golden-pause', 'breathe')
WORK = os.path.join(HERE, 'work', 'breathe')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

SIZE = 960            # the image is SIZE x SIZE
R = 0.30 * SIZE       # the sphere's radius in pixels (the page sizes the orb by this: RING = R / SIZE)
QUALITY = 86


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


class Canvas:
    """premultiplied 'over' compositing in display values (as a browser composites the result)"""
    def __init__(self, n):
        self.c = np.zeros((n, n, 3), np.float32)
        self.a = np.zeros((n, n), np.float32)

    def over(self, color, alpha):
        alpha = np.clip(alpha, 0, 1).astype(np.float32)
        col = np.broadcast_to(np.asarray(color, np.float32), self.c.shape) if np.ndim(color) == 1 else color
        self.c = col * alpha[..., None] + self.c * (1 - alpha[..., None])
        self.a = alpha + self.a * (1 - alpha)

    def rgba(self):
        a = self.a[..., None]
        col = np.where(a > 1e-4, self.c / np.maximum(a, 1e-4), 0)
        return np.concatenate([np.clip(col, 0, 1), self.a[..., None]], -1)


def render(full, seed):
    n = SIZE
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    u = (xx + 0.5 - n / 2) / R
    v = (yy + 0.5 - n / 2) / R                     # v grows downwards
    r = np.hypot(u, v)
    th = np.arctan2(v, u)                           # 0 = right, +pi/2 = bottom
    rng = np.random.default_rng(seed)
    cv = Canvas(n)
    k = 1.0 if full else 0.0

    GOLD = (1.0, 0.74, 0.20)          # saturated: on warm parchment, "glowing" reads as rich gold, not pale
    HONEY = (1.0, 0.82, 0.34)
    PALE = (1.0, 0.93, 0.62)
    WHITE = (1.0, 0.985, 0.88)
    AMBER = (0.93, 0.52, 0.06)
    DEEP = (0.74, 0.36, 0.02)

    # 1. the golden aura around it, and a wider, fainter bloom
    cv.over((1.0, 0.84, 0.42), (0.22 + 0.12 * k) * np.exp(-(r / (1.45 + 0.15 * k)) ** 2))
    cv.over(GOLD, (0.50 + 0.18 * k) * np.exp(-(np.maximum(r - 0.92, 0) / (0.20 + 0.08 * k)) ** 2) * smooth((r - 0.5) / 0.3))

    # 2. the faint outer bubble: a thin pale shell a little outside the sphere
    shell_r = 1.14 + 0.04 * k
    shell_light = 0.5 + 0.5 * np.cos(th - 2.2)      # brighter towards the lower left
    cv.over(WHITE, 0.10 * smooth((shell_r - r) / 0.02) * smooth((r - 0.98) / 0.04))
    cv.over(PALE, (0.30 + 0.15 * k) * shell_light * np.exp(-((r - shell_r) / 0.007) ** 2))

    # 3. the sphere of honey: a translucent amber inside, deepening towards the rim, a darker band under the top rim
    inside = 1 - smooth((r - 0.99) / 0.012)
    tone = np.clip(r ** 1.8, 0, 1)[..., None]
    top = (smooth((-v - 0.30) / 0.6) * smooth((r - 0.5) / 0.4))[..., None]
    body_col = np.array((0.94, 0.64, 0.24)) * (1 - tone) + np.array((0.90, 0.47, 0.05)) * tone
    body_col = body_col * (1 - 0.40 * top) + np.array(DEEP) * 0.40 * top
    cv.over(body_col.astype(np.float32), inside * (0.58 + 0.34 * r ** 2.2))

    def blob(cx, cy, sx, sy, rot=0.0):
        cu, su = math.cos(rot), math.sin(rot)
        du, dv = u - cx, v - cy
        a, b = du * cu + dv * su, -du * su + dv * cu
        return np.exp(-((a / sx) ** 2 + (b / sy) ** 2))

    # 4. light inside: a warm pool low in the sphere, a soft highlight at the upper left
    cv.over((1.0, 0.86, 0.45), inside * (0.38 + 0.12 * k) * blob(0.0, 0.50, 0.55, 0.36))
    cv.over(WHITE, inside * 0.22 * blob(-0.40, -0.44, 0.26, 0.16, -0.6))

    # 5. the glowing band of the rim: a luminous ring, then wispy streaks of light wrapped around it
    #    (pale gold and white-hot, a few deep amber), each in its own little glow
    cv.over((1.0, 0.62, 0.10), (0.30 + 0.10 * k) * np.exp(-((r - 1.0) / 0.12) ** 2))      # the fire under it
    cv.over((1.0, 0.88, 0.46), (0.55 + 0.15 * k) * np.exp(-((r - 0.93) / 0.07) ** 2))

    def ring(rad, ecc, rot, dx, dy, width, color, alpha, arcs, phase, glow=0.35):
        cu, su = math.cos(rot), math.sin(rot)
        du, dv = u - dx, v - dy
        a, b = du * cu + dv * su, -du * su + dv * cu
        ea, eb = rad * (1 + ecc), rad * (1 - ecc)
        q = np.sqrt((a / ea) ** 2 + (b / eb) ** 2)
        d = np.abs(q - 1) * (ea + eb) / 2
        along = 0.5 + 0.5 * np.sin(arcs * np.arctan2(b, a) + phase)
        lit = smooth((along - 0.15) / 0.6)
        w = width * (0.30 + 0.70 * lit)                # wisps: thickest mid-arc, tapering to nothing
        if glow:
            cv.over(GOLD, glow * alpha * lit * np.exp(-(d / (4 * w + 1e-4)) ** 2))
        cv.over(color, alpha * lit * np.exp(-(d / (w + 1e-4)) ** 2))
    for i in range(4 + int(5 * k)):                  # streaks swirling through the inside
        ring(rad=rng.uniform(0.62, 0.92), ecc=rng.uniform(0.10, 0.30), rot=rng.uniform(0, math.pi),
             dx=rng.normal(0, 0.06), dy=rng.normal(0.04, 0.06), width=rng.uniform(0.005, 0.010),
             color=PALE if i % 2 else HONEY, alpha=rng.uniform(0.4, 0.7), arcs=1, phase=rng.uniform(0, 2 * math.pi))
    for i in range(12 + int(12 * k)):                # the band around the rim
        deep = i % 4 == 3
        ring(rad=rng.uniform(0.80, 1.06), ecc=rng.uniform(0.0, 0.10), rot=rng.uniform(0, math.pi),
             dx=rng.normal(0, 0.03), dy=rng.normal(0.01, 0.03),
             width=rng.uniform(0.005, 0.011) * (1.6 if deep else 1.0),
             color=DEEP if deep else (WHITE if i % 3 == 0 else PALE),
             alpha=(0.55 if deep else 0.95) * rng.uniform(0.55, 1.0),
             arcs=int(rng.choice([1, 2, 3])), phase=rng.uniform(0, 2 * math.pi), glow=0 if deep else 0.5)
    # the rim itself: a bright edge in a golden glow, brightest below and at the upper right
    rim_light = 0.6 + 0.4 * np.exp(-((th - math.pi / 2) / 0.9) ** 2) + 0.35 * np.exp(-((th + 0.8) / 0.5) ** 2)
    cv.over(GOLD, 0.60 * np.clip(rim_light, 0, 1) * np.exp(-((r - 1.0) / 0.05) ** 2))
    cv.over(WHITE, 0.95 * np.clip(rim_light, 0, 1) * np.exp(-((r - 1.0) / 0.011) ** 2))

    # the white-hot light gathered at the bottom, and a glint at the upper right
    crescent = np.exp(-((r - 0.86) / 0.10) ** 2) * np.exp(-((th - math.pi / 2) / 0.60) ** 2)
    cv.over(PALE, inside * (0.75 + 0.15 * k) * crescent)
    cv.over(WHITE, (0.90 + 0.1 * k) * blob(0.02, 0.86, 0.36, 0.07))
    cv.over((1.0, 1.0, 0.98), blob(0.04, 0.90, 0.16, 0.025))
    gx, gy = 0.98 * math.cos(-0.8), 0.98 * math.sin(-0.8)
    cv.over(WHITE, (0.75 + 0.2 * k) * blob(gx, gy, 0.10, 0.03, -0.8 + math.pi / 2))

    # 6. sparkles: white and orange-gold, more near the rim and below, some floating inside, a few outside
    m = 90 + int(110 * k)
    rr = np.clip(np.abs(rng.normal(0.85, 0.30, m)), 0.05, 1.35)
    tt = rng.uniform(-math.pi, math.pi, m) * 0.6 + rng.normal(math.pi / 2, 1.2, m) * 0.4
    for j in range(m):
        cx, cy = rr[j] * math.cos(tt[j]), rr[j] * math.sin(tt[j])
        s = rng.uniform(0.004, 0.010)
        b = rng.uniform(0.5, 1.0) * (0.75 if rr[j] > 1.08 else 1.0)
        col = WHITE if j % 3 else (1.0, 0.72, 0.28)
        d2 = (u - cx) ** 2 + (v - cy) ** 2
        cv.over(GOLD, 0.30 * b * np.exp(-d2 / (2 * (3 * s) ** 2)))
        cv.over(col, b * np.exp(-d2 / (2 * s * s)))
    return cv.rgba()


def save(rgba, path, webp=True):
    h, w = rgba.shape[:2]
    o = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    o.alpha_mode = 'STRAIGHT'
    o.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
    o.filepath_raw = path
    o.file_format = 'WEBP' if webp else 'PNG'
    if webp: o.save(quality=QUALITY)
    else: o.save()
    return os.path.getsize(path)


def load(path):
    im = bpy.data.images.load(path)
    W, H = im.size
    p = np.empty(W * H * 4, np.float32)
    im.pixels.foreach_get(p)
    return p.reshape(H, W, 4)[::-1, :, :3].copy()


def place(base, rgba, cx, cy, diameter_px):
    """composite rgba centred at (cx, cy) with the sphere's diameter at diameter_px (box-filtered), for previews"""
    scale = diameter_px / (2 * R)
    size = int(round(SIZE * scale))
    idx = ((np.arange(size) + 0.5) / scale).astype(int).clip(0, SIZE - 1)
    # average a few taps for a cleaner downscale
    acc = np.zeros((size, size, 4), np.float32)
    for oy in (-0.25, 0.25):
        for ox in (-0.25, 0.25):
            iy = ((np.arange(size) + 0.5 + oy) / scale).astype(int).clip(0, SIZE - 1)
            ix = ((np.arange(size) + 0.5 + ox) / scale).astype(int).clip(0, SIZE - 1)
            acc += rgba[iy][:, ix]
    img = acc / 4
    x0, y0 = int(cx - size / 2), int(cy - size / 2)
    reg = base[y0:y0 + size, x0:x0 + size]
    h, w = reg.shape[:2]
    a = img[:h, :w, 3:4]
    base[y0:y0 + h, x0:x0 + w] = reg * (1 - a) + img[:h, :w, :3] * a


os.makedirs(OUT, exist_ok=True); os.makedirs(WORK, exist_ok=True)
looks = {'calm': render(False, 11), 'full': render(True, 7)}
for name, rgba in looks.items():
    print('ORB', name, save(rgba, os.path.join(OUT, f'orb-{name}.webp')), 'bytes')

if '--preview' in argv:
    bd = load(os.path.join(HERE, 'work', 'breathe-backdrop-wide.png'))
    H, W = bd.shape[:2]
    D = 0.40 * H
    for label, base in (('', bd.copy()), ('-dark', np.full_like(bd, 0.16))):
        for i, (name, s) in enumerate([('calm', 0.55), ('calm', 0.78), ('full', 1.0), ('calm', 0.66)]):
            if i == 1:                                   # breathe in: half way between the two looks
                tmp = base.copy(); place(tmp, looks['calm'], W * (0.14 + 0.24 * i), H * 0.52, D * s)
                tmp2 = base.copy(); place(tmp2, looks['full'], W * (0.14 + 0.24 * i), H * 0.52, D * s)
                base[:] = 0.5 * tmp + 0.5 * tmp2
            else:
                place(base, looks[name], W * (0.14 + 0.24 * i), H * 0.52, D * s)
        save(np.concatenate([base, np.ones(base.shape[:2] + (1,), np.float32)], -1), os.path.join(WORK, f'orb-preview{label}.png'), webp=False)
        print('PREVIEW', label or 'backdrop')
