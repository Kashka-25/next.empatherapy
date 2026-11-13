# -*- coding: utf-8 -*-
"""
THE GOLDEN PAUSE v2 - soundscape (13.0 s), synthesised entirely in code
=======================================================================

An original, understated sound bed for the Empatherapy opening film (v2: a honey drop gathers on the
dipper, lands on the "t", the honey writes the name, lets go, melts, and drops feed the teacup). No
samples, no downloads: every sound below is made from sine partials and spectrally shaped noise with
numpy, from a fixed random seed, so the same file comes out every run.

Run (Blender's bundled Python has numpy and bpy; bpy is only used for the web encodes):

    "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b --factory-startup --python sound.py
    ... --python sound.py -- --no-encode      (skip the m4a / webm encodes)
    ... --python sound.py -- --no-png         (skip the spectrogram)

The clock is cues.json (version 2; read at run time, never edited here). Every timed event is
derived from it and checked against it at start-up (mismatches are printed as [cues] WARNING):

    0.30         wood     very faint wooden touch of the dipper (breath.inhale start)
    0.30 - 3.00  pad      the bed swells over the in-breath while the drop gathers (breath.inhale)
    3.20         settle   soft, warm, rounded low touch as the honey lands (audio.contact)
    3.20 - 7.00  flow     slow, sweet, flowing honey texture while the name is written (write),
                          spreading outward from the centre as the letters run left and right;
                 glass    three sparse, quiet glass notes inside the writing window
    7.00 - 7.40  flow     the texture thins with the stream (letGo.thin)
    7.40         letgo    tiny soft release as the stream lets go (audio.letGo)
    8.20 - 10.6  pad/air  the bed opens up and brightens a little (melt start .. tilt end)
    9.90 - 10.3  drops    four soft, rounded, low-mid honey-drop touches into the cup
                          (feed.fill start .. feed.drops end, around audio.feed)
    10.80        resolve  the resolving warm chord as the cup fills (audio.resolve) + the last glass note
    13.00        end      raised-cosine fade reaches exactly zero (audio.fadeOutEnd = duration)

Musical idea
------------
One soft, open D-major colour that breathes, moves once, opens, and comes home:

    0.0 - 5.0    I     Dadd9   (D3 A3 E4 F#4 over a soft D2)       breathe in, the drop lands, writing begins
    5.0 - 6.4    moves (equal-power crossfade, no glides)
    6.4 - 10.4   IV/I  G/D     (D3 B3 D4 G4 over the same D2)       writing ends, let go, melt
    8.2 - 10.0         an open upper voice B4 fades in and the harmonics brighten: the bed opens up
    10.4 - 11.4  I     D       (D3 A3 D4 F#4, open voice B4 -> A4) as the resolve lands: a plagal "amen"

Layers (restraint over spectacle)
---------------------------------
1. PAD (music bed). Each upper chord tone = 3 slightly detuned copies (about -4, 0, +4.6 cents;
   +/-3 cents for A3/B3; slow random drift of about 1.5 cents) of a soft additive tone (up to 7
   harmonics, 1/k^1.25 times brightness^(k-1)), placed gently left / centre / right (equal power,
   never hard panned). D2 and D3 are single centred oscillators so slow beating cannot dent the
   breath swell. Level and brightness follow the cues: rising over the inhale, holding through the
   turn, easing through the out-breath, opening again (level +2 dB, brighter, open voice) through
   the melt and tilt, then handing over to the resolve. Brightness is the gentle low-pass.
2. GLASS NOTES. A5 -> F#5 -> E5 at write start + 0.75 / 1.95 / 3.10 s, and D5 with the resolve:
   a slow descending 5-3-2-1 that only completes when the cup is full. Additive partials 1, 2, 2.76,
   4, 5.4 (upper ones decay faster) plus a twin fundamental 0.9 Hz above for a slow glassy shimmer.
   35-40 ms raised-sine attack: no strike transient.
3. FLOW (the honey writing). A viscous low-mid noise body (log-Gaussian band ~420-460 Hz, two
   slowly drifting formants, one moving at about letter-stroke rate, 1.4 Hz) plus a "sweet" sheen:
   very narrow noise resonances (a few Hz wide, so each wavers slowly like a held, breathy glass
   tone) on the chord tones (A4 D5 F#5, then B4 D5 G5 with the chord move), 5 dB under the body.
   Each is two independent sources that start in the centre (the "t") and drift outward left and
   right as the name is written (pan +/-0.08 -> +/-0.50, sheen a little wider; the flow's L/R
   correlation falls from 0.99 to about 0.7). Through letGo.thin the band rises and narrows and the
   level falls (a thinning stream); it is gone by letGo.settle.
4. EVENTS (all with raised-sine attacks, no transients). Tuned events never sit on a note the
   bed is holding at that moment: there they are masked, or they cancel the bed (both happened).
   - WOOD at 0.3 s: an extremely faint brush of noise through four narrow wooden body modes
     (185/420/760/1180 Hz), 70 ms rise, ~0.3 s fall.
   - SETTLE at audio.contact: one warm, rounded low touch, made as a bloom of the bed's own D2 and
     D3 oscillators (same phases and drift), so it always adds to the bed and never digs a hole in
     it. 90 ms attack, ~0.85 s decay; its harmonics (147/220/294 Hz, which phone speakers carry)
     start brighter and close as it fades, so it rounds off. Plus a low-mid noise bloom around
     220 Hz, 14 dB under the tone. No pitch movement: never a cartoon bloop.
   - LETGO at audio.letGo: a tiny soft release. A quiet B4 (the bed is not holding it; it becomes
     the open voice of the melt) with 25 ms attack and 0.45 s decay, relaxing 8 cents downward, plus
     a breathy noise puff around 750 Hz.
   - DROPS: four honey drops (A3, E4, A3, G3; 196-330 Hz, notes the bed is not holding there; the
     G3 resolves down to the F#3 of the resolve chord), 14 ms attack, ~0.15 s decay, a 22-cent
     downward settle in the first 35 ms, a little low noise body (~260 Hz) for the liquid touch.
     Irregular, slowing spacing (90 / 120 / 150 ms). Low-mid and soft: never plinky.
5. AIR: very low room tone (pinkish noise, 50 Hz - 2.2 kHz, wide but mono-safe), breathing by
   about +/-1.3 dB with the breath cues, a touch brighter and fuller when the bed opens.
6. RESOLVE at audio.resolve: a gentle chord landing - D2, A2, D3 (low D, fifth, octave) with a
   little F#3/A3 for warmth, harmonic partials whose upper partials fade first, 0.45 s attack,
   decaying to the end; plus the D5 glass note above it.

Shared space: one synthetic stereo room (two independent noise impulse responses, 3.2 s, RT60
~2.4 s in the lows falling to ~0.8 s by 10 kHz, 18 ms pre-delay). Independent left and right tails
give the stereo width; the dry signal itself is only gently spread.

Mix by loudness: each stem is set so that its loudest moment (BS.1770 momentary, 400 ms) sits a
fixed number of LU below the pad's loudest moment (STEM_LU below). Then the whole mix is normalised
to -20 LUFS integrated with true peak at or below -1 dBTP.

Master: 0.4 s raised-cosine fade-in; raised-cosine fade-out over the last 1.8 s reaching exactly
zero at audio.fadeOutEnd (13.0 s). First and last samples are exactly 0. Exactly 13.000 s.

Measurement (printed every run)
-------------------------------
- Integrated loudness: ITU-R BS.1770-4 K-weighting (pre-filter high shelf + RLB high-pass, the
  published 48 kHz biquad coefficients) applied as the exact IIR frequency response in the FFT
  domain, cross-checked with a sample-by-sample direct-form biquad. Gating is the full BS.1770-4
  scheme (400 ms blocks, 75 % overlap, -70 LUFS absolute gate, -10 LU relative gate). Self-tests:
  EBU Tech 3341 style 1 kHz sine at -23 dBFS stereo must read -23.0 LUFS.
- Loudness range (EBU Tech 3342: 3 s short-term, -70 / -20 LU gates, 10th to 95th percentile).
- True peak: 4x band-limited oversampling (FFT zero-padding), self-tested on an fs/4 sine.
- Each event against everything else at that moment, as loudness and in the event's own band
  just after its onset (so masking shows up as a number); the contact touch against the bed in
  narrow bands at 73/147/220/294 Hz (it must not cancel the bed); stereo correlation, mono-fold
  loudness change, DC offset, high-frequency share, a click scan (sudden >5 kHz energy jumps),
  and the steepest rise between consecutive 40 ms windows.

Outputs (folder work-audio/ next to this file)
----------------------------------------------
golden-pause.wav   48 kHz, stereo, 24-bit PCM master, 624000 frames (13.000 s)
golden-pause.m4a   AAC-LC ~128 kbps in MP4 (Blender FFmpeg), moov moved to the front for web
golden-pause.webm  Opus ~96 kbps in WebM (Blender FFmpeg)
spectrogram.png    log-frequency spectrogram of the full mix with the v2 phases, cue marks and a
                   momentary-loudness strip, for visual sanity checks

Nothing here can judge how it actually sounds: a person must approve it by ear on a phone
speaker, a laptop and headphones.
"""

import hashlib
import json
import math
import os
import struct
import sys
import time
import wave
import zlib

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

SEED = 20261111
SR = 48000


def _script_dir():
    f = globals().get("__file__")
    if f:
        return os.path.dirname(os.path.abspath(f))
    if "--python" in sys.argv:
        return os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("--python") + 1]))
    return os.getcwd()


HERE = _script_dir()
OUT_DIR = os.path.join(HERE, "work-audio")
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

with open(os.path.join(HERE, "cues.json"), encoding="utf-8") as fh:
    CUES = json.load(fh)


def _pair(v):
    return (float(v[0]), float(v[1]))


