# Throwaway test media for the Golden Pause preview player, cue sheet version 2 (NOT the film).
# Run: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python make_test_media.py [-- wide|square|sound]
# Makes, next to this script (timings and positions from ../../cues.json):
#   film-wide.mp4 (1600x900), film-square.mp4 (900x900): 13 s, 24 fps, H264, no audio.
#     A stand-in for the film, so screenshots show where the page's words fall against the picture:
#     opens from parchment (cues.fadeIn) onto a slowly drifting warm gradient (the dipper plate); a drop gathers and
#     falls to layout.script.landing; the honey name (../../source/name-mask.png, read only, cropped to its ink) is
#     written outward from there over cues.write, sitting where layout.script puts it; it melts away over cues.melt
#     while the plate turns to parchment (cues.plate) and the scene tilts up by tiltFrac of the height (cues.tilt),
#     bringing a plain stand-in cup into layout.symbol. A progress bar along the bottom and one dot per elapsed
#     whole second in the top-left show the video clock.
#   poster-*.jpg (frame 0, parchment), still-*.jpg (the frame at cues.stills.still = 7.9 s, the name written),
#   end-*.jpg (the last frame, the settled lockup).
#   golden-pause.webm (Opus) and golden-pause.m4a (AAC): a soft 13 s pad with a tick every second, for the sound path.
import bpy, os, math, wave, sys, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.normpath(os.path.join(HERE, "..", ".."))
CUES = json.load(open(os.path.join(FILM, "cues.json"), encoding="utf-8"))
FPS = CUES["fps"]
DUR = CUES["duration"]
N = int(round(FPS * DUR))  # 312 frames
STILL_F = int(round(CUES["stills"]["still"] * FPS)) + 1  # 1-based frame number of the still (t = 190/24 s)
FRAMES = os.path.join(HERE, "frames")
os.makedirs(FRAMES, exist_ok=True)

PARCH = np.array([251, 247, 238], np.float32) / 255
HONEY_L = np.array([232, 190, 103], np.float32) / 255
HONEY = np.array([217, 164, 65], np.float32) / 255
GLOSS = np.array([246, 205, 112], np.float32) / 255
AMBER = np.array([185, 130, 62], np.float32) / 255
DARK = np.array([110, 62, 14], np.float32) / 255
CREAM = np.array([252, 244, 230], np.float32) / 255
TEA = np.array([236, 170, 60], np.float32) / 255
TEAL = np.array([95, 168, 163], np.float32) / 255


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def win(t, w):
    a, b = w
    return float(smooth(np.float32((t - a) / (b - a))))


def name_mask(w, h, L):
    """The honey name's alpha, cropped to its ink and scaled to layout.script.widthFrac of the width (or None)."""
    p = os.path.join(FILM, "source", "name-mask.png")
    if not os.path.exists(p):
        print("no name mask; the test film shows no name")
        return None
    im = bpy.data.images.load(p)
    iw, ih = im.size
    px = np.empty(iw * ih * 4, np.float32)
    im.pixels.foreach_get(px)
    a = px.reshape(ih, iw, 4)[:, :, 3]  # bottom-up rows
    ys, xs = np.where(a > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = a[y0:y1, x0:x1]
    tw = int(round(L["script"]["widthFrac"] * w))
    th = int(round(tw * crop.shape[0] / crop.shape[1]))
    sm = bpy.data.images.new("mask_crop", crop.shape[1], crop.shape[0], alpha=True, float_buffer=True)
    rgba = np.zeros((crop.shape[0], crop.shape[1], 4), np.float32)
    rgba[..., 3] = crop
    rgba[..., 0] = crop
    sm.pixels.foreach_set(rgba.ravel())
    sm.scale(tw, th)
    out = np.empty(tw * th * 4, np.float32)
    sm.pixels.foreach_get(out)
    m = out.reshape(th, tw, 4)[::-1, :, 0].copy()  # top-down
    bpy.data.images.remove(sm)
    bpy.data.images.remove(im)
    print("name mask %dx%d -> %dx%d (%.3f of the height)" % (crop.shape[1], crop.shape[0], tw, th, th / h))
    return np.clip(m, 0, 1)


def paste(col, alpha, color, x0, y0):
    """col (top-down HxWx3) gets color over it with alpha (h x w) placed at (x0, y0), clipped to the frame."""
    H, W = col.shape[:2]
    ah, aw = alpha.shape
    ix0, iy0 = int(round(x0)), int(round(y0))
    sx0, sy0 = max(0, -ix0), max(0, -iy0)
    dx0, dy0 = max(0, ix0), max(0, iy0)
    dx1, dy1 = min(W, ix0 + aw), min(H, iy0 + ah)
    if dx1 <= dx0 or dy1 <= dy0:
        return
    a = alpha[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)][..., None]
    c = color if np.ndim(color) == 1 else color[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)]
    col[dy0:dy1, dx0:dx1] = col[dy0:dy1, dx0:dx1] * (1 - a) + c * a


