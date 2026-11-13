/**
 * Checks an uploaded photo and cleans it, with no image library.
 *
 * Accepts JPEG, PNG and WebP, decided by the file's own bytes (never its name or the type the browser claims).
 * SVG, GIF, HTML and anything else is refused. The photo is then rewritten without its hidden metadata:
 * camera and phone photos carry GPS location, device details and sometimes a name, none of which should be
 * published. The only thing kept is the rotation flag, so phone photos still stand upright.
 * Colour profiles are kept. Animated images are refused.
 *
 * It does not re-encode the picture, so quality is untouched.
 */
export const MAX_BYTES = 5 * 1024 * 1024;
export const MIN_SIDE = 400;
export const MAX_SIDE = 8000;
export const MAX_PIXELS = 50_000_000;

export const IMAGE_MESSAGES = {
  empty: 'That file is empty.',
  too_large: 'That photo is larger than 5 MB. Please use a smaller one.',
  type: 'Please use a JPEG, PNG or WebP photo.',
  corrupt: 'That photo could not be read. It may be damaged. Please try another.',
  animated: 'Animated images are not supported. Please use a still photo.',
  rotated: 'This WebP photo is stored sideways. Please rotate it upright and save it again, or use a JPEG.',
  too_small: `That photo is too small. Please use one at least ${MIN_SIDE} pixels on its shortest side.`,
  too_big: 'That photo is extremely large in pixels. Please resize it and try again.',
};

class ImageError extends Error { constructor(code) { super(code); this.code = code; } }
const bad = (code) => new ImageError(code);

const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
const concat = (parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** The rotation flag (1 to 8) from a TIFF block, or 1 when absent or unreadable. */
export function tiffOrientation(t) {
  if (t.length < 8) return 1;
  const little = t[0] === 0x49 && t[1] === 0x49;
  if (!little && !(t[0] === 0x4d && t[1] === 0x4d)) return 1;
  const u16 = (o) => (little ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o) => (little ? u32le(t, o) : u32be(t, o));
  if (u16(2) !== 42) return 1;
  const ifd = u32(4);
  if (ifd + 2 > t.length) return 1;
  const n = Math.min(u16(ifd), 64);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > t.length) break;
    if (u16(e) === 0x0112) { const v = u16(e + 8); return v >= 1 && v <= 8 ? v : 1; }
  }
  return 1;
}
const exifOrientation = (payload) => tiffOrientation(ascii(payload, 0, 4) === 'Exif' ? payload.subarray(6) : payload);

/** A tiny EXIF block holding only the rotation flag. */
function orientationSegment(o) {
  const tiff = [0x49, 0x49, 0x2a, 0x00, 0x08, 0, 0, 0, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0, 0, 0, o, 0, 0, 0, 0, 0, 0, 0];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = payload.length + 2;
  return new Uint8Array([0xff, 0xe1, len >> 8, len & 255, ...payload]);
}

/* ---------- JPEG ---------- */
function cleanJpeg(b) {
  let pos = 2, width = 0, height = 0, orientation = 1;
  const kept = [];
  let tail = null;
  while (pos < b.length) {
    if (b[pos] !== 0xff) throw bad('corrupt');
    while (pos < b.length && b[pos] === 0xff) pos++;
    const m = pos; // index of the marker byte
    if (m >= b.length) throw bad('corrupt');
    const marker = b[m];
    pos = m + 1;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue; // stand-alone markers
    if (marker === 0xd9) break; // end of image
    if (pos + 2 > b.length) throw bad('corrupt');
    const len = u16be(b, pos);
    if (len < 2 || pos + len > b.length) throw bad('corrupt');
    const payload = b.subarray(pos + 2, pos + len);
    const seg = concat([new Uint8Array([0xff, marker]), b.subarray(pos, pos + len)]);
    if (marker === 0xda) { // start of scan: the rest is picture data, up to the last end-of-image marker
      if (!width) throw bad('corrupt');
      let end = -1;
      for (let i = b.length - 2; i > pos; i--) if (b[i] === 0xff && b[i + 1] === 0xd9) { end = i + 2; break; }
      if (end < 0) throw bad('corrupt');
      tail = concat([seg, b.subarray(pos + len, end)]);
      break;
    }
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (len < 8) throw bad('corrupt');
      height = u16be(payload, 1); width = u16be(payload, 3);
      kept.push(seg);
    } else if (marker === 0xe1) {
      if (ascii(payload, 0, 4) === 'Exif') orientation = exifOrientation(payload);
      // dropped: EXIF and XMP
    } else if ((marker >= 0xe3 && marker <= 0xed) || marker === 0xef || marker === 0xfe) {
      // dropped: other application data (such as IPTC captions) and comments
    } else {
      kept.push(seg); // tables, JFIF header, colour profile, Adobe colour flag
    }
    pos += len;
  }
  if (!tail || !width || !height) throw bad('corrupt');
  const head = [new Uint8Array([0xff, 0xd8])];
  const rotate = orientation !== 1 ? orientationSegment(orientation) : null;
  kept.forEach((seg, i) => { head.push(seg); if (rotate && i === 0 && seg[1] === 0xe0) head.push(rotate); });
  if (rotate && !(kept[0] && kept[0][1] === 0xe0)) head.splice(1, 0, rotate);
  return { type: 'jpeg', ext: 'jpg', contentType: 'image/jpeg', width, height, bytes: concat([...head, tail]) };
}