DUR = float(CUES["duration"])
N = int(round(DUR * SR))
T = np.arange(N) / SR
AUDIO = CUES["audio"]
INHALE = _pair(CUES["breath"]["inhale"])
EXHALE = _pair(CUES["breath"]["exhale"])
GATHER = _pair(CUES["drop"]["gather"])
FALL = _pair(CUES["drop"]["fall"])
WRITE = _pair(CUES["write"])
THIN = _pair(CUES["letGo"]["thin"])
LETGO_SETTLE = float(CUES["letGo"]["settle"])
GLINT = _pair(CUES["glint"])
MELT = _pair(CUES["melt"])
TILT = _pair(CUES["tilt"])
DROPS = _pair(CUES["feed"]["drops"])
FILL = _pair(CUES["feed"]["fill"])
RIM = _pair(CUES["feed"]["rimDrip"])
STEAM = _pair(CUES["feed"]["steam"])
SETTLE = float(CUES["settle"])
CONTACT = float(AUDIO["contact"])
LET_GO = float(AUDIO["letGo"])
FEED = float(AUDIO["feed"])
RESOLVE = float(AUDIO["resolve"])
FADE_END = float(AUDIO["fadeOutEnd"])
TEXT = {d["id"]: d for d in CUES["text"]}
WELCOME = CUES["welcome"]

WOOD_T = INHALE[0]                                   # the dipper's faint touch, as the breath begins
MOVE = (WRITE[0] + 1.8, WRITE[0] + 3.2)              # I -> IV/I chord move, inside the writing
OPEN_PEAK = MELT[0] + 0.75 * (TILT[1] - MELT[0])     # the bed is fully open here, held to tilt end
DROP_WIN = (max(FILL[0], DROPS[0]), DROPS[1])        # honey drops land in the cup: 9.9 - 10.3 s
DROP_FRACS = (0.05, 0.275, 0.575, 0.95)              # slowing spacing inside DROP_WIN

FADE_IN = 0.4            # s, master fade-in
FADE_OUT_LEN = 1.8       # s, master fade-out ends exactly at FADE_END
TARGET_LUFS = -20.0
PEAK_CEILING_DBTP = -1.0

# Loudest momentary loudness of each stem, in LU relative to the pad's loudest moment.
STEM_LU = {
    "pad": 0.0,
    "resolve": -3.0,
    "settle": -7.0,
    "glass": -11.0,
    "flow": -13.0,
    "drops": -13.5,
    "letgo": -16.0,
    "wood": -22.0,
    "air": -26.0,
}
# Send level of each stem into the shared room (the room IR has unit energy).
REVERB_SEND = {"pad": 0.30, "resolve": 0.30, "settle": 0.18, "glass": 0.55, "flow": 0.12,
               "drops": 0.28, "letgo": 0.35, "wood": 0.35, "air": 0.0}


# Note frequencies (equal temperament, A4 = 440 Hz)
def note(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3,
             "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2.0 ** ((names[pitch] + 12 * (octave - 4)) / 12.0)


def check_cues():
    """Everything this file assumes about cues.json, as plain warnings (the cue file is never edited)."""
    w = []

    def same(a, b, what):
        if abs(float(a) - float(b)) > 1e-6:
            w.append("%s: %.3f vs %.3f" % (what, float(a), float(b)))

    if int(CUES.get("version", 1)) != 2:
        w.append("cues.json version is %r, this sound is written for version 2" % CUES.get("version"))
    same(CONTACT, CUES["contact"], "audio.contact vs contact")
    same(CONTACT, CUES["drop"]["land"], "audio.contact vs drop.land")
    same(CONTACT, WRITE[0], "audio.contact vs write start")
    same(LET_GO, CUES["letGo"]["break"], "audio.letGo vs letGo.break")
    same(LET_GO, THIN[1], "audio.letGo vs letGo.thin end")
    same(FADE_END, DUR, "audio.fadeOutEnd vs duration")
    same(RESOLVE, FILL[1], "audio.resolve vs feed.fill end")
    if not DROP_WIN[0] <= FEED <= DROP_WIN[1]:
        w.append("audio.feed %.2f is outside the drop window %.2f-%.2f" % (FEED, *DROP_WIN))
    if not (INHALE[0] < INHALE[1] <= EXHALE[0] < EXHALE[1]):
        w.append("breath windows out of order: inhale %s exhale %s" % (INHALE, EXHALE))
    if not (WRITE[1] <= THIN[0] < THIN[1] <= LETGO_SETTLE <= MELT[0] < OPEN_PEAK <= TILT[1] < RESOLVE):
        w.append("story order broken: write %s thin %s settle %.2f melt %s tilt %s resolve %.2f"
                 % (WRITE, THIN, LETGO_SETTLE, MELT, TILT, RESOLVE))
    if not (RESOLVE < FADE_END - FADE_OUT_LEN < SETTLE < DUR):
        w.append("resolve %.2f / fade-out start %.2f / settle %.2f / duration %.2f out of order"
                 % (RESOLVE, FADE_END - FADE_OUT_LEN, SETTLE, DUR))
    return w


# ----------------------------------------------------------------------------- helpers

def rng_for(name):
    """Independent, order-proof deterministic generator per sound element."""
    return np.random.default_rng([SEED, zlib.crc32(name.encode("utf-8"))])


def env_pts(t, pts):
    """Piecewise envelope through (time, value) points, raised-cosine between points."""
    t = np.asarray(t, dtype=float)
    xs = np.array([p[0] for p in pts], dtype=float)
    ys = np.array([p[1] for p in pts], dtype=float)
    out = np.full(t.shape, ys[0])
    for i in range(len(xs) - 1):
        x0, x1, y0, y1 = xs[i], xs[i + 1], ys[i], ys[i + 1]
        if x1 <= x0:
            continue
        m = (t >= x0) & (t < x1)
        u = (t[m] - x0) / (x1 - x0)
        out[m] = y0 + (y1 - y0) * (0.5 - 0.5 * np.cos(np.pi * u))
    out[t >= xs[-1]] = ys[-1]
    return out


def ramp(t, t0, t1):
    u = np.clip((np.asarray(t, dtype=float) - t0) / (t1 - t0), 0.0, 1.0)
    return 0.5 - 0.5 * np.cos(np.pi * u)


def soft_attack(x, a):
    """0 before the onset, sin^2 rise over a seconds (zero slope at both ends), then 1."""
    u = np.clip(np.asarray(x, dtype=float) / a, 0.0, 1.0)
    return np.sin(0.5 * np.pi * u) ** 2


def smooth_noise(t, rate, rng):
    """Smooth random control signal (Catmull-Rom through normal knots every 1/rate s)."""
    t = np.asarray(t, dtype=float)
    step = 1.0 / rate
    k0 = math.floor(t.min() / step) - 2
    k1 = math.ceil(t.max() / step) + 3
    knots = rng.standard_normal(k1 - k0 + 1)
    u = t / step - k0
    i = np.floor(u).astype(np.int64)
    f = u - i
    p0, p1, p2, p3 = knots[i - 1], knots[i], knots[i + 1], knots[i + 2]
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f ** 2
                  + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3)


def pan_gains(p):
    """Equal-power pan, p in [-1, 1] (scalar or array); centre gives 1.0 on both sides."""
    a = (np.asarray(p, dtype=float) + 1.0) * np.pi / 4.0
    gl, gr = np.cos(a) * math.sqrt(2.0), np.sin(a) * math.sqrt(2.0)
    return (float(gl), float(gr)) if gl.ndim == 0 else (gl, gr)


def phase_of(freq):
    return 2.0 * np.pi * np.cumsum(freq) / SR


def lognorm(f, fc, sd_oct):
    """Log-Gaussian band (sd in octaves)."""
    return np.exp(-0.5 * (np.log2(np.maximum(f, 1.0) / fc) / sd_oct) ** 2)


def rms(x):
    return float(np.sqrt(np.mean(np.asarray(x, dtype=float) ** 2)))


def shaped_noise(mag_fn, rng, n=N, t_off=0.0, nfft=2048):
    """Noise with a time-varying magnitude spectrum mag_fn(f, t), by random-phase
    overlap-add (periodic Hann, 75 % overlap). For a flat magnitude M the RMS is M."""
    hop = nfft // 4
    win = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(nfft) / nfft)
    nfr = (n + nfft) // hop + 1
    starts = np.arange(nfr) * hop - nfft
    tf = t_off + (starts + nfft / 2.0) / SR
    f = np.fft.rfftfreq(nfft, 1.0 / SR)
    M = np.broadcast_to(np.asarray(mag_fn(f[None, :], tf[:, None]), dtype=float),
                        (nfr, f.size)).copy()
    M[:, 0] = 0.0
    M[:, f < 18.0] = 0.0
    ph = rng.uniform(0.0, 2.0 * np.pi, M.shape)
    frames = np.fft.irfft(M * np.exp(1j * ph), n=nfft, axis=1) * win * math.sqrt(nfft / 1.5)
    out = np.zeros(nfr * hop + 2 * nfft)
    for p in range(4):
        blk = frames[p::4].reshape(-1)
        out[p * hop:p * hop + blk.size] += blk
    return out[nfft:nfft + n]


def stereo_noise(mag_fn, name, width, n=N, t_off=0.0, nfft=2048):
    """Mid/side pair of independent shaped noises: L = M + w*S, R = M - w*S."""
    mid = shaped_noise(mag_fn, rng_for(name + ":mid"), n, t_off, nfft)
    side = shaped_noise(mag_fn, rng_for(name + ":side"), n, t_off, nfft)
    return np.stack([mid + width * side, mid - width * side], axis=1)


def outward_noise(mag_fn, name, spread, nfft=2048):
    """Two independent noises that start together in the centre and drift apart, one to the
    left and one to the right (equal-power pans -spread(t) / +spread(t)): honey running outward
    from the "t". Same loudness whatever the spread."""
    a = shaped_noise(mag_fn, rng_for(name + ":left"), N, 0.0, nfft)
    b = shaped_noise(mag_fn, rng_for(name + ":right"), N, 0.0, nfft)
    la, ra = pan_gains(-spread)
    lb, rb = pan_gains(spread)
    return np.stack([la * a + lb * b, ra * a + rb * b], axis=1) / math.sqrt(2.0)


