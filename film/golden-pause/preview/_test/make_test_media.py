# Throwaway test media for the Golden Pause preview player (NOT the film).
# Run: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python make_test_media.py
# Makes, next to this script:
#   film-wide.mp4 (1600x900), film-square.mp4 (900x900): 12 s, 24 fps, H264, no audio.
#     A slowly drifting warm gradient (dark honey to parchment) with a progress bar along the bottom
#     and one dot per elapsed whole second in the top-left, so screenshots show the video clock.
#   poster-*.jpg (frame 1), still-*.jpg and end-*.jpg (both the last frame; the real still is the cup, the real end the plate)
#   golden-pause.webm (Opus) and golden-pause.m4a (AAC): a soft 12 s pad, for testing the sound path.
import bpy, os, math, wave, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 24
N = 288  # 12 s
FRAMES = os.path.join(HERE, "frames")
os.makedirs(FRAMES, exist_ok=True)

PARCH = np.array([251, 247, 238], np.float32) / 255
HONEY_L = np.array([232, 190, 103], np.float32) / 255
HONEY = np.array([217, 164, 65], np.float32) / 255
AMBER = np.array([185, 130, 62], np.float32) / 255
DARK = np.array([110, 62, 14], np.float32) / 255


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def frame_pixels(w, h, f):
    t = (f - 1) / FPS
    # Blender image rows start at the bottom: build top-down, then flip.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    x = xx / w
    y = yy / h
    phase = t / 12.0
    # diagonal bands that drift slowly
    d = (x * 0.75 + y * 0.6 + phase * 0.9) % 1.0
    band = 0.5 - 0.5 * np.cos(2 * math.pi * d)
    # a soft moving glow
    gx, gy = 0.3 + 0.4 * phase, 0.45 + 0.1 * math.sin(phase * math.pi * 2)
    glow = np.exp(-(((x - gx) * (w / h)) ** 2 + (y - gy) ** 2) / 0.08)
    col = (DARK[None, None, :] * (1 - band[..., None]) + HONEY[None, None, :] * band[..., None])
    col = col * (1 - 0.6 * glow[..., None]) + HONEY_L[None, None, :] * (0.6 * glow[..., None])
    # the welcome plate: fade to parchment from 9.6 s to 10.6 s
    k = float(smooth(np.float32((t - 9.6) / 1.0)))
    col = col * (1 - k) + PARCH[None, None, :] * k
    # progress bar (bottom 1%) and whole-second dots (top-left)
    bar_h = max(4, h // 100)
    col[h - bar_h:, : int(w * min(1.0, t / 12.0)), :] = np.array([0.15, 0.1, 0.05], np.float32)
    secs = int(math.floor(t + 1e-6))
    r = max(5, h // 90)
    for i in range(secs):
        cx, cy = 3 * r + i * 3 * r, 3 * r
        col[cy - r: cy + r, cx - r: cx + r, :] = np.array([0.98, 0.97, 0.93], np.float32)
    col = col[::-1, :, :]
    rgba = np.concatenate([col, np.ones((h, w, 1), np.float32)], axis=2)
    return rgba.ravel()


def write_frames(tag, w, h):
    d = os.path.join(FRAMES, tag)
    os.makedirs(d, exist_ok=True)
    img = bpy.data.images.new("gp_" + tag, w, h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    for f in range(1, N + 1):
        img.pixels.foreach_set(frame_pixels(w, h, f))
        img.filepath_raw = os.path.join(d, "f_%04d.png" % f)
        img.file_format = "PNG"
        img.save()
        if f == 1 or f == N:
            for name in (["poster-%s.jpg"] if f == 1 else ["still-%s.jpg", "end-%s.jpg"]):
                jp = bpy.data.images.new("j", w, h, alpha=False)
                jp.pixels.foreach_set(frame_pixels(w, h, f))
                jp.filepath_raw = os.path.join(HERE, name % tag)
                jp.file_format = "JPEG"
                jp.save()
                bpy.data.images.remove(jp)
    bpy.data.images.remove(img)
    return d


def strips_of(se):
    return getattr(se, "strips", None) if hasattr(se, "strips") else se.sequences


def fresh_scene(name):
    sc = bpy.data.scenes.new(name)
    bpy.context.window_manager  # noqa
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
    n = sr * 12
    t = np.arange(n, dtype=np.float64) / sr
    env = np.clip(t / 1.2, 0, 1) * np.clip((12.0 - t) / 2.1, 0, 1)
    swell = 0.75 + 0.25 * np.interp(t, [0, 0.3, 3.0, 3.2, 8.0, 12], [0, 0, 1, 1, 0, 0])
    sig = (np.sin(2 * np.pi * 220 * t) + 0.6 * np.sin(2 * np.pi * 329.63 * t) + 0.35 * np.sin(2 * np.pi * 554.37 * t))
    sig *= 0.12 * env * swell
    # a soft tick at every whole second, to make drift audible when listening
    for s in range(1, 12):
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
    wav = os.path.join(FRAMES, "pad.wav")
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
if "all" in which or "wide" in which:
    film("wide", 1600, 900)
if "all" in which or "square" in which:
    film("square", 900, 900)
if "all" in which or "sound" in which:
    sound("WEBM", "WEBM", "OPUS", "golden-pause.webm")
    sound("MPEG4", "H264", "AAC", "golden-pause.m4a")
print("DONE")
