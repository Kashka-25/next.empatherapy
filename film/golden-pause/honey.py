"""
The Golden Pause v2: honey writes the name.

One shot of the wooden dipper (source/b-dipper.webp). A drop gathers and falls onto the crossbar of the "t"; the
honey flows outward through the joined script and writes "Empatherapy" (source/name-mask.png, Vladimir Script,
thickened). The stream lets go, a glint runs across the name, then the honey script melts and drips away while
the scene brightens to parchment and the camera tilts down, following drops that fall into the teacup symbol
(source/symbol.svg, rendered per layer). The cup fills, its rim drip runs, the steam rises. The clean wordmark
and tagline are live HTML on the page (see cues.json layout); the film itself carries no typed words.

Run from this folder with Blender 5.2's Python:
  blender -b --factory-startup --python honey.py -- --variant wide --frames 0,60,120   # test frames
  blender -b --factory-startup --python honey.py -- --variant wide --all               # every frame
  blender -b --factory-startup --python honey.py -- --variant wide --stills
  blender -b --factory-startup --python honey.py -- --variant wide --encode [--kbps 2600] [--audio x.wav] [--name f.mp4]
Symbol layers come from:  node work/honey/symlayers.js  (renders source/symbol.svg per layer)
"""
import bpy, numpy as np, json, os, sys, math, time, heapq

HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, 'cues.json'), encoding='utf-8'))
FPS, DUR, SETTLE = CUES['fps'], CUES['duration'], CUES['settle']
NFRAMES = int(round(FPS * DUR))
WORK = os.path.join(HERE, 'work', 'honey')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

# ------------------------------------------------------------------ helpers (linear light)
def srgb_to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)
def lin_to_srgb(c):
    c = np.clip(c, 0.0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055).astype(np.float32)
def hexlin(h): return srgb_to_lin(np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32))
PARCHMENT, LEMON_SOFT, HONEY_LIGHT = hexlin('#FBF7EE'), hexlin('#FAF3CE'), hexlin('#E8BE67')
WARM_WHITE = srgb_to_lin(np.array([1.0, 0.95, 0.84], np.float32))
# Translucent gold, after the reference Cassidy shared (13 Nov 2026): clear golden where the honey is thin, amber
# where it is thick or seen edge-on, a bright core where light gathers through it, and broad glossy highlights.
HONEY_GLOW = srgb_to_lin(np.array([1.0, 0.72, 0.20], np.float32))
CORE_GOLD = srgb_to_lin(np.array([1.0, 0.78, 0.12], np.float32))
CORE = 0.17             # how bright the lit core is
HONEY_GAIN = 1.0       # how much light comes through (1.12 was overexposed: the red clipped, washing it pale)
EDGE_DEPTH = 1.0        # how much further light travels through the honey near its edges (deeper amber rim)
EDGE_DARK = 0.30        # and how much light the edges lose to reflection (darker there, but still gold)
SIGMA = np.array([0.22, 0.85, 4.0], np.float32)   # absorption: blue strongly, green a little, red least (golden)
GRAD_DEPTH = 0.35       # how much deeper the honey reads where it leaves the dipper
GRAD_LEN = 0.85         # over what share of the fall the colour eases from the dipper's amber to gold        # honey absorbs blue strongly, red least

def clamp01(x): return np.clip(x, 0.0, 1.0)
def smooth(x):
    x = clamp01(x); return x * x * (3 - 2 * x)
def window(t, a, b): return float(smooth((t - a) / max(1e-6, b - a)))
def lerp(a, b, t): return a + (b - a) * t

