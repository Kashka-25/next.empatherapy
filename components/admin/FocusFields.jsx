'use client';
import { useState } from 'react';
import { DEFAULT_FOCUS } from '@/lib/photos.mjs';

/**
 * Two sliders that choose which part of a photo stays in view when it is shown in a portrait frame.
 * They are ordinary form fields (focus_x, focus_y), so they work without script; with script the photo above moves as
 * you slide, so you can see what will be shown. `imgId` is the photo preview to move.
 */
export default function FocusFields({ imgId, focus }) {
  const start = focus ?? DEFAULT_FOCUS;
  const [x, setX] = useState(start.x);
  const [y, setY] = useState(start.y);
  const move = (nx, ny) => {
    const el = typeof document !== 'undefined' ? document.getElementById(imgId) : null;
    if (el) el.style.objectPosition = `${nx}% ${ny}%`;
  };
  return (
    <fieldset className="stack" style={{ gap: '0.4rem', border: 0, padding: 0 }}>
      <legend className="small">What stays in view</legend>
      <div className="field">
        <label htmlFor={`${imgId}-x`}>Left to right</label>
        <input id={`${imgId}-x`} name="focus_x" type="range" min="0" max="100" step="1" value={x} onChange={(e) => { const v = Number(e.target.value); setX(v); move(v, y); }} />
      </div>
      <div className="field">
        <label htmlFor={`${imgId}-y`}>Top to bottom</label>
        <input id={`${imgId}-y`} name="focus_y" type="range" min="0" max="100" step="1" value={y} onChange={(e) => { const v = Number(e.target.value); setY(v); move(x, v); }} />
      </div>
    </fieldset>
  );
}
