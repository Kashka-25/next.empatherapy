"""Contact sheet of rendered frames, for review: blender -b --factory-startup --python contact.py -- <dir> <out.png> [cols] [scale]"""
import bpy, numpy as np, os, sys
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
cols = int(argv[2]) if len(argv) > 2 else 2
scale = int(argv[3]) if len(argv) > 3 else 2
files = sorted(f for f in os.listdir(src) if f.endswith('.png'))
tiles = []
for f in files:
    im = bpy.data.images.load(os.path.join(src, f)); w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    a = px.reshape(h, w, 4)[::-1, :, :3]
    a = a[: h - h % scale, : w - w % scale].reshape(h // scale, scale, w // scale, scale, 3).mean(axis=(1, 3))
    # label strip: frame number as a row of small blocks is overkill; draw a thin bar whose length = time
    n = int(f.split('.')[0]); bar = int(a.shape[1] * n / 287)
    a[-4:, :bar] = [0.2, 0.2, 0.2]
    tiles.append(a)
th, tw = tiles[0].shape[:2]
rows = (len(tiles) + cols - 1) // cols
sheet = np.ones((rows * (th + 6), cols * (tw + 6), 3), np.float32)
for i, t in enumerate(tiles):
    r, c = divmod(i, cols)
    sheet[r * (th + 6): r * (th + 6) + th, c * (tw + 6): c * (tw + 6) + tw] = t
H, W = sheet.shape[:2]
img = bpy.data.images.new('sheet', W, H, alpha=True)
img.pixels.foreach_set(np.concatenate([sheet, np.ones((H, W, 1), np.float32)], 2)[::-1].ravel())
img.filepath_raw = out; img.file_format = 'PNG'; img.save()
print('SHEET', out, W, H, files)