# ----------------------------------------------------------------------------- layers

def pad_tone(name, f0, weight, bright, nparts=7, fmax=4500.0,
             detune=(-4.0, 0.3, 4.6), pans=(-0.32, 0.04, 0.30), copy_w=(0.6, 1.0, 0.6)):
    rng = rng_for("pad:" + name)
    out = np.zeros((N, 2))
    shimmer = 1.0 + 0.05 * smooth_noise(T, 0.18, rng)
    bpow = [np.ones(N)]
    for _ in range(1, nparts):
        bpow.append(bpow[-1] * bright)
    for cents, pan, cw in zip(detune, pans, copy_w):
        drift = 1.6 * smooth_noise(T, 0.22, rng)
        base = phase_of(f0 * 2.0 ** ((cents + drift) / 1200.0))
        ph0 = rng.uniform(0.0, 2.0 * np.pi, nparts)
        s = np.zeros(N)
        for k in range(1, nparts + 1):
            if k * f0 > fmax:
                break
            s += (k ** -1.25) * bpow[k - 1] * np.sin(k * base + ph0[k - 1])
        gl, gr = pan_gains(pan)
        out[:, 0] += cw * gl * s
        out[:, 1] += cw * gr * s
    out *= (np.asarray(weight) * shimmer / math.sqrt(sum(w * w for w in copy_w)))[:, None]
    return out


def chord_move(t):
    return ramp(t, MOVE[0], MOVE[1])


def opening(t):
    """0 until the melt starts, rising to 1 at OPEN_PEAK, then held (the bed has opened)."""
    return env_pts(t, [(0.0, 0.0), (MELT[0], 0.0), (OPEN_PEAK, 1.0)])


def pad_brightness():
    return env_pts(T, [(0.0, 0.20), (INHALE[0], 0.20), (INHALE[1], 0.42), (EXHALE[0], 0.42),
                       (EXHALE[1], 0.24), (MELT[0], 0.24), (OPEN_PEAK, 0.36), (TILT[1], 0.36),
                       (RESOLVE + 0.6, 0.28), (DUR, 0.18)])


# Low pad voices: single centred oscillators (shared with the settle, which must stay in phase).
SINGLE = dict(detune=(0.0,), pans=(0.0,), copy_w=(1.0,))


def make_pad():
    level = env_pts(T, [(0.0, 0.40), (INHALE[0], 0.40), (INHALE[1], 1.0), (EXHALE[0], 1.0),
                        (EXHALE[1], 0.46), (MELT[0], 0.46), (OPEN_PEAK, 0.60), (TILT[1], 0.58),
                        (RESOLVE + 1.2, 0.34), (DUR, 0.18)])
    bright = pad_brightness()
    bass_w = env_pts(T, [(0.0, 0.35), (INHALE[0], 0.35), (INHALE[1], 1.0), (EXHALE[0], 1.0),
                         (EXHALE[1], 0.62), (DUR, 0.50)])
    x1 = chord_move(T)                             # I -> IV/I while the name is written
    x2 = ramp(T, RESOLVE - 0.4, RESOLVE + 0.6)     # IV/I -> I as the resolve lands
    xa = x1 - x2
    op = opening(T)
    co = lambda x: np.cos(0.5 * np.pi * x)         # equal-power crossfade weights
    si = lambda x: np.sin(0.5 * np.pi * x)
    # Low voices are single oscillators: detuned copies down there beat slowly (0.3-0.7 Hz)
    # and would put dips into the breath swell. Width comes from the upper voices and the room.
    mid = dict(detune=(-3.0, 0.2, 3.3), pans=(-0.30, 0.03, 0.28), copy_w=(0.55, 1.0, 0.55))
    wide = dict(detune=(-4.5, 0.3, 5.0), pans=(-0.44, 0.02, 0.42), copy_w=(0.7, 1.0, 0.7))
    voices = [
        ("D2", 0.50 * bass_w, 6, SINGLE),
        ("D3", 0.80 * np.ones(N), 7, SINGLE),
        ("A3", 0.70 * co(xa), 7, mid),
        ("B3", 0.66 * si(xa), 7, mid),
        ("E4", 0.50 * co(x1), 7, {}),
        ("D4", 0.52 * si(x1), 7, {}),
        ("F#4", 0.50 * co(xa), 7, {}),
        ("G4", 0.48 * si(xa), 7, {}),
        ("B4", 0.30 * op * co(x2), 6, wide),       # the open voice, 6 of IV ...
        ("A4", 0.30 * op * si(x2), 6, wide),       # ... stepping down to 5 of I at the resolve
    ]
    out = np.zeros((N, 2))
    for nm, w, nparts, kw in voices:
        out += pad_tone(nm, note(nm), w, bright, nparts=nparts, **kw)
    return out * level[:, None]


GLASS_PARTIALS = [  # (ratio, amplitude, decay scale)
    (1.00, 1.000, 1.00),
    (2.00, 0.200, 0.55),
    (2.76, 0.055, 0.32),
    (4.00, 0.030, 0.22),
    (5.40, 0.012, 0.14),
]


def glass_note(t0, f0, amp, pan, tau, attack, name):
    rng = rng_for("glass:" + name)
    i0 = int(math.floor(t0 * SR))
    seg = T[i0:] - t0
    s = np.zeros(seg.size)
    for ratio, a, ts in GLASS_PARTIALS:
        if f0 * ratio > 6000.0:
            continue
        s += a * np.sin(2 * np.pi * f0 * ratio * seg + rng.uniform(0, 2 * np.pi)) \
            * np.exp(-np.maximum(seg, 0) / (tau * ts))
    s += 0.32 * np.sin(2 * np.pi * (f0 + 0.9) * seg + rng.uniform(0, 2 * np.pi)) \
        * np.exp(-np.maximum(seg, 0) / (tau * 0.9))
    s *= soft_attack(seg, attack) * amp
    out = np.zeros((N, 2))
    gl, gr = pan_gains(pan)
    out[i0:, 0] = gl * s
    out[i0:, 1] = gr * s
    return out


def glass_times():
    w0 = WRITE[0]
    return [(w0 + 0.75, "A5", 1.00, -0.20, 2.6, 0.035),
            (w0 + 1.95, "F#5", 0.85, 0.16, 2.6, 0.035),
            (w0 + 3.10, "E5", 0.75, -0.06, 2.6, 0.035),
            (RESOLVE, "D5", 0.90, 0.05, 3.0, 0.040)]


def make_glass():
    out = np.zeros((N, 2))
    for t0, nm, amp, pan, tau, att in glass_times():
        out += glass_note(t0, note(nm), amp, pan, tau, att, nm)
    return out


SHEEN_DB = 5.0   # sweet sheen, dB under the viscous body (by RMS)


def make_flow():
    """The honey writing the name: viscous body + sweet sheen, spreading outward from the 't'."""
    w0, w1 = WRITE
    th0, th1 = THIN
    r = rng_for("flow:formants")
    tgrid = np.linspace(-1.0, DUR + 1.0, 4000)
    n1g = smooth_noise(tgrid, 1.4, r)        # about letter-stroke rate
    n2g = smooth_noise(tgrid, 0.6, r)
    fc_pts = [(0.0, 420.0), (w0, 420.0), (w0 + 1.2, 460.0), (th0, 460.0), (th1, 620.0)]
    sd_pts = [(0.0, 0.60), (th0, 0.60), (th1, 0.42)]

    def body_mag(f, tf):
        fc = env_pts(tf, fc_pts)
        sd = env_pts(tf, sd_pts)
        n1 = np.interp(tf, tgrid, n1g)
        n2 = np.interp(tf, tgrid, n2g)
        body = lognorm(f, fc, sd)
        form1 = 0.55 * lognorm(f, fc * (1.0 + 0.13 * n1), 0.20)
        form2 = 0.25 * lognorm(f, fc * 2.2 * (1.0 + 0.10 * n2), 0.24)
        low = 0.15 * lognorm(f, 180.0, 0.45)
        tilt = 1.0 / (1.0 + (f / 2000.0) ** 2)
        hp = 1.0 / np.sqrt(1.0 + (90.0 / np.maximum(f, 1.0)) ** 4)
        return (body + form1 + form2 + low) * tilt * hp

    tones_i = [("A4", 1.0), ("D5", 0.8), ("F#5", 0.6)]
    tones_iv = [("B4", 1.0), ("D5", 0.8), ("G5", 0.55)]

    def sheen_mag(f, tf):
        x = chord_move(tf)
        m = 0.0
        for nm, wv in tones_i:
            m = m + wv * np.cos(0.5 * np.pi * x) * lognorm(f, note(nm), 0.005)
        for nm, wv in tones_iv:
            m = m + wv * np.sin(0.5 * np.pi * x) * lognorm(f, note(nm), 0.005)
        return m

    spread = 0.08 + 0.42 * ramp(T, w0, w1)
    body = outward_noise(body_mag, "flow:body", spread, nfft=2048)
    # Very narrow bands (a few Hz) on long frames: each sheen tone wavers slowly (about every
    # 0.3-0.6 s) like a held, breathy glass tone, instead of fluttering.
    sheen = outward_noise(sheen_mag, "flow:sheen", np.minimum(spread + 0.10, 0.62), nfft=65536)
    live = (T > w0 + 0.5) & (T < th0)
    body /= rms(body[live])
    sheen /= rms(sheen[live])
    swell = 1.0 + 0.16 * smooth_noise(T, 0.8, rng_for("flow:swell"))
    env = env_pts(T, [(0.0, 0.0), (w0, 0.0), (w0 + 0.9, 1.0), (w1 - 0.5, 0.85), (th0, 0.80),
                      (th1, 0.40), (LET_GO + 0.06, 0.32), (LETGO_SETTLE, 0.0)])
    return (body + 10.0 ** (-SHEEN_DB / 20.0) * sheen) * (env * swell)[:, None]