/* ---------- PNG ---------- */
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD', 'pHYs']);
function cleanPng(b) {
  let pos = 8, width = 0, height = 0, sawIdat = false, sawEnd = false;
  const out = [b.subarray(0, 8)];
  let first = true;
  while (pos + 12 <= b.length) {
    const len = u32be(b, pos);
    if (len > 0x7fffffff || pos + 12 + len > b.length) throw bad('corrupt');
    const type = ascii(b, pos + 4, 4);
    if (first) { if (type !== 'IHDR' || len !== 13) throw bad('corrupt'); width = u32be(b, pos + 8); height = u32be(b, pos + 12); first = false; }
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') throw bad('animated');
    if (PNG_KEEP.has(type)) out.push(b.subarray(pos, pos + 12 + len));
    else if (type[0] >= 'A' && type[0] <= 'Z') throw bad('corrupt'); // an unknown chunk the picture may need
    if (type === 'IDAT') sawIdat = true;
    pos += 12 + len;
    if (type === 'IEND') { sawEnd = true; break; }
  }
  if (!sawIdat || !sawEnd || !width || !height) throw bad('corrupt');
  return { type: 'png', ext: 'png', contentType: 'image/png', width, height, bytes: concat(out) };
}

/* ---------- WebP ---------- */
function cleanWebp(b) {
  const riff = u32le(b, 4);
  if (riff < 4 || riff + 8 > b.length) throw bad('corrupt');
  const end = riff + 8;
  let pos = 12, canvas = null, dims = null, sawImage = false;
  const chunks = [];
  while (pos + 8 <= end) {
    const fourcc = ascii(b, pos, 4);
    const size = u32le(b, pos + 4);
    const start = pos + 8;
    if (start + size > end) throw bad('corrupt');
    const data = b.subarray(start, start + size);
    if (fourcc === 'VP8X') {
      if (size < 10) throw bad('corrupt');
      if (data[0] & 0x02) throw bad('animated');
      canvas = { w: u24le(data, 4) + 1, h: u24le(data, 7) + 1 };
      const copy = new Uint8Array(data); copy[0] &= ~(0x08 | 0x04); // no EXIF, no XMP
      chunks.push([fourcc, copy]);
    } else if (fourcc === 'ANIM' || fourcc === 'ANMF') {
      throw bad('animated');
    } else if (fourcc === 'EXIF') {
      if (exifOrientation(data) !== 1) throw bad('rotated');
    } else if (fourcc === 'VP8 ') {
      if (size < 10 || data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) throw bad('corrupt');
      dims = { w: (data[6] | (data[7] << 8)) & 0x3fff, h: (data[8] | (data[9] << 8)) & 0x3fff };
      sawImage = true; chunks.push([fourcc, data]);
    } else if (fourcc === 'VP8L') {
      if (size < 5 || data[0] !== 0x2f) throw bad('corrupt');
      const bits = u32le(data, 1);
      dims = { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
      sawImage = true; chunks.push([fourcc, data]);
    } else if (fourcc === 'ALPH' || fourcc === 'ICCP') {
      chunks.push([fourcc, data]);
    } // anything else (XMP, unknown) is dropped
    pos = start + size + (size & 1);
  }
  const size = canvas ?? dims;
  if (!sawImage || !size || !size.w || !size.h) throw bad('corrupt');
  const body = [new Uint8Array([0x57, 0x45, 0x42, 0x50])]; // "WEBP"
  for (const [fourcc, data] of chunks) {
    const head = new Uint8Array(8);
    for (let i = 0; i < 4; i++) head[i] = fourcc.charCodeAt(i);
    head[4] = data.length & 255; head[5] = (data.length >> 8) & 255; head[6] = (data.length >> 16) & 255; head[7] = (data.length >>> 24) & 255;
    body.push(head, data);
    if (data.length & 1) body.push(new Uint8Array(1));
  }
  const inner = concat(body);
  const riffHead = new Uint8Array([0x52, 0x49, 0x46, 0x46, inner.length & 255, (inner.length >> 8) & 255, (inner.length >> 16) & 255, (inner.length >>> 24) & 255]);
  return { type: 'webp', ext: 'webp', contentType: 'image/webp', width: size.w, height: size.h, bytes: concat([riffHead, inner]) };
}

/** { ok: true, type, ext, contentType, width, height, bytes } or { ok: false, reason }. */
export function inspectImage(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const fail = (reason) => ({ ok: false, reason });
  if (b.length === 0) return fail('empty');
  if (b.length > MAX_BYTES) return fail('too_large');
  let r;
  try {
    if (b.length > 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) r = cleanPng(b);
    else if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) r = cleanJpeg(b);
    else if (b.length > 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') r = cleanWebp(b);
    else return fail('type');
  } catch (e) {
    return fail(e instanceof ImageError ? e.code : 'corrupt');
  }
  if (Math.min(r.width, r.height) < MIN_SIDE) return fail('too_small');
  if (Math.max(r.width, r.height) > MAX_SIDE || r.width * r.height > MAX_PIXELS) return fail('too_big');
  return { ok: true, ...r };
}
