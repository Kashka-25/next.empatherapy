"""
Cassidy's title artwork (source/wordmark.png: "Empatherapy" in brown serif letters, a vine from the "y", leaves and a
daisy) split into layers, so the name can take any colour while the daisy keeps its own.

The artwork was cut from a white background and keeps a thin white outline around every shape. On parchment it cannot
be seen; on the dark footer it would. So:
  1. The outline is removed: light pixels reached from the transparent outside within OUTLINE_PX pixels.
  2. The letters and the vine: every pixel on the line from the artwork's brown to white, weighted by how brown it is
     (so their soft edges stay soft). Written as a mask (white, with that alpha).
  3. The daisy and the leaves: everything else in their area (the daisy box, and green pixels with their outline),
     in its own colours.
Outputs (run from this folder: python wordmark_layers.py):
  ../../public/brand/name-letters.webp   the mask for the letters and vine (any colour, via CSS mask)
  ../../public/brand/name-flower.webp    the daisy and leaves, in colour
  ../../public/golden-pause/wordmark.webp  the whole title, outline removed, in its own brown (the film's title)
  work/name-preview.png                  the layers recombined over parchment and the footer green, for checking
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source', 'wordmark.png')
PUB = os.path.join(HERE, '..', '..', 'public')

OUTLINE_PX = 12          # the white outline is a few pixels wide; never flood further than this
LIGHT = 185.0            # luminance above which a pixel can be outline
BROWN_AXIS_TOL = 38.0    # distance from the brown-to-white line that still counts as letter or outline
DAISY_BOX = (1672, 176)  # x, y from which the daisy sits (to the right edge and the bottom)
LETTERS_W = 1200         # the mask and flower are drawn at most ~700 px wide on screen (3x a 230 px logo)


def main():
    a = np.asarray(Image.open(SRC).convert('RGBA')).astype(np.float64)
    rgb, al = a[..., :3], a[..., 3] / 255.0
    H, W = al.shape
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])

    solid = al > 0.98
    brown = np.median(rgb[solid & (lum < 90)], axis=0)
    white = np.array([255.0, 251.0, 242.0])
    axis = white - brown
    t = np.clip(((rgb - brown) @ axis) / (axis @ axis), 0, 1)                 # 0 = brown, 1 = white
    resid = np.linalg.norm(rgb - (brown + t[..., None] * axis), axis=-1)      # how far off that line
    on_axis = resid < BROWN_AXIS_TOL

    # 1. the white outline: light pixels connected to the transparent outside, within OUTLINE_PX
    outside = al < 0.04
    light = (lum > LIGHT) & ~outside
    halo = np.zeros_like(outside)
    front = outside.copy()
    for _ in range(OUTLINE_PX):
        grown = front.copy()
        grown[1:, :] |= front[:-1, :]; grown[:-1, :] |= front[1:, :]
        grown[:, 1:] |= front[:, :-1]; grown[:, :-1] |= front[:, 1:]
        new = grown & light & ~halo & ~outside
        if not new.any():
            break
        halo |= new
        front = outside | halo

    # 3. the daisy and leaves area: the daisy box, and green pixels (leaves) grown by 4 px to take their outline
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = (al > 0.15) & (g > r + 12) & (g > b + 12)
    green[:, :1450] = False
    for _ in range(4):
        gg = green.copy()
        gg[1:, :] |= green[:-1, :]; gg[:-1, :] |= green[1:, :]
        gg[:, 1:] |= green[:, :-1]; gg[:, :-1] |= green[:, 1:]
        green = gg
    flower_area = green.copy()
    flower_area[DAISY_BOX[1]:, DAISY_BOX[0]:] = True

    # 2. the letters and vine: brown-ness along the brown-to-white line (not the outline; in the flower area only
    # the darker, clearly brown pixels, which are the vine)
    letter_w = np.where(on_axis, 1.0 - t, 0.0)
    letter_w[halo] = 0.0
    letter_w[flower_area & (t > 0.55)] = 0.0
    letters_a = al * letter_w

    flower_w = np.where(flower_area & ~halo, 1.0 - letter_w, 0.0)
    flower_a = al * flower_w

    def save_rgba(rgb_, alpha, path, width=None):
        im = Image.fromarray(np.dstack([np.clip(rgb_, 0, 255), np.clip(alpha * 255, 0, 255)]).round().astype(np.uint8), 'RGBA')
        if width and width < im.width:
            # resize premultiplied, so soft edges keep their colour
            pm = np.asarray(im).astype(np.float64)
            pm[..., :3] *= pm[..., 3:4] / 255.0
            h = round(im.height * width / im.width)
            ch = [np.asarray(Image.fromarray(pm[..., i].astype(np.float32), 'F').resize((width, h), Image.LANCZOS)) for i in range(4)]
            A = np.clip(ch[3], 0, 255)
            C = np.where(A[..., None] > 0.5, np.dstack(ch[:3]) * 255.0 / np.maximum(A[..., None], 1e-6), 0)
            im = Image.fromarray(np.dstack([np.clip(C, 0, 255), A]).round().astype(np.uint8), 'RGBA')
        im.save(path, 'WEBP', lossless=True, quality=100, method=6)
        return im

    os.makedirs(os.path.join(PUB, 'brand'), exist_ok=True)
    white_rgb = np.full_like(rgb, 255.0)
    lm = save_rgba(white_rgb, letters_a, os.path.join(PUB, 'brand', 'name-letters.webp'), LETTERS_W)
    fl = save_rgba(rgb, flower_a, os.path.join(PUB, 'brand', 'name-flower.webp'), LETTERS_W)

    # the film's title: the letters in the artwork's own brown, with the daisy, outline removed, at full size
    title_rgb = np.where(letters_a[..., None] >= flower_a[..., None] - 1e-9, brown, rgb)
    # composite letters (brown) under the flower layer, premultiplied
    la, fa = letters_a[..., None], flower_a[..., None]
    out_a = fa + la * (1 - fa)
    out_c = (rgb * fa + brown * la * (1 - fa)) / np.maximum(out_a, 1e-6)
    save_rgba(np.where(out_a > 0, out_c, title_rgb), out_a[..., 0], os.path.join(PUB, 'golden-pause', 'wordmark.webp'))

    # a check picture: letters green on parchment, brown on parchment, cream on the footer green
    def over(bg, letter_col, scale_w=LETTERS_W):
        L = np.asarray(lm).astype(np.float64) / 255.0
        F = np.asarray(fl).astype(np.float64) / 255.0
        h = L.shape[0]
        out = np.empty((h, scale_w, 3)); out[:] = np.array(bg) / 255.0
        out = out * (1 - L[..., 3:4]) + np.array(letter_col) / 255.0 * L[..., 3:4]
        out = out * (1 - F[..., 3:4]) + F[..., :3] * F[..., 3:4]
        return (out * 255).round().astype(np.uint8)
    rows = [over((251, 247, 238), (68, 88, 63)), over((251, 247, 238), (79, 54, 24)), over((47, 62, 43), (251, 247, 238))]
    os.makedirs(os.path.join(HERE, 'work'), exist_ok=True)
    Image.fromarray(np.vstack(rows)).save(os.path.join(HERE, 'work', 'name-preview.png'))

    print('brown', brown.round(1), 'outline px removed', int(halo.sum()), 'letters px', int((letters_a > 0.5).sum()),
          'flower px', int((flower_a > 0.5).sum()), 'mask size', lm.size)
    for p in ('brand/name-letters.webp', 'brand/name-flower.webp', 'golden-pause/wordmark.webp'):
        print(p, os.path.getsize(os.path.join(PUB, p)), 'B')


if __name__ == '__main__':
    main()
