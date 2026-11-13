'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * A photo file field that lets the person frame the photo before it is sent.
 * It is an enhancement: the field is a normal file input named "photo", so the form still works without any script.
 * Cropping happens in the browser; the cropped picture replaces the chosen file. The server still checks and cleans
 * every image, so nothing here is trusted.
 */
const RATIOS = [
  { id: 'original', label: 'Whole photo', ratio: 0 },
  { id: 'square', label: 'Square', ratio: 1 },
  { id: 'portrait', label: 'Portrait 4:5', ratio: 4 / 5 },
  { id: 'landscape', label: 'Landscape 3:2', ratio: 3 / 2 },
];
const PREVIEW_W = 320;
const MAX_LONG_SIDE = 2400;

export default function CropPicker({ minSide = 600 }) {
  const input = useRef(null);
  const canvas = useRef(null);
  const original = useRef(null); // the file as chosen
  const bitmap = useRef(null);
  const drag = useRef(null);
  const [has, setHas] = useState(false);
  const [ratioId, setRatioId] = useState('original');
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 }); // fractions of the photo
  const [info, setInfo] = useState('');
  const [problem, setProblem] = useState('');

  const ratio = RATIOS.find((r) => r.id === ratioId).ratio;

  /** the crop rectangle in the photo's own pixels */
  const rectFor = () => {
    const b = bitmap.current;
    if (!b) return null;
    const a = ratio || b.width / b.height;
    let w = b.width, h = w / a;
    if (h > b.height) { h = b.height; w = h * a; }
    w /= zoom; h /= zoom;
    const x = Math.min(Math.max(center.x * b.width - w / 2, 0), b.width - w);
    const y = Math.min(Math.max(center.y * b.height - h / 2, 0), b.height - h);
    return { x, y, w, h };
  };

  const draw = () => {
    const c = canvas.current, r = rectFor();
    if (!c || !r) return;
    const h = Math.round(PREVIEW_W * (r.h / r.w));
    c.width = PREVIEW_W; c.height = h;
    c.getContext('2d').drawImage(bitmap.current, r.x, r.y, r.w, r.h, 0, 0, PREVIEW_W, h);
  };

  /** puts the framed photo into the form's file field */
  const apply = () => {
    const r = rectFor(), el = input.current;
    if (!r || !el || !original.current) return;
    const untouched = !ratio && zoom === 1;
    const done = (file) => { const dt = new DataTransfer(); dt.items.add(file); el.files = dt.files; };
    if (untouched) { done(original.current); setInfo(`${bitmap.current.width} × ${bitmap.current.height} pixels, as it is`); setProblem(''); return; }
    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(r.w, r.h));
    const out = document.createElement('canvas');
    out.width = Math.round(r.w * scale); out.height = Math.round(r.h * scale);
    out.getContext('2d').drawImage(bitmap.current, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const base = original.current.name.replace(/\.[^.]+$/, '') || 'photo';
      done(new File([blob], `${base}-cropped.jpg`, { type: 'image/jpeg' }));
      setInfo(`${out.width} × ${out.height} pixels after framing`);
      setProblem(Math.min(out.width, out.height) < minSide ? `This framing is only ${Math.min(out.width, out.height)} pixels on its shortest side. Please zoom out a little: it needs at least ${minSide}.` : '');
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => { if (has) { draw(); apply(); } }, [has, ratioId, zoom, center]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { setHas(false); bitmap.current = null; original.current = null; setInfo(''); setProblem(''); return; }
    original.current = file;
    try { bitmap.current = await createImageBitmap(file); } catch { bitmap.current = null; setHas(false); return; } // the server will explain if the file is not usable
    setRatioId('original'); setZoom(1); setCenter({ x: 0.5, y: 0.5 }); setHas(true);
  };

  const nudge = (dx, dy) => setCenter((c) => ({ x: Math.min(1, Math.max(0, c.x + dx)), y: Math.min(1, Math.max(0, c.y + dy)) }));
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (!drag.current || !bitmap.current) return;
    const r = rectFor(), canvasEl = canvas.current;
    const perPx = r.w / canvasEl.getBoundingClientRect().width; // photo pixels per screen pixel
    const dx = (e.clientX - drag.current.x) * perPx, dy = (e.clientY - drag.current.y) * perPx;
    drag.current = { x: e.clientX, y: e.clientY };
    nudge(-dx / bitmap.current.width, -dy / bitmap.current.height);
  };
  const onUp = () => { drag.current = null; };
  const onKey = (e) => {
    const step = 0.03 / zoom;
    const k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (k) { e.preventDefault(); nudge(...k); }
  };

  return (
    <div className="stack" style={{ gap: '0.8rem' }}>
      <input ref={input} id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={onFile} />
      {has ? (
        <div className="stack" style={{ gap: '0.7rem' }} aria-label="Frame the photo">
          <fieldset className="row" style={{ border: 0, padding: 0, gap: '0.5rem', flexWrap: 'wrap' }}>
            <legend className="small" style={{ marginBottom: '0.3rem' }}>Shape</legend>
            {RATIOS.map((r) => (
              <label key={r.id} className="check"><input type="radio" name="crop-shape" checked={ratioId === r.id} onChange={() => { setRatioId(r.id); setZoom(1); }} /><span>{r.label}</span></label>
            ))}
          </fieldset>
          <canvas
            ref={canvas} tabIndex={0} role="img"
            aria-label="Preview of the framed photo. Drag, or use the arrow keys, to move the photo inside the frame."
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
            style={{ width: PREVIEW_W, maxWidth: '100%', borderRadius: 12, border: '1px solid var(--border)', touchAction: 'none', cursor: 'grab' }}
          />
          <div className="field" style={{ maxWidth: PREVIEW_W }}>
            <label htmlFor="crop-zoom">Zoom</label>
            <input id="crop-zoom" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </div>
          <p className="small" role="status" aria-live="polite" style={{ color: problem ? '#9B3B22' : 'var(--muted)' }}>{problem || info}</p>
          <p className="small" style={{ color: 'var(--muted)' }}>Drag the photo to move it inside the frame. What you see here is what is uploaded, and your own photo is not changed.</p>
        </div>
      ) : null}
    </div>
  );
}
