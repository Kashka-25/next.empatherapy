// The site's logo lettering: "Empatherapy" in the film's script (Vladimir Script, drawn as work/honey/raster.js drew
// the name the honey writes: filled, plus a round-joined stroke 0.034 of the letter size), as one vector path.
// It reads the font's own outlines (no libraries). The font has no kerning and no letter substitutions, so the letters
// sit on their own advances, exactly as Chrome laid them out for the film. Checked against the film's wordmark
// (wordmark-script.webp): 99% of the lettering is shared; the rest is soft edges.
// Writes components/layout/wordmark.js. Run from this folder:
//   node wordmark-svg.js [path/to/VLADIMIR.TTF]          (default: the copy that comes with Windows)
const fs = require('fs');
const path = require('path');
const fontPath = process.argv[2] || 'C:/Windows/Fonts/VLADIMIR.TTF';
const TEXT = 'Empatherapy';
const STROKE = 0.034;                       // raster.js: lineWidth = size * 0.034, with round joins and caps
const OUT = path.join(__dirname, '..', '..', 'components', 'layout', 'wordmark.js');

const buf = fs.readFileSync(fontPath);
const u16 = (o) => buf.readUInt16BE(o), i16 = (o) => buf.readInt16BE(o), u32 = (o) => buf.readUInt32BE(o);
const tables = {};
for (let i = 0; i < u16(4); i++) { const r = 12 + i * 16; tables[buf.toString('latin1', r, r + 4)] = { off: u32(r + 8) }; }
const unitsPerEm = u16(tables.head.off + 18), longLoca = i16(tables.head.off + 50) === 1;
const numHMetrics = u16(tables.hhea.off + 34);
if (tables.kern || tables.GPOS || tables.GSUB) throw new Error('this font has kerning or substitutions: lay them out first');

// cmap format 4 (Windows, Unicode BMP)
const glyphOf = (() => {
  const c = tables.cmap.off; let sub = null;
  for (let i = 0; i < u16(c + 2); i++) {
    const pid = u16(c + 4 + i * 8), eid = u16(c + 6 + i * 8), off = u32(c + 8 + i * 8);
    if (u16(c + off) === 4 && pid === 3 && (eid === 1 || eid === 0)) { sub = c + off; if (eid === 1) break; }
  }
  const segX2 = u16(sub + 6), ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
  return (code) => {
    for (let s = 0; s < segX2 / 2; s++) {
      if (code > u16(ends + s * 2)) continue;
      const start = u16(starts + s * 2); if (code < start) return 0;
      const delta = i16(deltas + s * 2), ro = u16(ranges + s * 2);
      if (ro === 0) return (code + delta) & 0xffff;
      const g = u16(ranges + s * 2 + ro + (code - start) * 2); return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
})();
const advance = (g) => u16(tables.hmtx.off + 4 * Math.min(g, numHMetrics - 1));
const loca = (g) => (longLoca ? u32(tables.loca.off + g * 4) : u16(tables.loca.off + g * 2) * 2);

/** a glyph's contours, as lists of {x, y, on} in font units (y up) */
function contours(g, depth = 0) {
  const start = loca(g), end = loca(g + 1);
  if (end <= start) return [];
  const o = tables.glyf.off + start, nC = i16(o);
  if (nC >= 0) {
    const endPts = []; for (let i = 0; i < nC; i++) endPts.push(u16(o + 10 + i * 2));
    const nPts = endPts[nC - 1] + 1;
    let p = o + 10 + nC * 2; p += 2 + u16(p);
    const flags = [];
    while (flags.length < nPts) { const f = buf[p++]; flags.push(f); if (f & 8) { let r = buf[p++]; while (r--) flags.push(f); } }
    const xs = [], ys = []; let v = 0;
    for (const f of flags) { if (f & 2) { const d = buf[p++]; v += (f & 16) ? d : -d; } else if (!(f & 16)) { v += i16(p); p += 2; } xs.push(v); }
    v = 0;
    for (const f of flags) { if (f & 4) { const d = buf[p++]; v += (f & 32) ? d : -d; } else if (!(f & 32)) { v += i16(p); p += 2; } ys.push(v); }
    const out = []; let s = 0;
    for (const e of endPts) { const c = []; for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) }); out.push(c); s = e + 1; }
    return out;
  }
  const out = []; let p = o + 10, more = true;            // a composite glyph
  while (more && depth < 8) {
    const fl = u16(p), gi = u16(p + 2); p += 4;
    let dx, dy;
    if (fl & 1) { dx = i16(p); dy = i16(p + 2); p += 4; } else { dx = buf.readInt8(p); dy = buf.readInt8(p + 1); p += 2; }
    let a = 1, b = 0, c = 0, d = 1; const f2 = (q) => i16(q) / 16384;
    if (fl & 8) { a = d = f2(p); p += 2; } else if (fl & 0x40) { a = f2(p); d = f2(p + 2); p += 4; } else if (fl & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
    for (const ct of contours(gi, depth + 1)) out.push(ct.map((q) => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
    more = !!(fl & 0x20);
  }
  return out;
}

/** one contour (quadratic, with implied on-curve points) as SVG path commands, y down, moved right by x0 */
function pathOf(ct, x0) {
  const P = (q) => `${Math.round(q.x + x0)} ${Math.round(-q.y)}`;
  if (!ct.length) return '';
  const s = ct.findIndex((q) => q.on);
  const pts = s < 0 ? [{ x: (ct[0].x + ct[1].x) / 2, y: (ct[0].y + ct[1].y) / 2, on: true }, ...ct.slice(1), ct[0]] : [...ct.slice(s), ...ct.slice(0, s)];
  const N = pts.length;
  let d = `M${P(pts[0])}`, i = 1;
  while (i <= N) {
    const q = pts[i % N];
    if (q.on) { d += `L${P(q)}`; i++; continue; }
    const nx = pts[(i + 1) % N];
    if (nx.on) { d += `Q${P(q)} ${P(nx)}`; i += 2; } else { d += `Q${P(q)} ${P({ x: (q.x + nx.x) / 2, y: (q.y + nx.y) / 2 })}`; i += 1; }
  }
  return d + 'Z';
}

let x = 0, d = '', minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const ch of TEXT) {
  const g = glyphOf(ch.codePointAt(0));
  for (const ct of contours(g)) {
    d += pathOf(ct, x);
    for (const q of ct) { minX = Math.min(minX, q.x + x); maxX = Math.max(maxX, q.x + x); minY = Math.min(minY, -q.y); maxY = Math.max(maxY, -q.y); }
  }
  x += advance(g);
}
const sw = STROKE * unitsPerEm;
const pad = sw / 2 + 1;
const vb = [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].map((v) => Math.round(v));
const mod = `// Generated by film/golden-pause/wordmark-svg.js: "Empatherapy" in the film's script, as one path. Do not edit.
export const WORDMARK = {
  viewBox: '${vb.join(' ')}',
  aspect: ${+(vb[2] / vb[3]).toFixed(4)},
  strokeWidth: ${Math.round(sw)},
  d: '${d}',
};
`;
fs.writeFileSync(OUT, mod);
console.log(JSON.stringify({ out: OUT, bytes: mod.length, viewBox: vb, aspect: +(vb[2] / vb[3]).toFixed(4), strokeWidth: Math.round(sw) }));