def make_settle():
    """audio.contact: the honey lands on the 't'. Warm, rounded, low.

    The touch is a bloom of the bed's own low D2 and D3 voices: the same oscillators (same
    random phases and drift, via the same rng names), so every partial adds in phase with the
    pad instead of beating against it. A separate D2 tone at the pad's pitch would sit at a
    fixed random phase to the pad's D2/D3 and could cancel them (it did: a 1 s hole at 147 Hz).
    Its own brightness starts higher (147/220/294 Hz carry it on phone speakers) and closes as
    it decays, so it rounds off. Plus a soft low-mid noise bloom around 220 Hz for the contact."""
    seg = T - CONTACT
    segp = np.maximum(seg, 0.0)
    touch = soft_attack(seg, 0.09) * np.exp(-segp / 0.85)
    bright = pad_brightness() * (1.0 + 0.45 * np.exp(-segp / 0.35))
    s = (pad_tone("D2", note("D2"), 0.60 * touch, bright, nparts=6, **SINGLE)
         + pad_tone("D3", note("D3"), 0.80 * touch, bright, nparts=7, **SINGLE))
    bloom = stereo_noise(lambda f, tf: lognorm(f, 220.0, 0.6) / (1.0 + (f / 900.0) ** 2),
                         "settle:bloom", 0.4)
    bloom /= rms(bloom)
    benv = soft_attack(seg, 0.07) * np.exp(-segp / 0.45)
    return s + 0.7 * 10.0 ** (-14.0 / 20.0) * bloom * benv[:, None]


def make_letgo():
    """audio.letGo: the stream lets go. A tiny soft release, not a pluck. Its note is B4, which
    the bed does not hold at that moment (a G4 sat on the pad's own G4 and vanished); it is the
    open voice the bed then grows into during the melt."""
    rng = rng_for("letgo")
    i0 = int(math.floor((LET_GO - 0.002) * SR))
    seg = T[i0:] - LET_GO
    segp = np.maximum(seg, 0.0)
    cents = 8.0 * np.exp(-segp / 0.06)
    base = phase_of(note("B4") * 2.0 ** (cents / 1200.0))
    tone = (np.sin(base + rng.uniform(0, 2 * np.pi)) * np.exp(-segp / 0.45)
            + 0.12 * np.sin(2 * base + rng.uniform(0, 2 * np.pi)) * np.exp(-segp / 0.20))
    tone *= soft_attack(seg, 0.025)
    puff = stereo_noise(lambda f, tf: lognorm(f, 750.0, 0.7) / (1.0 + (f / 3000.0) ** 2),
                        "letgo:puff", 0.5, n=seg.size)
    puff /= rms(puff)
    penv = soft_attack(seg, 0.03) * np.exp(-segp / 0.16)
    out = np.zeros((N, 2))
    gl, gr = pan_gains(0.03)
    out[i0:, 0] = gl * tone
    out[i0:, 1] = gr * tone
    out[i0:] += 0.35 * puff * penv[:, None]
    return out


# Pitches the bed is not holding at 9.9-10.3 s (it holds D2 D3 B3 D4 G4 B4 there): tuned drops on
# pad notes were masked. G3 is the 4 that resolves down to F#3 in the resolve chord.
DROP_NOTES = ("A3", "E4", "A3", "G3")
DROP_AMPS = (0.75, 1.00, 0.80, 0.60)
DROP_PANS = (-0.08, 0.05, -0.02, 0.09)


def drop_times():
    lo, hi = DROP_WIN
    return [lo + (hi - lo) * f for f in DROP_FRACS]


def make_drops():
    """Honey drops falling into the cup: soft, rounded, low-mid touches; never plinky."""
    out = np.zeros((N, 2))
    for i, (t0, nm, amp, pan) in enumerate(zip(drop_times(), DROP_NOTES, DROP_AMPS, DROP_PANS)):
        rng = rng_for("drop:%d" % i)
        i0 = int(math.floor((t0 - 0.002) * SR))
        n = min(N - i0, int(1.0 * SR))
        seg = T[i0:i0 + n] - t0
        segp = np.maximum(seg, 0.0)
        cents = 22.0 * np.exp(-segp / 0.035)
        base = phase_of(note(nm) * 2.0 ** (cents / 1200.0))
        s = np.zeros(n)
        for k, a in [(1, 1.0), (2, 0.16), (3, 0.04)]:
            s += a * np.sin(k * base + rng.uniform(0, 2 * np.pi)) * np.exp(-segp / (0.15 / k ** 0.8))
        s *= soft_attack(seg, 0.014)
        body = shaped_noise(lambda f, tf: lognorm(f, 260.0, 0.55), rng_for("drop:%d:body" % i), n=n, nfft=1024)
        body /= rms(body)
        benv = soft_attack(seg, 0.008) * np.exp(-segp / 0.03)
        x = amp * (s + 0.25 * body * benv)
        gl, gr = pan_gains(pan)
        out[i0:i0 + n, 0] += gl * x
        out[i0:i0 + n, 1] += gr * x
    return out


def make_wood():
    modes = [(185.0, 1.00, 0.10), (420.0, 0.55, 0.08), (760.0, 0.30, 0.07), (1180.0, 0.12, 0.06)]

    def mag(f, tf):
        m = 0.0
        for fc, g, bw in modes:
            m = m + g * lognorm(f, fc, bw)
        return m

    n = int(1.2 * SR)
    x = shaped_noise(mag, rng_for("wood"), n=n, nfft=8192)
    env = env_pts(T[:n], [(0.0, 0.0), (WOOD_T - 0.07, 0.0), (WOOD_T, 1.0), (WOOD_T + 0.10, 0.40),
                          (WOOD_T + 0.34, 0.0)])
    out = np.zeros((N, 2))
    gl, gr = pan_gains(-0.15)
    out[:n, 0] = gl * x * env
    out[:n, 1] = gr * x * env
    return out


def make_air():
    def mag(f, tf):
        fc = 2200.0 + 700.0 * opening(tf)
        hp = 1.0 / np.sqrt(1.0 + (50.0 / np.maximum(f, 1.0)) ** 4)
        return (np.maximum(f, 1.0) / 200.0) ** -0.55 / (1.0 + (f / fc) ** 2) * hp

    x = stereo_noise(mag, "air", 0.6)
    breath = env_pts(T, [(0.0, 0.0), (INHALE[0], 0.0), (INHALE[1], 1.0), (EXHALE[0], 1.0),
                         (EXHALE[1], 0.0)])
    return x * (0.85 + 0.15 * breath + 0.08 * opening(T))[:, None]


def make_resolve():
    i0 = int(math.floor((RESOLVE - 0.005) * SR))
    seg = T[i0:] - RESOLVE
    segp = np.maximum(seg, 0.0)
    att = soft_attack(seg, 0.45)
    out = np.zeros((N, 2))
    tones = [("D2", 0.55), ("A2", 0.60), ("D3", 0.70), ("F#3", 0.28), ("A3", 0.22)]
    for nm, amp in tones:
        rng = rng_for("resolve:" + nm)
        f0 = note(nm)
        for cents, pan in ((-2.2, -0.28), (2.2, 0.28)):
            f = f0 * 2.0 ** (cents / 1200.0)
            s = np.zeros(seg.size)
            for k in range(1, 10):
                if k * f > 4000.0:
                    break
                tau = 3.0 / (1.0 + 0.45 * (k - 1))
                s += (k ** -1.7) * np.sin(2 * np.pi * k * f * seg + rng.uniform(0, 2 * np.pi)) \
                    * np.exp(-segp / tau)
            gl, gr = pan_gains(pan)
            out[i0:, 0] += 0.5 * amp * gl * s * att
            out[i0:, 1] += 0.5 * amp * gr * s * att
    return out


def make_room_ir(length=3.2, predelay=0.018):
    def rt60(f):
        pts_f = np.log([20.0, 250.0, 1000.0, 4000.0, 10000.0, 24000.0])
        pts_r = np.array([2.4, 2.4, 2.0, 1.3, 0.8, 0.5])
        return np.interp(np.log(np.maximum(f, 1.0)), pts_f, pts_r)

    n = int(length * SR)
    t = np.arange(n) / SR
    irs = []
    for side in ("L", "R"):
        h = shaped_noise(lambda f, tf: np.exp(-6.91 * np.maximum(tf, 0.0) / rt60(f)),
                         rng_for("room:" + side), n=n)
        h = np.concatenate([np.zeros(int(predelay * SR)), h])[:n]
        h *= soft_attack(t - predelay, 0.025)
        h /= math.sqrt(np.sum(h ** 2))
        irs.append(h)
    return irs


def room(send):
    """Mono send -> stereo room (independent L/R tails). Send band-limited 150 Hz - 7 kHz."""
    h_l, h_r = make_room_ir()
    nf = 1 << (N + h_l.size - 1).bit_length()
    f = np.fft.rfftfreq(nf, 1.0 / SR)
    band = 1.0 / np.sqrt(1.0 + (150.0 / np.maximum(f, 1.0)) ** 4) / np.sqrt(1.0 + (f / 7000.0) ** 4)
    X = np.fft.rfft(send, nf) * band
    yl = np.fft.irfft(X * np.fft.rfft(h_l, nf), nf)[:N]
    yr = np.fft.irfft(X * np.fft.rfft(h_r, nf), nf)[:N]
    return np.stack([yl, yr], axis=1)


STEMS = (("pad", make_pad), ("glass", make_glass), ("flow", make_flow), ("settle", make_settle),
         ("letgo", make_letgo), ("drops", make_drops), ("wood", make_wood), ("air", make_air),
         ("resolve", make_resolve))


