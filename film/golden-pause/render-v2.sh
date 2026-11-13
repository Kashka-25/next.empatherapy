#!/usr/bin/env bash
# Full render of The Golden Pause v2: dipper frames (both formats), honey frames, checks, stills, encodes.
# Run from this folder. Assumes the wide dipper may already be rendering (waits for its DONE line).
set -u
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
D="$(pwd -W)"
log() { echo "[$(date +%H:%M:%S)] $*"; }
if [ -f work/dipper-wide.log ]; then
  until grep -q "DONE" work/dipper-wide.log; do sleep 10; done
else
  "$B" -b --python dipper.py -- --variant wide --all > work/dipper-wide.log 2>&1
fi
log "dipper wide done: $(grep DONE work/dipper-wide.log)"
"$B" -b --python dipper.py -- --variant square --all > work/dipper-square.log 2>&1
log "dipper square done: $(grep DONE work/dipper-square.log)"
for v in wide square; do
  rm -rf "out/v2-frames-$v"
  "$B" -b --factory-startup --python honey.py -- --variant $v --all > "work/honey-$v.log" 2>&1
  log "honey $v: $(grep -E 'DONE|Error|Traceback' work/honey-$v.log | tail -2)"
  sed "s/cues.json/cues.json/" qa.py > /dev/null
  "$B" -b --factory-startup --python qa.py -- "$D/out/v2-frames-$v" 2>&1 | grep QA | sed "s/^/[$v] /"
  "$B" -b --factory-startup --python honey.py -- --variant $v --stills 2>&1 | grep STILL
done
"$B" -b --factory-startup --python honey.py -- --variant wide --encode --kbps 2600 2>&1 | grep ENCODED
"$B" -b --factory-startup --python honey.py -- --variant square --encode --kbps 1700 2>&1 | grep ENCODED
B2="$B"; "$B2" -b --factory-startup --python work/faststart.py -- v2/film-wide.mp4 v2/film-square.mp4 2>&1 | grep FAST
cp out/v2/film-*.mp4 out/v2/poster-*.jpg out/v2/still-*.jpg out/v2/end-*.jpg preview/ && cp out/v2/film-*.mp4 out/v2/poster-*.jpg out/v2/still-*.jpg out/v2/end-*.jpg ../../public/golden-pause/
log "ALL DONE"
