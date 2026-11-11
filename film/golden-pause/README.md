# The Golden Pause: film production

A 12-second optional breathing moment for the Empatherapy homepage. Honey falls from a wooden dipper into
chamomile tea, the camera drifts into the golden stream, the honey meets the lemon, and the ripple settles into
the welcome. Words, logo and sound controls are live HTML on the page; the film itself has no words.

Everything here is reproducible from the files in this folder with Blender 5.2 (its bundled Python and numpy).
No other software, no downloads, no AI service at runtime.

| File | What it does |
|---|---|
| `cues.json` | The single clock: shots, camera moves, breath windows, text fades, contact, welcome, sound resolve. |
| `source/` | The still plates (generated in ChatGPT by Cassidy): `a-cup`, `b-dipper`, `c-inside-honey`, `d-meeting`, `e-lemon`, `f-chamomile`. |
| `compose.py` | The film compositor: eased camera moves, flowing honey, refracting ripples, bubbles, sunlit motes, the breathing glow, dissolves in linear light, the chamomile-framed welcome plate. Renders frames, stills and MP4. |
| `sound.py` | The soundscape, synthesised in code: music bed that swells with the breath, glass notes, pour, the settle at contact, the resolving chord. Measures loudness (BS.1770) and writes the WAV, AAC and Opus files. |
| `qa.py` | Checks rendered frames: flashes (WCAG 2.3.1 style), biggest frame-to-frame change, and that the final half-second is a still hold. |
| `contact.py` | Contact sheets of frames for review. |
| `preview/` | The standalone preview player (mock homepage top, live words, ring, controls, fallbacks). Tests in `preview/_test/`. |

## Rebuild

```bash
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
"$B" -b --factory-startup --python compose.py -- --variant wide --all      # about 10 minutes
"$B" -b --factory-startup --python compose.py -- --variant square --all
"$B" -b --factory-startup --python qa.py -- "$(pwd -W)/out/frames-wide"
"$B" -b --factory-startup --python compose.py -- --variant wide --stills
"$B" -b --factory-startup --python compose.py -- --variant wide --encode --kbps 2600
"$B" -b --factory-startup --python compose.py -- --variant square --stills
"$B" -b --factory-startup --python compose.py -- --variant square --encode --kbps 1700
"$B" -b --factory-startup --python sound.py
```

Blender writes the MP4 index at the end of the file; move it to the front before publishing (see `mp4_faststart`
in `sound.py`). Final web files live in `public/golden-pause/`; copy them into `preview/` to run the preview.

## Safety and privacy

- Opens from warm parchment, never from black. Dissolves only, no cuts. Rotation at most 2 degrees, slow pans.
- `qa.py` on the final frames: no flashes, last 12 frames identical.
- The breathing invitation is optional and never a gate. No holds, no counts, no health claims.
- Nothing is stored or measured. Sound never starts by itself.