# ----------------------------------------------------------------------------- measurement

K_PRE = ((1.53512485958697, -2.69169618940638, 1.19839281085285), (-1.69065929318241, 0.73248077421585))
K_RLB = ((1.0, -2.0, 1.0), (-1.99004745483398, 0.99007225036621))


def _biquad_resp(coef, w):
    (b0, b1, b2), (a1, a2) = coef
    z1 = np.exp(-1j * w)
    return (b0 + b1 * z1 + b2 * z1 ** 2) / (1.0 + a1 * z1 + a2 * z1 ** 2)


def k_weight(x):
    """BS.1770 K-weighting at 48 kHz: exact causal IIR response applied in the FFT domain
    with one second of zero padding (the filters' impulse responses die out in < 0.1 s)."""
    x = np.asarray(x, dtype=float)
    two_d = x.ndim == 2
    if not two_d:
        x = x[:, None]
    n = x.shape[0]
    nf = 1 << (n + SR - 1).bit_length()
    w = 2.0 * np.pi * np.fft.rfftfreq(nf)
    H = _biquad_resp(K_PRE, w) * _biquad_resp(K_RLB, w)
    y = np.fft.irfft(np.fft.rfft(x, nf, axis=0) * H[:, None], nf, axis=0)[:n]
    return y if two_d else y[:, 0]