def sample(img, xs, ys):
    h, w = img.shape[:2]
    x = np.clip(xs - 0.5, 0, w - 1.001); y = np.clip(ys - 0.5, 0, h - 1.001)
    x0 = x.astype(np.int32); y0 = y.astype(np.int32)
    fx = x - x0; fy = y - y0
    if img.ndim == 3: fx = fx[..., None]; fy = fy[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def blur(img, sigma):
    if sigma <= 0.01: return img
    r = max(1, int(sigma * 3)); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    out = img
    for axis in (0, 1):
        pad = [(0, 0)] * img.ndim; pad[axis] = (r, r)
        p = np.pad(out, pad, mode='edge'); acc = np.zeros_like(out); n = out.shape[axis]
        for i, kv in enumerate(k):
            sl = [slice(None)] * img.ndim; sl[axis] = slice(i, i + n); acc += kv * p[tuple(sl)]
        out = acc
    return out

def soft_blur(img, factor, sigma):
    """Cheap wide blur: average down, blur, sample back up."""
    H, W = img.shape[:2]; h, w = H // factor, W // factor
    small = img[:h * factor, :w * factor].reshape(h, factor, w, factor, *img.shape[2:]).mean(axis=(1, 3))
    small = blur(small, sigma)
    return sample(small, *np.meshgrid((np.arange(W) + 0.5) / W * w, (np.arange(H) + 0.5) / H * h)).astype(np.float32)

def load_image(path, alpha=False):
    im = bpy.data.images.load(path)
    w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    a = px.reshape(h, w, 4)[::-1].copy()
    bpy.data.images.remove(im)
    return a if alpha else a[..., :3]

# ------------------------------------------------------------------ the frame
class Film:
    def __init__(self, variant):
        L = CUES['layout'][variant]
        self.variant = variant
        self.W, self.H = W, H = L['size']
        self.L = L
        v, u = np.mgrid[0:H, 0:W].astype(np.float32)
        self.X, self.Y = u + 0.5, v + 0.5
        self.U, self.V = self.X - W / 2, self.Y - H / 2
        self.tilt_px = L['tiltFrac'] * H

        # --- the backdrop (Cassidy's garden tabletop), softened like a shallow depth of field
        back = srgb_to_lin(load_image(os.path.join(HERE, 'source', 'backdrop.png')))
        self.ih, self.iw = back.shape[:2]
        self.back = blur(back, 4.2).astype(np.float32)
        self.back_soft = soft_blur(self.back, 4, 3.0)
        # --- the 3D dipper, rendered by dipper.py: frames plus the tip position for every frame
        self.dipper_dir = os.path.join(HERE, 'out', f'v2-dipper-{variant}')
        tip_file = os.path.join(HERE, 'out', f'tip-{variant}.json')
        if arg('--dipper-test'):
            self.dipper_dir = os.path.join(HERE, 'work', f'v2-dipper-test-{variant}')
            tip_file = os.path.join(self.dipper_dir, 'tip.json')
        self.tips = {int(k): v for k, v in json.load(open(tip_file))['tips'].items()} if os.path.exists(tip_file) else {}

        # --- the name
        self.setup_name()
        # --- the symbol layers
        self.setup_symbol()
        # --- the plate (end background): warm parchment, a broad lemon-honey warmth, fixed paper grain
        nx, ny = self.U / (W / 2), self.V / (H / 2)
        rad = np.sqrt((nx * W / max(W, H)) ** 2 + (ny * H / max(W, H)) ** 2)
        g = np.exp(-(rad / 0.9) ** 2)[..., None]
        plate = PARCHMENT * (1 - 0.65 * g) + LEMON_SOFT * (0.65 * g)
        sy0 = self.sym_top_post + 0.45 * self.sym_h
        glow = np.exp(-(((self.X - W / 2) / (0.42 * W)) ** 2 + ((self.Y - sy0) / (0.32 * H)) ** 2))[..., None]
        plate = plate + glow * 0.035 * HONEY_LIGHT
        grain = blur(np.random.default_rng(3).standard_normal((H // 2, W // 2, 1)).astype(np.float32), 0.8)
        grain = np.repeat(np.repeat(grain, 2, 0), 2, 1)[:H, :W]
        self.plate = (plate * (1 + 0.008 * grain)).astype(np.float32)
        self.vignette = (1 - 0.12 * np.clip(rad, 0, 1.4) ** 2.2)[..., None].astype(np.float32)
        self.fixed_dither = np.random.default_rng(99).triangular(-1, 0, 1, (H, W, 3)).astype(np.float32)

    # ---------------- backdrop and dipper
    def c(self, t): return self.tilt_px * window(t, *CUES['tilt'])

    def backdrop_frame(self, t):
        """Cover-fit with room to drift: the far backdrop moves up a little as the camera tilts (parallax)."""
        s = 1.18
        k = max(self.W / self.iw, self.H / self.ih) * s
        cx = self.iw / 2
        top = self.H / 2 / k                                   # image top at the screen top at the start
        cy = top                                               # the backdrop stays put for the whole film
        xs = cx + self.U / k; ys = cy + self.V / k
        return sample(self.back, xs, ys), sample(self.back_soft, xs, ys)

    def tip(self, n):
        if n in self.tips: return self.tips[n]
        if not self.tips: return [self.W / 2, 0.43 * self.H, 0.012 * self.W]
        keys = sorted(self.tips); k = min(keys, key=lambda x: abs(x - n)); return self.tips[k]

    def dipper_over(self, col, n, t):
        path = os.path.join(self.dipper_dir, f'{n:04d}.png')
        self._dip_alpha = None
        if not os.path.exists(path): return col
        a = load_image(path, alpha=True)
        rgb = srgb_to_lin(a[..., :3]); al = a[..., 3:4]
        dy = self.c(t)
        if dy > 0.01:
            gy = (np.arange(self.H, dtype=np.float32) + 0.5 + dy)[:, None]
            gx = np.broadcast_to((np.arange(self.W, dtype=np.float32) + 0.5)[None, :], (self.H, self.W))
            gy = np.broadcast_to(gy, (self.H, self.W))
            inside = (gy < self.H - 1)[..., None]
            rgb = np.where(inside, sample(rgb, gx, gy), 0); al = np.where(inside, sample(al, gx, gy), 0)
        self._dip_alpha = al
        return col * (1 - al) + rgb * al

    # ---------------- the name
    def setup_name(self):
        W, H, L = self.W, self.H, self.L
        a = load_image(os.path.join(HERE, 'source', 'name-mask.png'), alpha=True)[..., 3]
        ys, xs = np.where(a > 0.5)
        bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
        land_mx = (bx0 + bx1) // 2
        col = np.where(a[:, land_mx] > 0.5)[0]
        land_my = col.min() + 3
        s = L['script']['widthFrac'] * W / (bx1 - bx0)
        self.name_scale = s
        pad_top, pad_side = 24, 24
        pad_bottom = int(0.62 * H)
        self.lw = int((bx1 - bx0) * s) + 2 * pad_side
        self.lh = int((by1 - by0) * s) + pad_top + pad_bottom
        pre = blur(a[by0 - 8:by1 + 8, bx0 - 8:bx1 + 8][..., None], 0.45 / s)[..., 0]
        gy, gx = np.mgrid[0:self.lh, 0:self.lw].astype(np.float32)
        mx = (gx + 0.5 - pad_side) / s + 8; my = (gy + 0.5 - pad_top) / s + 8
        inside = (mx >= 0) & (my >= 0) & (mx < pre.shape[1] - 1) & (my < pre.shape[0] - 1)
        M = np.where(inside, sample(pre, mx, my), 0.0).astype(np.float32)
        self.M = clamp01((M - 0.5) * 1.6 + 0.5)          # crisp but anti-aliased edge
        self.land_lx = (land_mx - bx0) * s + pad_side
        self.land_ly = (land_my - by0) * s + pad_top
        self.left = W / 2 - self.land_lx                       # the landing point sits under the stream
        self.top = L['script']['topPre'] * H - pad_top
        self.word_bottom_local = (by1 - by0) * s + pad_top
        stroke = 2 * float(np.percentile(self.inner_radius(), 90))
        self.stroke = stroke
        self.sigma_h = max(2.0, stroke * 0.27)
        self.h_norm = float(blur(self.M[..., None], self.sigma_h)[..., 0].max()) * 0.88
        print('NAME', self.variant, 'scale', round(s, 4), 'stroke', round(stroke, 1), 'landing screen',
              round((self.left + self.land_lx) / W, 3), round((self.top + self.land_ly) / H, 3),
              'centre', round((self.top + pad_top + (by1 - by0) * s / 2) / H, 3))
        self.G = self.geodesic()

    def inner_radius(self):
        m = self.M > 0.5
        d = np.zeros(m.shape, np.float32); cur = m.copy(); r = 0
        while cur.any() and r < 60:
            r += 1
            cur = cur & np.roll(cur, 1, 0) & np.roll(cur, -1, 0) & np.roll(cur, 1, 1) & np.roll(cur, -1, 1)
            d[cur] = r
        return d[m] if m.any() else np.array([4.0])

    def geodesic(self):
        cache = os.path.join(WORK, f'geo-{self.variant}.npy')
        if os.path.exists(cache) and not arg('--regeo'):
            G = np.load(cache)
            if G.shape == self.M.shape: return G
        f = 2
        m = self.M[::f, ::f] > 0.35
        h, w = m.shape
        cost = np.where(m, 1.0, 7.0)
        dist = np.full((h, w), np.inf, np.float64)
        sy, sx = int(self.land_ly / f), int(self.land_lx / f)
        dist[sy, sx] = 0.0
        heap = [(0.0, sy, sx)]
        nb = [(-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0), (-1, -1, 1.4142), (-1, 1, 1.4142), (1, -1, 1.4142), (1, 1, 1.4142)]
        ylim = int((self.word_bottom_local + 10) / f)
        while heap:
            d0, y, x = heapq.heappop(heap)
            if d0 > dist[y, x]: continue
            for dy, dx, l in nb:
                yy, xx = y + dy, x + dx
                if 0 <= yy < min(h, ylim) and 0 <= xx < w:
                    nd = d0 + l * 0.5 * (cost[y, x] + cost[yy, xx])
                    if nd < dist[yy, xx]:
                        dist[yy, xx] = nd; heapq.heappush(heap, (nd, yy, xx))
        dist[np.isinf(dist)] = dist[~np.isinf(dist)].max()
        G = sample(dist.astype(np.float32) * f, *np.meshgrid((np.arange(self.lw) + 0.5) / f, (np.arange(self.lh) + 0.5) / f))
        os.makedirs(WORK, exist_ok=True); np.save(cache, G.astype(np.float32))
        return G.astype(np.float32)

    def name_cover(self, t):
        """Coverage of the honey name on its local grid, plus a bulge term near the flowing front."""
        w0, w1 = CUES['write']
        inside = self.M > 0.35
        gmax = float(self.G[inside].max())
        if t < CUES['drop']['land']:
            return np.zeros_like(self.M), np.zeros_like(self.M)
        p = clamp01((t - w0) / (w1 - w0)); p = 0.35 * p + 0.65 * float(smooth(p))
        front = 6 + (gmax + 14) * p
        a = clamp01((front - self.G) / 12.0 + 0.5)
        cover = self.M * a
        bulge = np.exp(-((front - self.G) / 22.0) ** 2) * (self.G <= front + 4) * (1 - window(t, w1 - 0.2, w1 + 0.6))
        m0, m1 = CUES['melt']
        if t > m0:
            cover, bulge = self.melt(cover, t), bulge * 0
        return cover.astype(np.float32), bulge.astype(np.float32)

    def drips(self):
        """Honey drips hang from the lowest edges of the letters: a few, spread along the word, deterministic."""
        if not hasattr(self, '_drips'):
            rng = np.random.default_rng(21)
            m = self.M > 0.5
            low = np.array([np.where(m[:, x])[0].max() if m[:, x].any() else -1 for x in range(self.lw)])
            # candidates: columns whose lowest honey sits near the baseline (not inside descenders' tips)
            base = np.percentile(low[low > 0], 55)
            cands = np.where((low > base - 0.35 * self.stroke) & (low < base + 0.6 * self.stroke))[0]
            picks, spacing = [], self.lw / 9.5
            for x in rng.permutation(cands):
                if all(abs(x - p) > spacing for p in picks): picks.append(int(x))
                if len(picks) == 8: break
            self._drips = [(float(x), float(low[x]), rng.uniform(0.55, 1.35), self.stroke * rng.uniform(0.26, 0.36), rng.uniform(0.0, 0.35))
                           for x in sorted(picks)]
        return self._drips

    def melt(self, cover, t):
        """The name sags a little under its own weight while honey drips grow from its lower edges; then it drains
        away (strokes thin, they do not turn see-through), so the honey stays honey to the end."""
        m0, m1 = CUES['melt']
        sag = 0.03 * self.H * window(t, m0, m1)
        Xg = np.broadcast_to((np.arange(self.lw, dtype=np.float32) + 0.5)[None, :], cover.shape)
        Yg = np.broadcast_to((np.arange(self.lh, dtype=np.float32) + 0.5)[:, None], cover.shape)
        out = sample(cover, Xg, Yg - sag)
        for xc, ylow, amp, w, delay in self.drips():
            p = window(t, m0 + delay, m1 + delay)
            Ld = 0.36 * self.H * amp * p ** 1.4
            if Ld < 1.0: continue
            y0 = ylow + sag - 0.6 * w; y1 = ylow + sag + Ld
            # drips above the cup end at the tea's surface: they pour into it
            if abs(self.left + xc - self.tea_cx) < self.tea_rx * 1.05:
                y1 = min(y1, self.tea_cy_post + self.tilt_px - self.top - 2)
                if y1 <= y0 + 1: continue
            a0, a1 = max(0, int(y0)), min(self.lh, int(y1 + 1.3 * w + 2))
            b0, b1 = max(0, int(xc - 2 * w)), min(self.lw, int(xc + 2 * w + 2))
            if a0 >= a1 or b0 >= b1: continue
            yy, xx = Yg[a0:a1, b0:b1], Xg[a0:a1, b0:b1]
            frac = clamp01((yy - y0) / max(1.0, y1 - y0))
            r = w * (1.0 - 0.45 * frac)                       # thins as it runs down
            body = clamp01(r - np.abs(xx - xc) + 0.5) * clamp01(y1 - yy + 0.5)
            rb = w * 1.08                                     # a rounded bead at the end
            bead = clamp01(rb - np.sqrt((xx - xc) ** 2 + ((yy - (y1 - 0.2 * rb)) / 1.15) ** 2) + 0.5)
            out[a0:a1, b0:b1] = np.maximum(out[a0:a1, b0:b1], np.maximum(body, bead))
        drain = window(t, m0 + 0.35, m1 + 0.2)
        if drain > 0:
            out = clamp01((out - 0.92 * drain) / max(0.08, 1 - 0.92 * drain)) * (1 - window(t, m1, m1 + 0.25))
        return out

    # ---------------- the symbol
    def setup_symbol(self):
        L = self.L
        self.sym = {}
        for lid in ('steam', 'back', 'tea', 'lemon', 'front', 'drip', 'flower'):
            a = load_image(os.path.join(WORK, f'symbol-{self.variant}-{lid}.png'), alpha=True)
            rgb = srgb_to_lin(a[..., :3]); al = a[..., 3:4]
            self.sym[lid] = (rgb * al, al)                     # premultiplied
        self.sym_h, self.sym_w = self.sym['back'][1].shape[:2]
        self.sym_left = int(round(self.W / 2 - self.sym_w / 2))
        self.sym_top_post = L['symbol']['topPost'] * self.H
        ss = self.sym_w / 930.0
        self.ss = ss
        self.tea_cx = self.sym_left + (740 - 290) * ss
        self.tea_cy_post = self.sym_top_post + (447 - 30) * ss
        self.tea_rx, self.tea_ry = 246 * ss, 57 * ss
        self.rim_y_local, self.drip_end_local = (500 - 30) * ss, (632 - 30) * ss

    def symbol_over(self, col, t):
        y0 = self.sym_top_post + self.tilt_px - self.c(t)
        iy0 = int(np.floor(y0)); fy = y0 - iy0
        H, W = self.H, self.W
        appear = window(t, CUES['welcome']['wordmark'][0], CUES['welcome']['wordmark'][0] + 0.8)
        if appear <= 0.0005: return col
        f = CUES['feed']
        fill = window(t, *f['fill']); drip = window(t, *f['rimDrip']); steam = window(t, *f['steam'])
        wave_amp = 3.0 * (1 - window(t, SETTLE - 0.7, SETTLE))
        for lid, alpha in (('back', appear), ('tea', appear * fill), ('lemon', appear * fill), ('front', appear),
                           ('drip', appear), ('flower', appear), ('steam', appear * steam)):
            if alpha <= 0.0005: continue
            pm, al = self.sym[lid]
            if lid == 'drip':
                rows = (np.arange(al.shape[0]) + 0.5)[:, None, None]
                reveal = clamp01((self.rim_y_local + (self.drip_end_local - self.rim_y_local + 12) * drip - rows) / 6.0)
                pm, al = pm * reveal, al * reveal
            if lid == 'tea':
                sink = (1 - fill) * 6 * self.ss
            else:
                sink = 0.0
            hh, ww = al.shape[:2]
            yy = np.arange(hh, dtype=np.float32) + 0.5 - fy - sink
            xx = np.arange(ww, dtype=np.float32) + 0.5
            gx, gy = np.meshgrid(xx, yy)
            if lid == 'steam' and wave_amp > 0.01:
                gx = gx + wave_amp * np.sin(gy * 0.045 - t * 2.4)
            pms = sample(pm, gx, gy); als = sample(al, gx, gy)
            ys0, xs0 = iy0, self.sym_left
            a0, a1 = max(0, ys0), min(H, ys0 + hh); b0, b1 = max(0, xs0), min(W, xs0 + ww)
            if a0 >= a1 or b0 >= b1: continue
            sl = (slice(a0 - ys0, a1 - ys0), slice(b0 - xs0, b1 - xs0))
            col[a0:a1, b0:b1] = col[a0:a1, b0:b1] * (1 - als[sl] * alpha) + pms[sl] * alpha
        return col

    # ---------------- the stream and the drops (screen space)
    def stream_cover(self, t, n):
        H, W = self.H, self.W
        tx, ty, tr = self.tip(n)
        seam_y = ty - self.c(t)
        r_top = tr * 1.0
        land_y = self.top + self.land_ly - self.c(t)
        r_land = self.stroke * 0.42
        xc = tx
        cover = np.zeros((H, W), np.float32)
        d0 = CUES['drop']; lg = CUES['letGo']
        segs = []   # (y_top, y_bottom, bead_at_bottom, bead_radius)
        if t < d0['fall'][0]:
            g = window(t, *d0['gather'])
            length = 4 + 26 * g
            segs.append((seam_y - 18, seam_y + length, True, r_top * (0.62 + 0.22 * g)))
        elif t < d0['land']:
            p = clamp01((t - d0['fall'][0]) / (d0['land'] - d0['fall'][0])) ** 2
            yb = seam_y + 30 + (land_y - seam_y - 30) * p
            segs.append((seam_y - 18, yb, True, r_land * 1.35))
        elif t < lg['break']:
            segs.append((seam_y - 18, land_y + 4, False, 0))
        elif t < lg['settle']:
            q = window(t, lg['break'], lg['settle'])
            mid = seam_y + 0.45 * (land_y - seam_y)
            segs.append((seam_y - 18, lerp(mid, seam_y + 10, q), True, r_land * (1.0 - 0.3 * q)))
            lo_top = lerp(mid, land_y, clamp01(q * 1.6))
            if lo_top < land_y - 2: segs.append((lo_top, land_y + 4, False, 0))
        else:
            segs.append((seam_y - 18, seam_y + 10, True, r_top * 0.5))
        thin = 1.0 - 0.15 * window(t, CUES['write'][0], CUES['write'][1])
        neck = window(t, lg['thin'][0], lg['break'])
        for ytop, ybot, bead, rb in segs:
            a0, a1 = max(0, int(ytop) - 2), min(H, int(ybot + rb + 3))
            if a0 >= a1: continue
            yy = self.Y[a0:a1, :]; xx = self.X[a0:a1, :]
            frac = clamp01((yy - seam_y) / max(1.0, land_y - seam_y))
            r = lerp(r_top, r_land, frac ** 0.55) * (1 - (1 - thin) * frac)
            r = r * (1 - 0.82 * neck * np.exp(-((frac - 0.45) / 0.18) ** 2))
            body = clamp01(r - np.abs(xx - xc) + 0.5) * clamp01(ybot - yy + 0.5) * clamp01(yy - ytop + 0.5)
            if bead:
                bd = np.sqrt((xx - xc) ** 2 + ((yy - (ybot - rb * 0.3)) / 1.12) ** 2)
                body = np.maximum(body, clamp01(rb - bd + 0.5))
            seam_fade = clamp01((yy - (seam_y - 18)) / 5.0)
            cover[a0:a1, :] = np.maximum(cover[a0:a1, :], body * seam_fade)
        return cover

    def drops_cover(self, t):
        H, W = self.H, self.W
        f0, f1 = CUES['feed']['drops']
        cover = np.zeros((H, W), np.float32)
        if t < f0 or t > f1 + 0.4: return cover
        if not hasattr(self, '_dropspec'):
            spec = []
            for i, (dx, ts) in enumerate(zip([-0.55, -0.22, 0.05, 0.32, 0.58], [9.0, 9.16, 9.32, 9.48, 9.62])):
                x = self.tea_cx + dx * self.tea_rx
                lx = int(np.clip(x - self.left, 0, self.lw - 1))
                rows = np.where(self.M[:, lx] > 0.4)[0]
                ly = (rows.max() if len(rows) else self.word_bottom_local) + 2
                y0w = self.top + ly
                yt = self.tea_cy_post + self.tilt_px - 3
                ta = f1 - 0.36 + 0.09 * i
                g = 2 * (yt - y0w) / max(0.3, ta - ts) ** 2
                spec.append((x, y0w, ts, ta, g))
            self._dropspec = spec
        r0 = self.stroke * 0.36
        for x, y0w, ts, ta, g in self._dropspec:
            if t < ts or t >= ta: continue
            dt = t - ts
            yw = y0w + 0.5 * g * dt * dt
            v = g * dt
            ys = yw - self.c(t)
            ry = r0 * (1 + min(1.2, v / 900.0)); rx = r0 * (1 - min(0.25, v / 3000.0))
            a0, a1 = max(0, int(ys - ry * 3)), min(H, int(ys + ry + 3)); b0, b1 = max(0, int(x - rx - 3)), min(W, int(x + rx + 3))
            if a0 >= a1 or b0 >= b1: continue
            yy = self.Y[a0:a1, b0:b1]; xx = self.X[a0:a1, b0:b1]
            # teardrop: round below, pointed tail above
            above = yy < ys
            ryy = np.where(above, ry * 2.2, ry)
            rxx = np.where(above, rx * clamp01(1 - (ys - yy) / (ry * 2.2)) + 0.6, rx)
            d = np.sqrt(((xx - x) / np.maximum(rxx, 0.6)) ** 2 + ((yy - ys) / ryy) ** 2)
            body = clamp01((1 - d) * min(rx, ry) + 0.5)
            cover[a0:a1, b0:b1] = np.maximum(cover[a0:a1, b0:b1], body)
        return cover

    # ---------------- honey shading
    def honey(self, bg, bg_soft, cover, bulge, t, depth=None):
        rows = np.where(cover.max(axis=1) > 0.002)[0]
        if len(rows) == 0: return bg
        cols = np.where(cover.max(axis=0) > 0.002)[0]
        pad = int(self.sigma_h * 3 + 14)
        a0, a1 = max(0, rows[0] - pad), min(self.H, rows[-1] + pad + 1)
        b0, b1 = max(0, cols[0] - pad), min(self.W, cols[-1] + pad + 1)
        C = cover[a0:a1, b0:b1]; Bu = bulge[a0:a1, b0:b1]
        hf = blur(C[..., None], self.sigma_h)[..., 0] / self.h_norm
        h = clamp01(hf) * np.sqrt(C) + 0.22 * Bu * C
        gx = np.zeros_like(h); gy = np.zeros_like(h)
        gx[:, 1:-1] = (h[:, 2:] - h[:, :-2]) * 0.5; gy[1:-1, :] = (h[2:, :] - h[:-2, :]) * 0.5
        Ksl = self.stroke * 0.55
        gx *= Ksl; gy *= Ksl
        nz = 1.0 / np.sqrt(1 + gx * gx + gy * gy); nx, ny = -gx * nz, -gy * nz
        X, Y = self.X[a0:a1, b0:b1], self.Y[a0:a1, b0:b1]
        R = 9.0 + self.stroke * 0.25
        refr = sample(bg, X - nx * R * (0.3 + h), Y - ny * R * (0.3 + h))
        scat = bg_soft[a0:a1, b0:b1]
        thick = (0.45 + 1.7 * h ** 1.3)[..., None]
        thick = thick * (1 + EDGE_DEPTH * (1 - nz))[..., None]       # edge-on, light crosses more honey
        if depth is not None: thick = thick * depth[a0:a1, b0:b1, None]
        T = np.exp(-SIGMA * thick)
        lum = (scat * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(axis=2, keepdims=True)
        body = (0.62 * refr + 0.38 * scat) * T * HONEY_GAIN + HONEY_GLOW * (0.07 + 0.20 * h[..., None]) * (0.45 + 1.6 * lum)
        body = body * (0.70 + 0.30 * smooth(h / 0.3))[..., None]
        body = body * (1 - EDGE_DARK * (1 - nz) ** 2)[..., None]       # light glances off the edges
        # the lit core: light passing through the honey gathers along its middle (it works like a lens)
        core = clamp01(nz) ** 8 * smooth(h / 0.35)
        body = body + CORE_GOLD * (CORE * core)[..., None] * (0.4 + 1.2 * lum)
        Lk = np.array([-0.35, -0.72, 0.6], np.float32); Lk /= np.linalg.norm(Lk)
        Hk = Lk + np.array([0, 0, 1], np.float32); Hk /= np.linalg.norm(Hk)
        ndh = clamp01(nx * Hk[0] + ny * Hk[1] + nz * Hk[2])
        L2 = np.array([0.55, 0.45, 0.7], np.float32); L2 /= np.linalg.norm(L2)
        H2 = L2 + np.array([0, 0, 1], np.float32); H2 /= np.linalg.norm(H2)
        ndh2 = clamp01(nx * H2[0] + ny * H2[1] + nz * H2[2])
        spec = ndh ** 70 * 1.9 + ndh ** 12 * 0.14 + ndh2 ** 50 * 0.4     # broad, glossy
        fres = (1 - nz) ** 4 * 0.22
        g0, g1 = CUES['glint']
        if g0 <= t <= g1 + 0.2:
            gp = (t - g0) / (g1 - g0)
            gx0 = self.left + gp * (self.lw + 200) - 100
            band = np.exp(-(((X - gx0) + 0.45 * (Y - (self.top - self.c(t)))) / 38.0) ** 2) * (1 - window(t, g1 - 0.1, g1 + 0.2))
            spec = spec + band * 0.5 * smooth(h / 0.3)
        col = body + (spec + fres * 0.55)[..., None] * WARM_WHITE
        out = bg.copy()
        out[a0:a1, b0:b1] = bg[a0:a1, b0:b1] * (1 - C[..., None]) + col * C[..., None]
        # a warm glow around the honey (light scattered through it)
        glow = soft_blur((col * C[..., None]).astype(np.float32), 4, 2.5)
        out[a0:a1, b0:b1] += glow * 0.16
        return out

    def frame(self, n):
        t = n / FPS
        H, W = self.H, self.W
        pa = window(t, *CUES['plate'])
        bd, bd_soft = self.backdrop_frame(t)
        i0, i1 = CUES['breath']['inhale']; e0, e1 = CUES['breath']['exhale']
        b = (0.25 + 0.75 * window(t, i0, i1)) if t < e0 else (1.0 - 0.85 * window(t, e0, e1))
        vig = self.vignette
        bd = bd * (1 + 0.045 * b * (1 - pa)) * vig
        # the backdrop settles behind the whole film exactly as it is (no fade towards parchment for the welcome)
        bg = bd
        bg_soft = bd_soft * vig
        bg = self.symbol_over(bg, t)
        # honey: name (local grid placed on screen), stream, drops
        nc, nb = self.name_cover(t)
        cover = np.zeros((H, W), np.float32); bulge = np.zeros((H, W), np.float32)
        if nc.max() > 0.001:
            oy = self.top - self.c(t); ox = self.left
            gx = self.X - ox; gy = self.Y - oy
            valid = (gx >= 0) & (gy >= 0) & (gx < self.lw - 1) & (gy < self.lh - 1)
            cover = np.where(valid, sample(nc, gx, gy), 0).astype(np.float32)
            bulge = np.where(valid, sample(nb, gx, gy), 0).astype(np.float32)
        if t < CUES['plate'][0]:
            cover = np.maximum(cover, self.stream_cover(t, n))
        cover = np.maximum(cover, self.drops_cover(t))
        depth = None
        if t < CUES['letGo']['settle'] + 0.6 and t < CUES['plate'][0]:
            tx, ty0, tr = self.tip(n); ty = ty0 - self.c(t)
            land_y = self.top + self.land_ly - self.c(t)
            Lg = max(40.0, GRAD_LEN * (land_y - ty))
            depth = np.ones((H, W), np.float32)
            y0, y1 = max(0, int(ty) - 20), min(H, int(ty + Lg) + 2)
            x0, x1 = max(0, int(tx - 2.5 * tr)), min(W, int(tx + 2.5 * tr) + 1)
            g = 1 - smooth((self.Y[y0:y1, x0:x1] - ty) / Lg)
            depth[y0:y1, x0:x1] = 1 + GRAD_DEPTH * g
        hon = self.honey(bg, bg_soft, cover, bulge, t, depth)
        out = self.dipper_over(hon, n, t)
        if t < CUES['letGo']['settle'] + 0.6:
            # the honey thread sits over the trimmed end of the modelled drip, so the join is seamless
            ty = self.tip(n)[1] - self.c(t)
            tx, _, tr = self.tip(n)
            y0 = int(round(ty)); x0, x1 = int(tx - 0.55 * tr), int(tx + 0.55 * tr) + 1
            # the honey thread covers the trimmed end of the drip, so no edge of the cut shows
            band = (smooth((self.Y - (ty - 18)) / 15.0) * (cover > 0.02))[..., None]
            out = out * (1 - band) + hon * band
        fi0, fi1 = CUES['fadeIn']
        a = window(t, fi0, fi1)
        out = PARCHMENT * (1 - a) + out * a
        srgb = lin_to_srgb(out)
        dither = self.fixed_dither if t >= SETTLE else np.random.default_rng(1000 + n).triangular(-1, 0, 1, out.shape).astype(np.float32)
        return np.clip(np.round(srgb * 255 + dither * 0.75), 0, 255).astype(np.uint8)

# ------------------------------------------------------------------ output
def save_png(arr, path, holder={}):
    H, W, _ = arr.shape
    if (W, H) not in holder: holder[(W, H)] = bpy.data.images.new(f'frame{W}x{H}', W, H, alpha=True)
    im = holder[(W, H)]
    rgba = np.concatenate([arr.astype(np.float32) / 255.0, np.ones((H, W, 1), np.float32)], axis=2)[::-1]
    im.pixels.foreach_set(rgba.ravel()); im.filepath_raw = path; im.file_format = 'PNG'; im.save()

def encode(variant, frames_dir, out_path, kbps, audio=None):
    W, H = CUES['layout'][variant]['size']
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
    if audio: strips.new_sound(name='sound', filepath=audio, channel=2, frame_start=1)
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
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    s = sc.render.image_settings
    try: s.media_type = 'IMAGE'
    except Exception: pass
    s.file_format = 'JPEG'; s.quality = 84; s.color_mode = 'RGB'
    for name, n in (('poster', 0), ('still', int(round(CUES['stills']['still'] * FPS))), ('end', NFRAMES - 1)):
        im = bpy.data.images.load(os.path.join(frames_dir, f'{n:04d}.png'))
        path = os.path.join(out_dir, f'{name}-{variant}.jpg')
        if os.path.exists(path): os.remove(path)
        im.save_render(filepath=path, scene=sc)
        print('STILL', path, os.path.getsize(path))

def backdrop_still(variant, out_dir):
    """The settled backdrop with nothing on it (no symbol, no honey): the ground of the breathing space
    (components/golden-pause/BreathingSpace.jsx), so it sits exactly where the film ends."""
    film = Film(variant)
    t = DUR
    bd, _ = film.backdrop_frame(t)
    out = bd * film.vignette
    srgb = lin_to_srgb(out)
    arr = np.clip(np.round(srgb * 255 + film.fixed_dither * 0.75), 0, 255).astype(np.uint8)
    os.makedirs(out_dir, exist_ok=True)
    png = os.path.join(HERE, 'work', f'breathe-backdrop-{variant}.png')
    save_png(arr, png)
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    s = sc.render.image_settings
    try: s.media_type = 'IMAGE'
    except Exception: pass
    s.file_format = 'JPEG'; s.quality = 84; s.color_mode = 'RGB'
    path = os.path.join(out_dir, f'breathe-{variant}.jpg')
    if os.path.exists(path): os.remove(path)
    bpy.data.images.load(png).save_render(filepath=path, scene=sc)
    print('BACKDROP', path, os.path.getsize(path))

if __name__ == '__main__':
    variant = arg('--variant', 'wide')
    film_dir = os.path.join(HERE, 'out', f'v2-frames-{variant}')
    if arg('--backdrop'):
        backdrop_still(variant, os.path.join(HERE, 'out', 'v2'))
    elif arg('--stills'):
        stills(variant, film_dir, os.path.join(HERE, 'out', 'v2'))
    elif arg('--encode'):
        os.makedirs(os.path.join(HERE, 'out', 'v2'), exist_ok=True)
        encode(variant, film_dir, os.path.join(HERE, 'out', 'v2', arg('--name', f'film-{variant}.mp4')), int(arg('--kbps', 2600)), arg('--audio'))
    else:
        film = Film(variant)
        if arg('--all'):
            frames = range(NFRAMES); os.makedirs(film_dir, exist_ok=True); dest = film_dir
        else:
            frames = [int(x) for x in str(arg('--frames', '0,50,77,100,150,180,200,215,230,245,260,311')).split(',')]
            dest = os.path.join(HERE, 'work', f'v2-test-{variant}'); os.makedirs(dest, exist_ok=True)
        t0 = time.time()
        for n in frames:
            save_png(film.frame(n), os.path.join(dest, f'{n:04d}.png'))
            if n % 24 == 0 or not arg('--all'): print('frame', n, f'{time.time() - t0:.1f}s', flush=True)
        print('DONE', len(list(frames)), 'frames in', f'{time.time() - t0:.1f}s')