class Frames:
    def __init__(self, fmt, w, h):
        self.fmt, self.w, self.h = fmt, w, h
        self.L = CUES["layout"][fmt]
        self.mask = name_mask(w, h, self.L)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        self.x, self.y = xx / w, yy / h
        self.xx, self.yy = xx, yy

    def pixels(self, f):
        w, h, L = self.w, self.h, self.L
        x, y = self.x, self.y
        t = (f - 1) / FPS
        phase = t / DUR
        tilt = win(t, CUES["tilt"])
        off = L["tiltFrac"] * h * tilt  # the scene moves up by this many pixels
        # the dipper plate stand-in: diagonal bands that drift slowly, and a soft moving glow
        d = (x * 0.75 + (y + off / h) * 0.6 + phase * 0.9) % 1.0
        band = 0.5 - 0.5 * np.cos(2 * math.pi * d)
        gx, gy = 0.3 + 0.4 * phase, 0.45 + 0.1 * math.sin(phase * math.pi * 2)
        glow = np.exp(-(((x - gx) * (w / h)) ** 2 + (y - gy) ** 2) / 0.08)
        col = DARK[None, None, :] * (1 - band[..., None]) + HONEY[None, None, :] * band[..., None]
        col = col * (1 - 0.6 * glow[..., None]) + HONEY_L[None, None, :] * (0.6 * glow[..., None])
        # opens from parchment, and turns to parchment again for the welcome
        k = win(t, CUES["fadeIn"]) * (1 - win(t, CUES["plate"]))
        col = PARCH[None, None, :] * (1 - k) + col * k
        # the drop: gathers on the (unseen) dipper, then falls to the landing point
        lx, ly = L["script"]["landing"]
        if t < CUES["drop"]["land"]:
            g = win(t, CUES["drop"]["gather"])
            p = float(np.clip((t - CUES["drop"]["fall"][0]) / (CUES["drop"]["fall"][1] - CUES["drop"]["fall"][0]), 0, 1))
            cy = (0.3 + (ly - 0.3) * p * p) * h
            r = h * 0.012 * (0.4 + 0.6 * g)
            if g > 0:
                dd = np.hypot(self.xx - lx * w, self.yy - cy) - r
                a = np.clip(0.5 - dd, 0, 1) * min(1.0, g * 3)
                col = col * (1 - a[..., None]) + GLOSS[None, None, :] * a[..., None]
        # the honey name: written outward from the landing point, then melting away (a little downward drift)
        if self.mask is not None:
            write = win(t, CUES["write"])
            melt = win(t, CUES["melt"])
            if write > 0 and melt < 1:
                mh, mw = self.mask.shape
                x0 = (w - mw) / 2
                y0 = L["script"]["topPre"] * h - off + melt * 0.04 * h
                xs = np.arange(mw, dtype=np.float32) + x0
                reach = write * (max(lx * w - x0, x0 + mw - lx * w) + 12)
                reveal = np.clip((reach - np.abs(xs - lx * w)) / 10.0, 0, 1)[None, :]
                a = self.mask * reveal * (1 - melt) * 0.96
                paste(col, a, GLOSS, x0, y0)
                paste(col, self.mask * reveal * (1 - melt) * 0.35, AMBER, x0 + 2, y0 + 3)  # a darker lower edge
        # the stand-in cup (not the symbol): body, tea, rim drip and steam, in layout.symbol, rising with the tilt
        appear = win(t, [CUES["welcome"]["wordmark"][0], CUES["welcome"]["wordmark"][0] + 0.8])
        if appear > 0:
            sh = L["symbol"]["heightFrac"] * h
            top = L["symbol"]["topPost"] * h + L["tiltFrac"] * h * (1 - tilt)
            cx = w / 2
            bowl_top = top + 0.42 * sh
            rx, ry = 0.36 * sh, 0.5 * sh
            X, Y = self.xx - cx, self.yy - bowl_top
            body = ((X / rx) ** 2 + (Y / ry) ** 2 <= 1) & (Y >= 0)
            a = body.astype(np.float32) * appear
            col = col * (1 - a[..., None]) + CREAM[None, None, :] * a[..., None]
            rim = (np.abs((X / rx) ** 2 + (Y / (0.12 * sh)) ** 2 - 1) < 0.08) | (body & (np.abs((X / rx) ** 2 + (Y / ry) ** 2 - 1) < 0.02))
            a = rim.astype(np.float32) * appear
            col = col * (1 - a[..., None]) + AMBER[None, None, :] * a[..., None]
            fill = win(t, CUES["feed"]["fill"])
            tea = (X / (0.94 * rx)) ** 2 + (Y / (0.1 * sh)) ** 2 <= 1
            a = tea.astype(np.float32) * appear * fill
            col = col * (1 - a[..., None]) + TEA[None, None, :] * a[..., None]
            drip = win(t, CUES["feed"]["rimDrip"])
            dr = (np.abs(X - 0.55 * rx) < 0.035 * sh) & (Y > 0) & (Y < drip * 0.3 * sh)
            a = dr.astype(np.float32) * appear
            col = col * (1 - a[..., None]) + HONEY[None, None, :] * a[..., None]
            steam = win(t, CUES["feed"]["steam"])
            for k2, sx in enumerate((-0.12, 0.0, 0.12)):
                yrel = (self.yy - top) / sh
                wave = sx * sh + 0.03 * sh * np.sin(yrel * 14 + k2 + t * 2)
                st = (np.abs(X - wave) < 0.012 * sh) & (yrel > 0.05 + 0.33 * (1 - steam)) & (yrel < 0.38)
                a = st.astype(np.float32) * appear * steam
                col = col * (1 - a[..., None]) + TEAL[None, None, :] * a[..., None]
        # progress bar (bottom 1%) and whole-second dots (top-left)
        bar_h = max(4, h // 100)
        col[h - bar_h:, : int(w * min(1.0, t / DUR)), :] = np.array([0.15, 0.1, 0.05], np.float32)
        secs = int(math.floor(t + 1e-6))
        r = max(5, h // 90)
        for i in range(secs):
            cx, cy = 3 * r + i * 3 * r, 3 * r
            col[cy - r: cy + r, cx - r: cx + r, :] = np.array([0.98, 0.97, 0.93], np.float32)  # light square...
            col[cy - r + 2: cy + r - 2, cx - r + 2: cx + r - 2, :] = DARK                      # ...dark centre: seen on both grounds
        col = col[::-1, :, :]  # Blender image rows start at the bottom
        rgba = np.concatenate([col, np.ones((h, w, 1), np.float32)], axis=2)
        return rgba.ravel()


def write_frames(tag, w, h):
    d = os.path.join(FRAMES, tag)
    os.makedirs(d, exist_ok=True)
    fr = Frames(tag, w, h)
    img = bpy.data.images.new("gp_" + tag, w, h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    stills = {1: ["poster-%s.jpg"], STILL_F: ["still-%s.jpg"], N: ["end-%s.jpg"]}
    for f in range(1, N + 1):
        px = fr.pixels(f)
        img.pixels.foreach_set(px)
        img.filepath_raw = os.path.join(d, "f_%04d.png" % f)
        img.file_format = "PNG"
        img.save()
        for name in stills.get(f, []):
            jp = bpy.data.images.new("j", w, h, alpha=False)
            jp.pixels.foreach_set(px)
            jp.filepath_raw = os.path.join(HERE, name % tag)
            jp.file_format = "JPEG"
            jp.save()
            bpy.data.images.remove(jp)
            print("WROTE", name % tag, "(frame %d, %.3f s)" % (f, (f - 1) / FPS))
    bpy.data.images.remove(img)
    return d


def strips_of(se):
    return getattr(se, "strips", None) if hasattr(se, "strips") else se.sequences


def fresh_scene(name):
    sc = bpy.data.scenes.new(name)
    sc.render.fps = FPS
    sc.render.fps_base = 1
    sc.frame_start = 1
    sc.frame_end = N
    sc.render.use_sequencer = True
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.use_file_extension = False
    ims = sc.render.image_settings
    try:
        ims.media_type = "VIDEO"
    except Exception:
        pass
    ims.file_format = "FFMPEG"
    return sc


def set_ff(sc, fmt, codec, audio):
    ff = sc.render.ffmpeg
    ff.format = fmt
    ff.codec = codec
    for k, v in (("constant_rate_factor", "MEDIUM"), ("ffmpeg_preset", "GOOD")):
        try:
            setattr(ff, k, v)
        except Exception as e:
            print("skip", k, e)
    ff.gopsize = 12
    ff.audio_codec = audio
    if audio != "NONE":
        ff.audio_channels = "STEREO"
        ff.audio_mixrate = 48000
        ff.audio_bitrate = 128


def render_movie(sc, path):
    sc.render.filepath = path
    with bpy.context.temp_override(scene=sc):
        bpy.ops.render.render(animation=True, scene=sc.name)
    print("WROTE", path, os.path.exists(path))


def film(tag, w, h):
    d = write_frames(tag, w, h)
    sc = fresh_scene("film_" + tag)
    sc.render.resolution_x, sc.render.resolution_y = w, h
    se = sc.sequence_editor_create()
    st = strips_of(se).new_image(name="frames", filepath=os.path.join(d, "f_0001.png"), channel=1, frame_start=1)
    for f in range(2, N + 1):
        st.elements.append("f_%04d.png" % f)
    set_ff(sc, "MPEG4", "H264", "NONE")
    render_movie(sc, os.path.join(HERE, "film-%s.mp4" % tag))


def write_wav(path):
    sr = 48000
    n = int(sr * DUR)
    t = np.arange(n, dtype=np.float64) / sr
    env = np.clip(t / 1.2, 0, 1) * np.clip((DUR - t) / 2.1, 0, 1)
    b = CUES["breath"]
    swell = 0.75 + 0.25 * np.interp(t, [0, b["inhale"][0], b["inhale"][1], b["exhale"][0], b["exhale"][1], DUR], [0, 0, 1, 1, 0, 0])
    sig = (np.sin(2 * np.pi * 220 * t) + 0.6 * np.sin(2 * np.pi * 329.63 * t) + 0.35 * np.sin(2 * np.pi * 554.37 * t))
    sig *= 0.12 * env * swell
    # a soft tick at every whole second, to make drift audible when listening
    for s in range(1, int(DUR)):
        i0 = s * sr
        k = np.arange(int(0.03 * sr))
        sig[i0:i0 + len(k)] += 0.08 * np.sin(2 * np.pi * 1760 * k / sr) * np.exp(-k / (0.006 * sr))
    pcm = (np.clip(sig, -1, 1) * 32767).astype(np.int16)
    st = np.repeat(pcm[:, None], 2, axis=1).ravel()
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(st.tobytes())


def sound(fmt, vcodec, acodec, name):
    wav = os.path.join(FRAMES, "pad-%gs.wav" % DUR)
    if not os.path.exists(wav):
        write_wav(wav)
    sc = fresh_scene("snd_" + name)
    sc.render.resolution_x, sc.render.resolution_y = 64, 64
    se = sc.sequence_editor_create()
    strips_of(se).new_sound(name="pad", filepath=wav, channel=1, frame_start=1)
    # a plain colour strip so the sequencer has a picture to render (no camera needed)
    try:
        col = strips_of(se).new_effect(name="ground", type="COLOR", channel=2, frame_start=1, length=N)
    except TypeError:
        col = strips_of(se).new_effect(name="ground", type="COLOR", channel=2, frame_start=1, frame_end=N + 1)
    col.color = (0.98, 0.96, 0.93)
    set_ff(sc, fmt, vcodec, acodec)
    render_movie(sc, os.path.join(HERE, name))


which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["all"]
if which[0] == "look":
    # -- look wide 1,80,191,240,312 : a few frames as PNG in frames/look-*, to look at before rendering everything
    tag, fs = which[1], [int(v) for v in which[2].split(",")]
    w, h = (1600, 900) if tag == "wide" else (900, 900)
    fr = Frames(tag, w, h)
    img = bpy.data.images.new("look", w, h, alpha=False)
    for f in fs:
        img.pixels.foreach_set(fr.pixels(f))
        img.filepath_raw = os.path.join(FRAMES, "look-%s-%04d.png" % (tag, f))
        img.file_format = "PNG"
        img.save()
    which = []
if "all" in which or "wide" in which:
    film("wide", 1600, 900)
if "all" in which or "square" in which:
    film("square", 900, 900)
if "all" in which or "sound" in which:
    sound("WEBM", "WEBM", "OPUS", "golden-pause.webm")
    sound("MPEG4", "H264", "AAC", "golden-pause.m4a")
print("DONE")