def biquad_direct(x, coef):
    """Plain direct-form-I biquad, sample by sample (slow; used once as a cross-check)."""
    (b0, b1, b2), (a1, a2) = coef
    y = [0.0] * len(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, xi in enumerate(x.tolist()):
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return np.array(y)


def gated_loudness(y):
    """BS.1770-4 integrated loudness from already K-weighted (n, ch) samples, G = 1 for L/R."""
    n = y.shape[0]
    blk, step = int(0.4 * SR), int(0.1 * SR)
    cs = np.vstack([np.zeros((1, y.shape[1])), np.cumsum(y ** 2, axis=0)])
    starts = np.arange(0, n - blk + 1, step)
    z = ((cs[starts + blk] - cs[starts]) / blk).sum(axis=1)
    lj = -0.691 + 10.0 * np.log10(z + 1e-30)
    g1 = lj > -70.0
    if not g1.any():
        return float("-inf")
    gamma_r = -0.691 + 10.0 * np.log10(z[g1].mean()) - 10.0
    g2 = g1 & (lj > gamma_r)
    return float(-0.691 + 10.0 * np.log10(z[g2].mean()))


def integrated_lufs(x):
    return gated_loudness(k_weight(x))


def integrated_lufs_direct(x):
    y = np.stack([biquad_direct(biquad_direct(x[:, c], K_PRE), K_RLB) for c in range(x.shape[1])], axis=1)
    return gated_loudness(y)


def momentary(x, win=0.4, step=0.01, centred=False):
    """Momentary loudness curve (ungated). centred=True pads so windows centre on 0..DUR."""
    y = k_weight(x)
    e = (y ** 2).sum(axis=1)
    w, s = int(win * SR), int(step * SR)
    if centred:
        e = np.concatenate([np.zeros(w // 2), e, np.zeros(w // 2)])
    cs = np.concatenate([[0.0], np.cumsum(e)])
    starts = np.arange(0, e.size - w + 1, s)
    ms = (cs[starts + w] - cs[starts]) / w
    times = starts / SR if centred else (starts + w / 2) / SR
    return times, -0.691 + 10.0 * np.log10(ms + 1e-30)


def loudness_range(x):
    """EBU Tech 3342 LRA: 3 s short-term loudness every 0.1 s, -70 LUFS absolute gate,
    -20 LU relative gate, 95th minus 10th percentile."""
    _, st = momentary(x, win=3.0, step=0.1)
    g = st[st > -70.0]
    if g.size == 0:
        return 0.0
    rel = 10.0 * np.log10(np.mean(10.0 ** (g / 10.0))) - 20.0
    g = g[g > rel]
    return float(np.percentile(g, 95) - np.percentile(g, 10))


def true_peak(x, os_factor=4):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        x = x[:, None]
    n = x.shape[0]
    X = np.fft.rfft(x, axis=0)
    if n % 2 == 0:
        X[-1] *= 0.5
    Y = np.zeros((n * os_factor // 2 + 1, x.shape[1]), dtype=complex)
    Y[:X.shape[0]] = X
    y = np.fft.irfft(Y, n * os_factor, axis=0) * os_factor
    return float(np.abs(y).max())


def db(v):
    return 20.0 * math.log10(max(v, 1e-30))


def window_lufs(ky, t0, t1):
    """Ungated loudness of already K-weighted samples between t0 and t1."""
    a, b = int(max(t0, 0.0) * SR), int(min(t1, DUR) * SR)
    return -0.691 + 10.0 * math.log10(float((ky[a:b] ** 2).sum(axis=1).mean()) + 1e-30)


def self_tests():
    t = np.arange(12 * SR) / SR
    a = 10.0 ** (-23.0 / 20.0)
    s = a * np.sin(2 * np.pi * 997.0 * t)
    l1 = integrated_lufs(np.stack([s, s], 1))
    l2 = integrated_lufs(np.stack([np.sin(2 * np.pi * 997.0 * t), 0 * t], 1))
    q = np.sin(2 * np.pi * (SR / 4) * t[:SR] + np.pi / 4)  # periodic in the block: exact
    print("[selftest] 997 Hz sine -23 dBFS both channels: %.2f LUFS (expect -23.00)" % l1)
    print("[selftest] 997 Hz sine 0 dBFS one channel:    %.2f LUFS (expect -3.01)" % l2)
    print("[selftest] fs/4 sine, 45 deg: sample peak %.3f, true peak %.3f (expect 0.707 / 1.000)"
          % (np.abs(q).max(), true_peak(q)))
    return abs(l1 + 23.0) < 0.05 and abs(l2 + 3.01) < 0.05


# ----------------------------------------------------------------------------- checks

def click_scan(x):
    """Look for clicks: frames whose >5 kHz energy jumps well above its local median."""
    m = x.mean(axis=1)
    nfft, hop = 256, 64
    win = np.hanning(nfft)
    fr = sliding_window_view(np.pad(m, (nfft // 2, nfft // 2)), nfft)[::hop] * win
    S = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(nfft, 1.0 / SR)
    hf = 10.0 * np.log10(S[:, f >= 5000.0].sum(axis=1) + 1e-30)
    k = 41
    med = np.median(sliding_window_view(np.pad(hf, (k // 2, k // 2), mode="edge"), k), axis=1)
    jump = hf - med
    live = hf > hf.max() - 60.0
    flagged = np.where((jump > 10.0) & live)[0]
    worst = int(np.argmax(np.where(live, jump, -999)))
    return flagged.size, float(jump[worst]), worst * hop / SR


def steepest_rise(x):
    """Largest level increase between consecutive 40 ms RMS windows (5 ms hop), after the
    fade-in. 40 ms spans three cycles of the 73 Hz D2, so the low notes do not fool it."""
    m = x.mean(axis=1)
    w, hop = int(0.040 * SR), int(0.005 * SR)
    cs = np.concatenate([[0.0], np.cumsum(m ** 2)])
    starts = np.arange(0, m.size - w + 1, hop)
    lev = 10.0 * np.log10((cs[starts + w] - cs[starts]) / w + 1e-20)
    lag = w // hop
    rise = lev[lag:] - lev[:-lag]
    t_end = (starts[lag:] + w) / SR
    live = (lev[lag:] > lev.max() - 40.0) & (starts[:-lag] / SR >= FADE_IN)
    rise = np.where(live, rise, -999)
    i = int(np.argmax(rise))
    return float(rise[i]), float(t_end[i])


# ----------------------------------------------------------------------------- spectrogram PNG

FONT = {
    " ": ["     "] * 7,
    "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
    "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
    "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
    "3": ["#####", "   # ", "  #  ", "   # ", "    #", "#   #", " ### "],
    "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
    "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
    "6": ["  ## ", " #   ", "#    ", "#### ", "#   #", "#   #", " ### "],
    "7": ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
    "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
    "9": [" ### ", "#   #", "#   #", " ####", "    #", "   # ", " ##  "],
    ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
    ",": ["     ", "     ", "     ", "     ", " ##  ", "  #  ", " #   "],
    "-": ["     ", "     ", "     ", " ### ", "     ", "     ", "     "],
    "+": ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
    ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
    "/": ["    #", "    #", "   # ", "  #  ", " #   ", "#    ", "#    "],
    "(": ["   # ", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   # "],
    ")": [" #   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", " #   "],
    "a": ["     ", "     ", " ### ", "    #", " ####", "#   #", " ####"],
    "b": ["#    ", "#    ", "# ## ", "##  #", "#   #", "#   #", "#### "],
    "c": ["     ", "     ", " ### ", "#    ", "#    ", "#   #", " ### "],
    "d": ["    #", "    #", " ## #", "#  ##", "#   #", "#   #", " ####"],
    "e": ["     ", "     ", " ### ", "#   #", "#####", "#    ", " ### "],
    "f": ["  ## ", " #  #", " #   ", "###  ", " #   ", " #   ", " #   "],
    "g": ["     ", " ####", "#   #", "#   #", " ####", "    #", " ### "],
    "h": ["#    ", "#    ", "# ## ", "##  #", "#   #", "#   #", "#   #"],
    "i": ["  #  ", "     ", " ##  ", "  #  ", "  #  ", "  #  ", " ### "],
    "j": ["   # ", "     ", "  ## ", "   # ", "   # ", "#  # ", " ##  "],
    "k": ["#    ", "#    ", "#  # ", "# #  ", "##   ", "# #  ", "#  # "],
    "l": [" ##  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
    "m": ["     ", "     ", "## # ", "# # #", "# # #", "#   #", "#   #"],
    "n": ["     ", "     ", "# ## ", "##  #", "#   #", "#   #", "#   #"],
    "o": ["     ", "     ", " ### ", "#   #", "#   #", "#   #", " ### "],
    "p": ["     ", "     ", "#### ", "#   #", "#### ", "#    ", "#    "],
    "q": ["     ", "     ", " ####", "#   #", " ####", "    #", "    #"],
    "r": ["     ", "     ", "# ## ", "##  #", "#    ", "#    ", "#    "],
    "s": ["     ", "     ", " ####", "#    ", " ### ", "    #", "#### "],
    "t": [" #   ", " #   ", "###  ", " #   ", " #   ", " #  #", "  ## "],
    "u": ["     ", "     ", "#   #", "#   #", "#   #", "#  ##", " ## #"],
    "v": ["     ", "     ", "#   #", "#   #", "#   #", " # # ", "  #  "],
    "w": ["     ", "     ", "#   #", "#   #", "# # #", "# # #", " # # "],
    "x": ["     ", "     ", "#   #", " # # ", "  #  ", " # # ", "#   #"],
    "y": ["     ", "     ", "#   #", "#   #", " ####", "    #", " ### "],
    "z": ["     ", "     ", "#####", "   # ", "  #  ", " #   ", "#####"],
    "B": ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
    "D": ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
    "F": ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
    "H": ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
    "L": ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
    "P": ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
    "S": [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
    "T": ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
    "U": ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
}


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)


C = {k: hexrgb(v) for k, v in dict(parchment="#FBF7EE", surface="#FFFDF7", lemon="#FAF3CE",
                                    honey="#D9A441", honeyl="#E8BE67", amber="#B9823E",
                                    ambertext="#8A5C1E", ink="#38352F", muted="#6B6355",
                                    botanical="#667D62", line="#E6DDC8", band_in="#E3EADF",
                                    band_out="#F1EEDF").items()}


def draw_text(img, x, y, s, col, scale=2):
    for ch in s:
        g = FONT.get(ch, FONT.get(ch.lower(), FONT[" "]))
        for r, row in enumerate(g):
            for c, px in enumerate(row):
                if px == "#":
                    y0, x0 = y + r * scale, x + c * scale
                    if y0 >= 0 and x0 >= 0:
                        img[y0:y0 + scale, x0:x0 + scale] = col
        x += 6 * scale
    return x


def text_w(s, scale=2):
    return 6 * scale * len(s) - scale


def write_png(path, img):
    h, w, _ = img.shape
    raw = b"".join(b"\x00" + img[r].tobytes() for r in range(h))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                 + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def render_spectrogram(sig, path, stats):
    m = sig.mean(axis=1)
    ncol = 1800
    hop = N // ncol
    nfft = 4096
    win = np.hanning(nfft)
    pad = np.pad(m, (nfft // 2, nfft // 2))
    centres = np.arange(ncol) * hop + hop // 2
    frames = sliding_window_view(pad, nfft)[centres] * win
    S = np.abs(np.fft.rfft(frames, axis=1)) / (win.sum() / 2.0)
    sdb = 20.0 * np.log10(S + 1e-12)
    top_db = math.ceil(sdb.max() / 5.0) * 5.0
    rng_db = 100.0

    SPEC_H, LOUD_H = 520, 170
    ML, MR, MT, GAP, MB = 96, 44, 150, 58, 70
    W = ML + ncol + MR
    H = MT + SPEC_H + GAP + LOUD_H + MB
    img = np.empty((H, W, 3), dtype=np.uint8)
    img[:] = C["parchment"]

    fmin, fmax = 25.0, 20000.0
    rows_f = np.geomspace(fmax, fmin, SPEC_H)
    b = rows_f / (SR / nfft)
    i0 = np.floor(b).astype(int)
    fr = b - i0
    spec = sdb[:, i0] * (1 - fr) + sdb[:, i0 + 1] * fr
    v = np.clip((spec.T - (top_db - rng_db)) / rng_db, 0.0, 1.0)
    stops = np.array([0.0, 0.30, 0.55, 0.75, 0.90, 1.0])
    cols = np.array([[24, 20, 16], [74, 46, 22], [0xB9, 0x82, 0x3E], [0xD9, 0xA4, 0x41],
                     [0xE8, 0xBE, 0x67], [0xFA, 0xF3, 0xCE]], dtype=float)
    rgb = np.stack([np.interp(v, stops, cols[:, c]) for c in range(3)], axis=-1)
    img[MT:MT + SPEC_H, ML:ML + ncol] = rgb.astype(np.uint8)

    xs = lambda t: ML + int(round(t / DUR * ncol))
    ink, muted = C["ink"], C["muted"]

    draw_text(img, ML, 12, "the golden pause v2 - sound", ink, 3)
    draw_text(img, ML + 520, 18, "full mix, log frequency, colour 0 to -100 dB re loudest bin. "
              "cue ticks sit outside the picture", muted, 2)

    # what the picture is doing (cues.json v2), four rows of bars
    t_in, t_out = TEXT["in"], TEXT["out"]
    rows = [
        [("gather", GATHER), ("fall", FALL), ("write", WRITE), ("thin", THIN), ("melt", MELT),
         ("fill", FILL), ("steam", STEAM)],
        [("glint", GLINT), ("tilt", TILT)],
        [("drops", DROPS), ("rim drip", RIM)],
        [("words in", (t_in["fadeIn"][0], t_in["fadeOut"][1])),
         ("words out", (t_out["fadeIn"][0], t_out["fadeOut"][1])),
         ("wordmark", _pair(WELCOME["wordmark"])), ("tagline", _pair(WELCOME["tagline"]))],
    ]
    for r, row in enumerate(rows):
        y = 42 + r * 19
        for lab, (a, b2) in row:
            x0, x1 = xs(float(a)), xs(float(b2))
            img[y:y + 17, x0:x1] = C["lemon"] if r % 2 == 0 else C["band_out"]
            img[y:y + 17, x0:x0 + 2] = C["honeyl"]
            draw_text(img, x0 + 6, y + 2, lab, C["ambertext"], 2)

    # event ticks above the spectrogram
    events = [(INHALE[0], "inhale", C["botanical"]), (CONTACT, "contact", C["amber"]),
              (LET_GO, "let go", C["amber"]), (RESOLVE, "resolve", C["amber"]),
              (SETTLE, "settle", muted)]
    for t0, label, col in events:
        x = xs(t0)
        img[MT - 26:MT, x - 1:x + 1] = col
        draw_text(img, x + 5, MT - 28, label, col, 2)
    for t0, *_ in glass_times():
        img[MT - 12:MT - 2, xs(t0) - 1:xs(t0) + 1] = C["honey"]
    for t0 in drop_times():
        img[MT - 12:MT - 2, xs(t0) - 1:xs(t0) + 1] = C["ambertext"]
    img[MT - 12:MT - 2, xs(WOOD_T) + 3:xs(WOOD_T) + 5] = C["ambertext"]
    draw_text(img, xs(glass_times()[0][0]) + 5, MT - 11, "glass", C["honey"], 1)
    draw_text(img, xs(drop_times()[0]) - 5 - text_w("drops", 1), MT - 11, "drops", C["ambertext"], 1)
    draw_text(img, xs(WOOD_T) + 8, MT - 11, "wood", C["ambertext"], 1)

    # frequency axis
    for f0, lab in [(50, "50"), (100, "100"), (200, "200"), (500, "500"), (1000, "1k"),
                    (2000, "2k"), (5000, "5k"), (10000, "10k"), (20000, "20k")]:
        y = MT + int(round((math.log(fmax) - math.log(f0)) / (math.log(fmax) - math.log(fmin)) * (SPEC_H - 1)))
        img[y:y + 1, ML - 8:ML] = ink
        draw_text(img, ML - 12 - text_w(lab), y - 7, lab, ink, 2)
    draw_text(img, 8, MT + SPEC_H // 2 - 7, "Hz", muted, 2)

    # time axis
    ty = MT + SPEC_H
    for s in range(0, int(DUR) + 1):
        x = xs(float(s))
        img[ty:ty + 8, max(x - 1, 0):x + 1] = ink
        lab = str(s)
        draw_text(img, x - text_w(lab) // 2, ty + 12, lab, ink, 2)
    draw_text(img, ML + ncol - text_w("seconds") + 2, ty + 34, "seconds", muted, 2)

    # momentary loudness strip
    ly0 = MT + SPEC_H + GAP
    lo, hi = -50.0, -10.0
    yl = lambda L: ly0 + int(round((hi - L) / (hi - lo) * (LOUD_H - 1)))
    img[ly0:ly0 + LOUD_H, ML:ML + ncol] = C["surface"]
    img[ly0:ly0 + LOUD_H, xs(INHALE[0]):xs(INHALE[1])] = C["band_in"]
    img[ly0:ly0 + LOUD_H, xs(EXHALE[0]):xs(EXHALE[1])] = C["band_out"]
    img[ly0:ly0 + LOUD_H, xs(MELT[0]):xs(TILT[1])] = C["lemon"]
    draw_text(img, xs(INHALE[0]) + 6, ly0 + 6, "inhale", C["botanical"], 2)
    draw_text(img, xs(EXHALE[0]) + 6, ly0 + 6, "exhale", C["botanical"], 2)
    draw_text(img, xs(MELT[0]) + 6, ly0 + 6, "opens", C["ambertext"], 2)
    for L in (-50, -40, -30, -20, -10):
        y = min(yl(L), ly0 + LOUD_H - 1)
        img[y:y + 1, ML:ML + ncol] = C["honey"] if L == -20 else C["line"]
        lab = str(L)
        draw_text(img, ML - 12 - text_w(lab), y - 7, lab, ink, 2)
    draw_text(img, 8, ly0 + LOUD_H // 2 - 7, "LUFS", muted, 2)
    for t0 in (CONTACT, LET_GO, DROP_WIN[0], DROP_WIN[1], RESOLVE):
        x = xs(t0)
        for y in range(ly0, ly0 + LOUD_H, 8):
            img[y:y + 4, x:x + 1] = C["amber"]
    tm, lm = momentary(sig, centred=True)
    colx = (np.arange(ncol) + 0.5) / ncol * DUR
    lc = np.interp(colx, tm, lm)
    py = np.array([yl(np.clip(L, lo, hi)) for L in lc])
    for i in range(ncol):
        a, b2 = (py[i], py[i]) if i == 0 else (min(py[i - 1], py[i]), max(py[i - 1], py[i]))
        img[a - 1:b2 + 2, ML + i:ML + i + 1] = C["ambertext"]
    draw_text(img, ML + ncol - 230, ly0 + 6, "momentary loudness", C["ambertext"], 2)

    cap = ("integrated %.1f LUFS   true peak %.1f dBTP   sample peak %.1f dBFS   LRA %.1f LU   "
           "48 kHz stereo 24-bit   %.3f s"
           % (stats["lufs"], stats["tp_db"], stats["sp_db"], stats["lra"], N / SR))
    draw_text(img, ML, H - 44, cap, ink, 2)
    write_png(path, img)


# ----------------------------------------------------------------------------- outputs

def write_wav24(path, x):
    q = np.clip(np.round(x * 8388607.0), -8388608, 8388607).astype("<i4")
    raw = q.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw)
    return q


def read_wav24(path):
    with wave.open(path, "rb") as w:
        assert w.getsampwidth() == 3 and w.getnchannels() == 2 and w.getframerate() == SR
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.uint8).reshape(-1, 3)
    v = (raw[:, 0].astype(np.int32) | (raw[:, 1].astype(np.int32) << 8) | (raw[:, 2].astype(np.int32) << 16))
    v = np.where(v >= 1 << 23, v - (1 << 24), v)
    return v.reshape(-1, 2) / 8388607.0


def mp4_faststart(path):
    """Move the moov box in front of mdat (for quick web start) and fix chunk offsets."""
    data = open(path, "rb").read()

    def boxes(buf, off, end):
        out = []
        while off + 8 <= end:
            size = struct.unpack(">I", buf[off:off + 4])[0]
            typ = bytes(buf[off + 4:off + 8]).decode("latin1")
            hdr = 8
            if size == 1:
                size, hdr = struct.unpack(">Q", buf[off + 8:off + 16])[0], 16
            elif size == 0:
                size = end - off
            out.append((typ, off, size, hdr))
            off += size
        return out

    top = boxes(data, 0, len(data))
    types = [b[0] for b in top]
    if "moov" not in types or "mdat" not in types:
        return "no moov/mdat"
    im, idat = types.index("moov"), types.index("mdat")
    if im < idat:
        return "already fast-start"
    _, moff, msize, _ = top[im]
    moov = bytearray(data[moff:moff + msize])

    def patch(buf, off, end):
        for typ, o, size, hdr in boxes(buf, off, end):
            if typ in ("moov", "trak", "mdia", "minf", "stbl", "edts", "dinf"):
                patch(buf, o + hdr, o + size)
            elif typ in ("stco", "co64"):
                cnt = struct.unpack(">I", buf[o + hdr + 4:o + hdr + 8])[0]
                fmt, wdt = (">I", 4) if typ == "stco" else (">Q", 8)
                for i in range(cnt):
                    p = o + hdr + 8 + wdt * i
                    struct.pack_into(fmt, buf, p, struct.unpack(fmt, buf[p:p + wdt])[0] + msize)

    patch(moov, 0, msize)
    new = bytearray()
    for i, (typ, o, size, hdr) in enumerate(top):
        if i == idat:
            new += moov
        if i == im:
            continue
        new += data[o:o + size]
    tmp = path + ".tmp"
    with open(tmp, "wb") as fh:
        fh.write(new)
    os.replace(tmp, path)
    return "moov moved before mdat (%d bytes)" % msize


def encode_web(wav_path, targets):
    import bpy
    sc = bpy.context.scene
    fps = int(CUES["fps"])
    nfr = int(round(DUR * fps))
    sc.render.fps, sc.render.fps_base = fps, 1.0
    sc.frame_start, sc.frame_end = 1, nfr
    sc.render.resolution_x = sc.render.resolution_y = 64
    sc.render.resolution_percentage = 100
    se = sc.sequence_editor_create()
    strips = se.strips if hasattr(se, "strips") else se.sequences
    strips.new_sound("golden-pause", wav_path, 1, 1)
    col = None  # a colour strip makes the render use the sequencer, not the 3D scene (fast)
    for extra in ({"length": nfr}, {"frame_end": nfr + 1}):
        try:
            col = strips.new_effect(name="parchment", type="COLOR", channel=2, frame_start=1, **extra)
            break
        except (TypeError, RuntimeError):
            continue
    if col is not None:
        col.color = (0.96, 0.93, 0.85)
    else:
        print("[encode] note: no colour strip; the 3D scene will be rendered (slower)")
    r = sc.render
    if hasattr(r.image_settings, "media_type"):
        r.image_settings.media_type = "VIDEO"
    r.image_settings.file_format = "FFMPEG"
    r.use_file_extension = False
    ff = r.ffmpeg
    for path, fmt, codec, kbps in targets:
        if os.path.exists(path):
            os.remove(path)
        ff.format = fmt
        ff.codec = "NONE"
        ff.audio_codec = codec
        ff.audio_bitrate = kbps
        ff.audio_channels = "STEREO"
        ff.audio_mixrate = SR
        r.filepath = path
        t0 = time.time()
        bpy.ops.render.render(animation=True)
        print("[encode] %s  %s/%s %d kbps  %.1f s" % (os.path.basename(path), fmt, codec, kbps, time.time() - t0))


def verify_decoded(path, ref):
    import aud
    snd = aud.Sound.file(path)
    d = np.asarray(snd.data(), dtype=float)
    rate = snd.specs[0]
    n = min(d.shape[0], ref.shape[0])
    a, b = ref[:n].mean(1), d[:n].mean(1)
    nf = 1 << (2 * n - 1).bit_length()
    xc = np.fft.irfft(np.fft.rfft(b, nf) * np.conj(np.fft.rfft(a, nf)), nf)
    lags = np.concatenate([np.arange(0, 4097), np.arange(-4096, 0)])
    lag = int(lags[np.argmax(np.concatenate([xc[:4097], xc[-4096:]]))])
    if lag >= 0:
        ra, rb = ref[:n - lag], d[lag:n]
    else:
        ra, rb = ref[-lag:n], d[:n + lag]
    corr = float(np.sum(ra * rb) / math.sqrt(np.sum(ra ** 2) * np.sum(rb ** 2)))
    resid = db(math.sqrt(np.mean((ra - rb) ** 2))) - db(math.sqrt(np.mean(ra ** 2)))
    lufs, tp = integrated_lufs(d), db(true_peak(d))
    print("[decode] %-18s %d Hz, %d ch, %d frames (%.4f s), lag %+d samples, corr %.5f, "
          "codec residual %.1f dB re signal, %.2f LUFS, true peak %.2f dBTP"
          % (os.path.basename(path), rate, d.shape[1], d.shape[0], d.shape[0] / rate, lag, corr,
             resid, lufs, tp))
    return dict(frames=d.shape[0], lag=lag, corr=corr, resid=resid, lufs=lufs, tp=tp)


# ----------------------------------------------------------------------------- main

def main():
    t_start = time.time()
    os.makedirs(OUT_DIR, exist_ok=True)
    print("THE GOLDEN PAUSE v2 - sound.py (seed %d, %d Hz, %d samples = %.3f s)" % (SEED, SR, N, N / SR))
    ok = self_tests()
    print("[selftest] loudness meter %s" % ("OK" if ok else "FAILED"))

    warnings = check_cues()
    for w in warnings:
        print("[cues] WARNING " + w)
    if not warnings:
        print("[cues] cues.json v2 consistent with every assumption in this file")
    print("[cues] wood %.2f  inhale %s  contact %.2f  write %s  chord move %s  thin %s  let go %.2f"
          % (WOOD_T, INHALE, CONTACT, WRITE, MOVE, THIN, LET_GO))
    print("[cues] opens %.2f-%.2f (full at %.2f)  drops %s  feed %.2f  resolve %.2f  settle %.2f  fade-out %.2f-%.2f"
          % (MELT[0], TILT[1], OPEN_PEAK, ", ".join("%.3f" % t for t in drop_times()), FEED, RESOLVE,
             SETTLE, FADE_END - FADE_OUT_LEN, FADE_END))
    print("[cues] glass notes at " + ", ".join("%.2f s %s" % (t, nm) for t, nm, *_ in glass_times()))

    stems = {}
    for name, fn in STEMS:
        t0 = time.time()
        stems[name] = fn()
        print("[synth] %-8s %.1f s" % (name, time.time() - t0))

    peak_m = {k: float(momentary(v)[1].max()) for k, v in stems.items()}
    ref = peak_m["pad"]
    gains = {k: 10.0 ** ((ref + STEM_LU[k] - peak_m[k]) / 20.0) for k in stems}

    dry = np.zeros((N, 2))
    send = np.zeros(N)
    for k, v in stems.items():
        dry += gains[k] * v
        send += REVERB_SEND[k] * gains[k] * v.mean(axis=1)
    wet = room(send)
    mix = dry + wet

    fade = env_pts(T, [(0.0, 0.0), (FADE_IN, 1.0)]) * env_pts(T, [(FADE_END - FADE_OUT_LEN, 1.0), (FADE_END, 0.0)])
    mix *= fade[:, None]
    mix[0] = 0.0
    mix[-1] = 0.0

    lufs0 = integrated_lufs(mix)
    g = 10.0 ** ((TARGET_LUFS - lufs0) / 20.0)
    tp = true_peak(mix * g)
    if db(tp) > PEAK_CEILING_DBTP - 0.05:
        g *= 10.0 ** ((PEAK_CEILING_DBTP - 0.05 - db(tp)) / 20.0)
        print("[level] true peak limited the gain; loudness will be under target")
    mix *= g
    for k in gains:
        gains[k] *= g

    print("[mix] stem     gain dB   loudest moment (LUFS, final scale, dry)   target re pad")
    for k, v in stems.items():
        print("[mix] %-8s %+7.1f   %6.1f                                    %+5.1f LU"
              % (k, db(gains[k]), peak_m[k] + db(gains[k]), STEM_LU[k]))

    # Each event against everything else in the mix at that moment (dry stem incl. master fade).
    kmix = k_weight(mix)
    print("[events] event      window          event LUFS   rest of mix LUFS   event re rest")
    for k, a, b in (("wood", WOOD_T - 0.07, WOOD_T + 0.25), ("settle", CONTACT, CONTACT + 0.4),
                    ("letgo", LET_GO, LET_GO + 0.4), ("drops", DROP_WIN[0], DROP_WIN[1] + 0.15),
                    ("resolve", RESOLVE + 0.2, RESOLVE + 0.8), ("flow", WRITE[0] + 1.0, WRITE[1]),
                    ("glass", glass_times()[0][0], glass_times()[0][0] + 0.4)):
        ks = k_weight(gains[k] * stems[k] * fade[:, None])
        le, lr = window_lufs(ks, a, b), window_lufs(kmix - ks, a, b)
        print("[events] %-9s %5.2f-%5.2f s   %7.1f      %7.1f            %+6.1f LU" % (k, a, b, le, lr, le - lr))

    # Tuned events must add to the bed's partials, never cancel them: compare the bed with and
    # without each event in narrow bands around the bed's own notes, over the event's ring time.
    def band_change(k, t0, t1, bands):
        a, b = int(t0 * SR), int(t1 * SR)
        w = np.hanning(b - a)[:, None]
        f = np.fft.rfftfreq(b - a, 1.0 / SR)
        bed = gains["pad"] * stems["pad"][a:b]
        P0 = (np.abs(np.fft.rfft(bed * w, axis=0)) ** 2).sum(axis=1)
        P1 = (np.abs(np.fft.rfft((bed + gains[k] * stems[k][a:b]) * w, axis=0)) ** 2).sum(axis=1)
        out = []
        for lo_f, hi_f in bands:
            m = (f >= lo_f) & (f < hi_f)
            out.append(10.0 * math.log10(P1[m].sum() / (P0[m].sum() + 1e-30)))
        return out

    low_bands = [(65, 82), (135, 160), (205, 235), (280, 310)]
    ch = band_change("settle", CONTACT, CONTACT + 1.0, low_bands)
    print("[phase] contact touch vs bed alone, %.1f-%.1f s: 73 Hz %+.1f dB, 147 Hz %+.1f dB, "
          "220 Hz %+.1f dB, 294 Hz %+.1f dB (none may fall below -1 dB: no hole in the bed)"
          % ((CONTACT, CONTACT + 1.0) + tuple(ch)))
    if min(ch) < -1.0:
        print("[phase] WARNING: the contact touch cancels part of the bed")

    # Audibility in the event's own band: event vs everything else, right after its onset.
    def band_ratio(k, t0, t1, flo, fhi):
        a, b = int(t0 * SR), int(t1 * SR)
        w = np.hanning(b - a)[:, None]
        f = np.fft.rfftfreq(b - a, 1.0 / SR)
        m = (f >= flo) & (f < fhi)
        ev = gains[k] * stems[k][a:b] * fade[a:b, None]
        pe = (np.abs(np.fft.rfft(ev * w, axis=0)) ** 2).sum(axis=1)[m].sum()
        pr = (np.abs(np.fft.rfft((mix[a:b] - ev) * w, axis=0)) ** 2).sum(axis=1)[m].sum()
        return 10.0 * math.log10(pe / (pr + 1e-30) + 1e-30)

    third = lambda f0: (f0 / 2 ** (1 / 6.0), f0 * 2 ** (1 / 6.0))
    rows = [("wood 185 Hz", "wood", WOOD_T - 0.03, WOOD_T + 0.15, third(185.0)),
            ("wood 600-1400 Hz", "wood", WOOD_T - 0.03, WOOD_T + 0.15, (600.0, 1400.0)),
            ("contact 60-170 Hz", "settle", CONTACT, CONTACT + 0.3, (60.0, 170.0)),
            ("let go B4", "letgo", LET_GO, LET_GO + 0.25, third(note("B4")))]
    rows += [("drop %d %s" % (i + 1, nm), "drops", t0, t0 + 0.12, third(note(nm)))
             for i, (t0, nm) in enumerate(zip(drop_times(), DROP_NOTES))]
    print("[audible] event in its own band vs the rest of the mix, just after onset "
          "(> 0 dB: stands out; -10 dB: buried)")
    for lab, k, a, b, (flo, fhi) in rows:
        print("[audible] %-18s %5.2f-%5.2f s  %4.0f-%4.0f Hz  %+5.1f dB" % (lab, a, b, flo, fhi, band_ratio(k, a, b, flo, fhi)))

    wav_path = os.path.join(OUT_DIR, "golden-pause.wav")
    write_wav24(wav_path, mix)
    back = read_wav24(wav_path)

    lufs = integrated_lufs(back)
    t0 = time.time()
    lufs_direct = integrated_lufs_direct(back)
    tpv, spv = true_peak(back), float(np.abs(back).max())
    lra = loudness_range(back)
    stats = dict(lufs=lufs, tp_db=db(tpv), sp_db=db(spv), lra=lra)
    with wave.open(wav_path, "rb") as w:
        nframes = w.getnframes()
    print("[wav] %s  %d bytes  %d frames = %.3f s  sha256 %s"
          % (wav_path, os.path.getsize(wav_path), nframes, nframes / SR,
             hashlib.sha256(open(wav_path, "rb").read()).hexdigest()[:16]))
    print("[level] integrated %.2f LUFS (FFT K-weighting) / %.2f LUFS (direct-form biquads, %.0f s); full BS.1770-4 gating"
          % (lufs, lufs_direct, time.time() - t0))
    print("[level] true peak (4x) %.2f dBTP, sample peak %.2f dBFS, loudness range %.1f LU" % (db(tpv), db(spv), lra))
    tm, lm = momentary(back)
    ts, ls = momentary(back, win=3.0, step=0.1)
    print("[level] max momentary %.1f LUFS at %.2f s, max short-term %.1f LUFS" % (lm.max(), tm[np.argmax(lm)], ls.max()))
    print("[level] momentary at cue times: " + ", ".join(
        "%.2f s %.1f" % (t, np.interp(t, tm, lm)) for t in
        (WOOD_T + 0.1, 1.5, INHALE[1], CONTACT + 0.2, 5.0, 6.5, LET_GO + 0.1, MELT[0], OPEN_PEAK,
         FEED + 0.1, RESOLVE + 0.4, 12.0, SETTLE)))
    L, R = back[:, 0], back[:, 1]
    corr = float(np.sum(L * R) / math.sqrt(np.sum(L ** 2) * np.sum(R ** 2)))
    mono = np.repeat(((L + R) / 2.0)[:, None], 2, axis=1)
    print("[stereo] L/R correlation %.3f, mono fold-down loudness change %+.2f LU, L-R balance %+.2f dB"
          % (corr, integrated_lufs(mono) - lufs, db(math.sqrt(np.mean(L ** 2))) - db(math.sqrt(np.mean(R ** 2)))))
    spec = np.abs(np.fft.rfft(back.mean(axis=1))) ** 2
    fr = np.fft.rfftfreq(N, 1.0 / SR)
    print("[spectrum] energy share above 5 kHz %.1f dB, above 10 kHz %.1f dB, below 40 Hz %.1f dB"
          % tuple(10 * math.log10(spec[m].sum() / spec.sum() + 1e-30) for m in (fr > 5000, fr > 10000, fr < 40)))
    print("[edges] DC offset %.2e, first sample %r, last sample %r, last 10 ms RMS %.1f dBFS, first 10 ms RMS %.1f dBFS"
          % (float(back.mean()), back[0].tolist(), back[-1].tolist(),
             db(math.sqrt(np.mean(back[-480:] ** 2))), db(math.sqrt(np.mean(back[:480] ** 2)))))
    nclick, worst, wt = click_scan(back)
    rise, rt = steepest_rise(back)
    print("[clicks] %d suspicious >5 kHz jumps (>10 dB over local median); largest jump %.1f dB at %.2f s"
          % (nclick, worst, wt))
    print("[attacks] steepest rise between consecutive 40 ms windows after the fade-in: %.1f dB (window ending %.2f s)" % (rise, rt))

    if "--no-png" not in ARGS:
        png = os.path.join(OUT_DIR, "spectrogram.png")
        render_spectrogram(back, png, stats)
        print("[png] %s  %d bytes" % (png, os.path.getsize(png)))

    if "--no-encode" not in ARGS:
        try:
            import bpy  # noqa: F401
        except ImportError:
            print("[encode] skipped: not running inside Blender")
        else:
            m4a = os.path.join(OUT_DIR, "golden-pause.m4a")
            webm = os.path.join(OUT_DIR, "golden-pause.webm")
            encode_web(wav_path, [(m4a, "MPEG4", "AAC", 128), (webm, "WEBM", "OPUS", 96)])
            print("[encode] m4a faststart: " + mp4_faststart(m4a))
            for p in (m4a, webm):
                print("[size] %s  %d bytes (%.1f KB, %.0f kbps average)"
                      % (p, os.path.getsize(p), os.path.getsize(p) / 1024.0, os.path.getsize(p) * 8 / DUR / 1000))
                verify_decoded(p, back)
    print("[size] %s  %d bytes" % (wav_path, os.path.getsize(wav_path)))
    print("done in %.1f s" % (time.time() - t_start))


if __name__ == "__main__":
    main()
