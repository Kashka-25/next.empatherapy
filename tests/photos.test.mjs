import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { inspectImage, tiffOrientation, MAX_BYTES } from '../lib/images/inspect.mjs';
import { createMemoryBlobDriver, createFileBlobDriver, createSupabaseBlobDriver, newImageId, IMAGE_ID, contentTypeFor } from '../lib/images/blobs.mjs';
import { MAX_PHOTOS, addPhoto, updatePhoto, makePrimary, movePhoto, removePhoto, canHavePhotos, isPublicPhoto, cleanAlt, altError } from '../lib/photos.mjs';

const bytes = (...parts) => new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...Buffer.from(p, 'latin1')] : [...p])));
const text = (b) => Buffer.from(b).toString('latin1');
const be16 = (n) => [n >> 8, n & 255];
const be32 = (n) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
const le32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

/* ----- synthetic images (the checker reads structure, so the picture data can be a stand-in) ----- */
const segment = (marker, payload) => [0xff, marker, ...be16(payload.length + 2), ...payload];
function exifApp1({ orientation = 1, extra = 'GPS:-33.8688,151.2093 Canon EOS Jane Doe' } = {}) {
  const tiff = [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0];
  return segment(0xe1, [...Buffer.from('Exif\0\0', 'latin1'), ...tiff, ...Buffer.from(extra, 'latin1')]);
}
function jpeg({ w = 800, h = 600, orientation, extra, comment = 'a secret comment', icc = true } = {}) {
  const parts = [[0xff, 0xd8], segment(0xe0, [...Buffer.from('JFIF\0', 'latin1'), 1, 1, 0, 0, 1, 0, 1, 0, 0])];
  if (orientation !== undefined || extra !== undefined) parts.push(exifApp1({ orientation, extra }));
  parts.push(segment(0xe1, [...Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>name</x:xmpmeta>', 'latin1')]));
  parts.push(segment(0xed, [...Buffer.from('Photoshop 3.0\0IPTC caption Jane', 'latin1')]));
  if (comment) parts.push(segment(0xfe, [...Buffer.from(comment, 'latin1')]));
  if (icc) parts.push(segment(0xe2, [...Buffer.from('ICC_PROFILE\0', 'latin1'), 1, 1, 9, 9]));
  parts.push(segment(0xdb, [0, ...new Array(64).fill(8)]));
  parts.push(segment(0xc0, [8, ...be16(h), ...be16(w), 1, 1, 0x11, 0]));
  parts.push(segment(0xda, [1, 1, 0, 0, 63, 0]));
  parts.push([1, 2, 3, 4, 5, 6, 7, 8, 0xff, 0xd9]);
  return bytes(...parts);
}
const pngChunk = (type, data) => [...be32(data.length), ...Buffer.from(type, 'latin1'), ...data, 0, 0, 0, 0];
function png({ w = 800, h = 600, extraChunks = [] } = {}) {
  const ihdr = pngChunk('IHDR', [...be32(w), ...be32(h), 8, 2, 0, 0, 0]);
  return bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ihdr, ...extraChunks, pngChunk('IDAT', [...deflateSync(Buffer.from([0, 0, 0, 0]))]), pngChunk('IEND', []));
}
const riffChunk = (fourcc, data) => [...Buffer.from(fourcc, 'latin1'), ...le32(data.length), ...data, ...(data.length & 1 ? [0] : [])];
function webp({ w = 800, h = 600, exif, xmp = true, animated = false } = {}) {
  const w1 = w - 1, h1 = h - 1;
  const vp8x = [(exif ? 0x08 : 0) | (xmp ? 0x04 : 0) | (animated ? 0x02 : 0), 0, 0, 0, w1 & 255, (w1 >> 8) & 255, (w1 >> 16) & 255, h1 & 255, (h1 >> 8) & 255, (h1 >> 16) & 255];
  const vp8 = [0, 0, 0, 0x9d, 0x01, 0x2a, w & 255, (w >> 8) & 255, h & 255, (h >> 8) & 255, 1, 2, 3];
  const chunks = [riffChunk('VP8X', vp8x), riffChunk('VP8 ', vp8)];
  if (exif) chunks.push(riffChunk('EXIF', [...Buffer.from('Exif\0\0', 'latin1'), ...exif]));
  if (xmp) chunks.push(riffChunk('XMP ', [...Buffer.from('<x:xmpmeta>name Jane</x:xmpmeta>', 'latin1')]));
  const inner = [...Buffer.from('WEBP', 'latin1'), ...chunks.flat()];
  return bytes('RIFF', le32(inner.length), inner);
}

/* ---------- what is accepted and refused ---------- */
test('photos: files are judged by their bytes, not their name or claimed type', () => {
  for (const [name, data] of [
    ['SVG', bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['HTML', bytes('<!doctype html><script>alert(1)</script>')],
    ['GIF', bytes('GIF89a', new Array(2000).fill(0))],
    ['plain text', bytes('hello'.repeat(300))],
    ['PDF', bytes('%PDF-1.4', new Array(2000).fill(1))],
  ]) assert.equal(inspectImage(data).reason, 'type', name);
  assert.equal(inspectImage(new Uint8Array(0)).reason, 'empty');
  assert.equal(inspectImage(new Uint8Array(MAX_BYTES + 1)).reason, 'too_large');
});

test('photos: size limits on pixels', () => {
  assert.equal(inspectImage(jpeg({ w: 300, h: 900 })).reason, 'too_small');
  assert.equal(inspectImage(jpeg({ w: 9000, h: 1000 })).reason, 'too_big');
  assert.equal(inspectImage(jpeg({ w: 7900, h: 7900 })).reason, 'too_big', 'a huge pixel count is refused even when each side is allowed');
  assert.equal(inspectImage(jpeg({ w: 400, h: 400 })).ok, true);
});

test('photos: truncated or damaged files are refused, never crash', () => {
  const j = jpeg();
  for (const cut of [4, 10, 30, 80]) assert.equal(inspectImage(j.slice(0, cut)).ok, false, `jpeg cut at ${cut}`);
  assert.equal(inspectImage(bytes([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff, 0, 0])).ok, false);
  const p = png();
  for (const cut of [9, 20, 40]) assert.equal(inspectImage(p.slice(0, cut)).ok, false, `png cut at ${cut}`);
  const w = webp();
  for (const cut of [13, 20, 30]) assert.equal(inspectImage(w.slice(0, cut)).ok, false, `webp cut at ${cut}`);
  // random junk behind a valid-looking start
  const junk = new Uint8Array(500).map((_, i) => (i * 37) & 255); junk[0] = 0xff; junk[1] = 0xd8; junk[2] = 0xff;
  assert.equal(inspectImage(junk).ok, false);
});

/* ---------- JPEG ---------- */
test('photos: a JPEG loses location, device, name and caption data but keeps its colour profile', () => {
  const r = inspectImage(jpeg({ orientation: 1 }));
  assert.equal(r.ok, true);
  assert.equal(r.type, 'jpeg'); assert.equal(r.width, 800); assert.equal(r.height, 600);
  const out = text(r.bytes);
  for (const leaked of ['GPS', '-33.8688', 'Canon', 'Jane', 'Exif', 'xmpmeta', 'Photoshop', 'secret comment']) assert.ok(!out.includes(leaked), `${leaked} must be gone`);
  assert.ok(out.includes('JFIF'));
  assert.ok(out.includes('ICC_PROFILE'), 'the colour profile stays so colours look right');
  assert.deepEqual([...r.bytes.slice(0, 2)], [0xff, 0xd8]);
  assert.deepEqual([...r.bytes.slice(-2)], [0xff, 0xd9]);
  assert.ok(r.bytes.length < jpeg({ orientation: 1 }).length);
});

test('photos: phone photos stay upright because only the rotation flag survives', () => {
  const r = inspectImage(jpeg({ orientation: 6 }));
  assert.equal(r.ok, true);
  assert.equal(text(r.bytes).includes('Exif'), true, 'a minimal EXIF block holds the rotation');
  assert.equal(text(r.bytes).includes('GPS'), false);
  const i = text(r.bytes).indexOf('Exif');
  assert.equal(tiffOrientation(r.bytes.slice(i + 6)), 6);
  // cleaning twice changes nothing more
  const again = inspectImage(r.bytes);
  assert.equal(again.ok, true);
  assert.equal(tiffOrientation(again.bytes.slice(text(again.bytes).indexOf('Exif') + 6)), 6);
  assert.equal(inspectImage(jpeg({ orientation: 1 })).bytes.length < r.bytes.length, true, 'no rotation block when none is needed');
});

test('photos: data hidden after the end of a JPEG is dropped', () => {
  const r = inspectImage(bytes(jpeg(), '<script>alert(1)</script> secret trailing data'));
  assert.equal(r.ok, true);
  assert.ok(!text(r.bytes).includes('secret trailing'));
});

/* ---------- PNG ---------- */
test('photos: a PNG loses text and time chunks and is never animated', () => {
  const r = inspectImage(png({ extraChunks: [pngChunk('tEXt', [...Buffer.from('Author\0Jane Doe', 'latin1')]), pngChunk('eXIf', [...Buffer.from('GPS secret', 'latin1')]), pngChunk('tIME', [7, 234, 1, 1, 1, 1, 1]), pngChunk('gAMA', be32(45455))] }));
  assert.equal(r.ok, true);
  const out = text(r.bytes);
  for (const leaked of ['Jane', 'GPS', 'tEXt', 'eXIf', 'tIME']) assert.ok(!out.includes(leaked), leaked);
  assert.ok(out.includes('gAMA') && out.includes('IDAT') && out.includes('IEND'));
  assert.equal(r.width, 800); assert.equal(r.height, 600);
  assert.equal(inspectImage(png({ extraChunks: [pngChunk('acTL', [0, 0, 0, 2, 0, 0, 0, 0])] })).reason, 'animated');
  assert.equal(inspectImage(bytes(png(), '<script>x</script> trailing')).ok, true);
  assert.ok(!text(inspectImage(bytes(png(), 'TRAILING-SECRET')).bytes).includes('TRAILING-SECRET'));
});

/* ---------- WebP ---------- */
test('photos: a WebP loses EXIF and XMP and stays a valid container', () => {
  const r = inspectImage(webp({ exif: [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0] }));
  assert.equal(r.ok, true);
  assert.equal(r.type, 'webp'); assert.equal(r.width, 800); assert.equal(r.height, 600);
  const out = text(r.bytes);
  assert.ok(!out.includes('EXIF') && !out.includes('XMP ') && !out.includes('Jane'));
  assert.ok(out.startsWith('RIFF') && out.slice(8, 12) === 'WEBP');
  const size = r.bytes[4] | (r.bytes[5] << 8) | (r.bytes[6] << 16) | (r.bytes[7] << 24);
  assert.equal(size + 8, r.bytes.length, 'the container size matches the data');
  assert.equal(r.bytes[12 + 8] & (0x08 | 0x04), 0, 'the EXIF and XMP flags are cleared');
  assert.equal(inspectImage(r.bytes).ok, true, 'cleaning is repeatable');
});

test('photos: animated and sideways WebP are refused with a helpful reason', () => {
  assert.equal(inspectImage(webp({ animated: true })).reason, 'animated');
  const sideways = [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0];
  assert.equal(inspectImage(webp({ exif: sideways })).reason, 'rotated');
});

/* ---------- storage of the files ---------- */
async function blobContract(d) {
  const id = newImageId('jpg');
  assert.match(id, IMAGE_ID);
  assert.equal(await d.get(id), null);
  await d.put(id, new Uint8Array([1, 2, 3]), 'image/jpeg');
  const got = await d.get(id);
  assert.deepEqual([...got.bytes], [1, 2, 3]);
  assert.equal(got.contentType, 'image/jpeg');
  assert.equal(await d.remove(id), true);
  assert.equal(await d.remove(id), false);
  assert.equal(await d.get(id), null);
  for (const evil of ['../secret.jpg', 'a.jpg', `${'a'.repeat(32)}.svg`, `${'a'.repeat(32)}.jpg/../x`]) await assert.rejects(() => d.get(evil), /Invalid image id/);
}
test('photo storage: memory and file drivers follow the contract', async () => {
  await blobContract(createMemoryBlobDriver());
  const dir = await mkdtemp(path.join(tmpdir(), 'emp-img-'));
  try { await blobContract(createFileBlobDriver(dir)); } finally { await rm(dir, { recursive: true, force: true }); }
  assert.equal(contentTypeFor('x.webp'), 'image/webp');
  assert.equal(contentTypeFor('x.svg'), null);
});

test('photo storage: the Supabase driver speaks the storage API and keeps its key private', async () => {
  const files = new Map();
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url); calls.push({ u, init });
    assert.equal(init.headers.Authorization, 'Bearer service-role-key-that-is-long');
    assert.ok(u.pathname.startsWith('/storage/v1/object/alchemist-photos/'));
    const name = u.pathname.split('/').pop();
    const method = init.method ?? 'GET';
    if (method === 'POST') { files.set(name, new Uint8Array(init.body)); return { ok: true, status: 200 }; }
    if (method === 'DELETE') { const had = files.delete(name); return { ok: had, status: had ? 200 : 404 }; }
    if (!files.has(name)) return { ok: false, status: 404 };
    return { ok: true, status: 200, arrayBuffer: async () => files.get(name).buffer.slice(0) };
  };
  await blobContract(createSupabaseBlobDriver({ url: 'https://abc.supabase.co/', key: 'service-role-key-that-is-long', fetchImpl }));
  assert.ok(calls.some((c) => c.init.headers?.['x-upsert'] === 'true'));
  const failing = createSupabaseBlobDriver({ url: 'https://abc.supabase.co', key: 'service-role-key-that-is-long', fetchImpl: async () => ({ ok: false, status: 500 }) });
  await assert.rejects(() => failing.put(newImageId('png'), new Uint8Array([1]), 'image/png'), /500/);
});

/* ---------- the list of photos on a profile ---------- */
const P = (id, extra = {}) => ({ id, alt: `photo ${id}`, ...extra });
test('profile photos: up to five, first is the profile picture, reorder, replace, remove', () => {
  let photos = [];
  for (const id of ['a', 'b', 'c', 'd', 'e']) { const r = addPhoto(photos, P(id)); assert.equal(r.ok, true); photos = r.photos; }
  assert.equal(MAX_PHOTOS, 5);
  assert.equal(addPhoto(photos, P('f')).reason, 'full');
  assert.deepEqual(photos.map((p) => p.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(makePrimary(photos, 'd').photos.map((p) => p.id), ['d', 'a', 'b', 'c', 'e']);
  assert.deepEqual(movePhoto(photos, 'b', 'left').photos.map((p) => p.id), ['b', 'a', 'c', 'd', 'e']);
  assert.deepEqual(movePhoto(photos, 'b', 'right').photos.map((p) => p.id), ['a', 'c', 'b', 'd', 'e']);
  assert.deepEqual(movePhoto(photos, 'a', 'left').photos.map((p) => p.id), ['a', 'b', 'c', 'd', 'e'], 'the first cannot move further left');
  assert.deepEqual(movePhoto(photos, 'e', 'right').photos.map((p) => p.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(removePhoto(photos, 'a').photos.map((p) => p.id), ['b', 'c', 'd', 'e']);
  assert.equal(updatePhoto(photos, 'c', { alt: 'new text', caption: 'hi' }).photos[2].alt, 'new text');
  for (const fn of [() => makePrimary(photos, 'zz'), () => movePhoto(photos, 'zz', 'left'), () => removePhoto(photos, 'zz'), () => updatePhoto(photos, 'zz', {})]) assert.equal(fn().reason, 'not_found');
  assert.equal(addPhoto(undefined, P('x')).photos.length, 1);
});

test('profile photos: alt text is required and cleaned, fictional examples never get photos', () => {
  assert.ok(altError(cleanAlt('  hi ')));
  assert.equal(altError(cleanAlt('Mira smiling in a sunlit garden')), null);
  assert.equal(cleanAlt('<b>bold</b>\n  text'), 'bbold/b text');
  assert.equal(cleanAlt('x'.repeat(500)).length, 200);
  assert.equal(canHavePhotos({ demo: true }), false);
  assert.equal(canHavePhotos({ demo: false }), true);
  assert.equal(canHavePhotos({}), true);
});

test('profile photos: only images on public profiles count as public', () => {
  const pub = [{ photos: [P('one'), P('two')] }, { photos: undefined }];
  assert.equal(isPublicPhoto(pub, 'two'), true);
  assert.equal(isPublicPhoto(pub, 'draft-only'), false);
  assert.equal(isPublicPhoto([], 'one'), false);
});
