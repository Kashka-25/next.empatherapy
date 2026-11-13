# The Golden Pause: film production

A 13-second optional breathing moment for the Empatherapy homepage (version 2, "honey writes the name").

A honey-coated wooden dipper hangs over a softly blurred garden tabletop. A drop gathers while you breathe in, falls,
and lands on the crossbar of the "t"; the honey flows out through the joined script and writes "Empatherapy" while
you breathe out. The stream lets go, a glint runs across the name, then the honey drips off, the name settles into
the site's own typeface (live HTML), and the camera follows the drops down into the teacup symbol, which fills,
spills its rim drip and steams. "Discover new pathways to yourself." appears beneath. The film itself has no typed
words; the breathing lines, wordmark and tagline are HTML on the page.

Everything is reproducible with Blender 5.2 (its bundled Python and numpy), Node 24 and Chrome. No downloads, no AI
service at runtime.

| File | What it does |
|---|---|
| `cues.json` | The single clock and layout (v2): drop, write, let go, glint, melt, tilt, feed, text, welcome, per-format positions. |
| `cues-v1.json` | The first film's cue sheet (the five-shot version), kept so `compose.py` can still rebuild it. |
| `source/backdrop.png` | Cassidy's garden tabletop backdrop (blurred in the film). |
| `source/dipper.glb` | Cassidy's 3D honey dipper (Meshy). **Not committed (25 MB)**: copy it here to rebuild the dipper frames. |
| `source/name-mask.png` | "Empatherapy" in Vladimir Script, thickened, as a mask (made by `work/honey/raster.js` from the installed font). |
| `source/symbol.svg` | Vector redraw of Cassidy's teacup symbol, in layers (steam, back, tea, lemon, front, drip, flower). Provisional until approved. |
| `dipper.py` | Renders the dipper in EEVEE with a transparent background: trims the modelled drip, coats the head in glossy golden honey, sway, dip and lift; writes the tip position per frame. |
| `honey.py` | The compositor: backdrop with parallax, the honey stream from the tip, the name flowing out from the landing point (geodesic flood through the letters), melt and drips, drops falling into the cup, the symbol filling, glossy translucent honey shading, the dipper on top. Frames, stills and MP4. |
| `sound.py` | The soundscape, synthesised in code and timed to `cues.json` (-20 LUFS, AAC and Opus). |
| `qa.py` | Frame checks: no flashes, biggest frame-to-frame change, a still hold from the settle time. |
| `render-v2.sh` | The whole render: dipper frames (both formats), honey frames, checks, stills, encodes, fast start, copies to `preview/` and `public/golden-pause/`. About 45 minutes on this laptop. |
| `preview/` | The standalone preview player (mock homepage top, live words, controls, fallbacks). Tests in `preview/_test/`. `make-artifact.js` builds the private preview page. |
| `compose.py` | The first film (v1). |

## Rebuild

```bash
node work/honey/raster.js "$(pwd -W)/source/name-mask.png"     # only if the lettering changes
node work/honey/symlayers.js                                    # symbol layers per format
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python sound.py
bash render-v2.sh
```

## Safety and privacy

- Opens from warm parchment, never from black. No cuts. Slow moves only.
- `qa.py` on the final frames: no flashes; the last 0.6 s is a still hold.
- The breathing invitation is optional and never a gate. No holds, no counts, no health claims.
- Nothing is stored or measured. Sound never starts by itself.
