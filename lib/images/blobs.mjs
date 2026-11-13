/**
 * Where uploaded photo files live. A small interface, like the record store:
 *
 *   put(id, bytes, contentType)   -> Promise<void>
 *   get(id)                       -> Promise<{ bytes, contentType } | null>
 *   remove(id)                    -> Promise<boolean>
 *
 * Drivers follow EMPATHERAPY_STORE: "file" keeps files in .data/images (local work only), "supabase" uses a
 * PRIVATE Supabase Storage bucket reached only by the server. Photos are never served straight from the bucket:
 * they go through /media, which checks that the photo belongs to a profile that is public.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { storeKind } from '../store/index.mjs';

export const IMAGE_ID = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const newImageId = (ext) => `${randomUUID().replace(/-/g, '')}.${ext}`;
export const contentTypeFor = (id) => TYPES[String(id).split('.')[1]] ?? null;
const assertId = (id) => { if (!IMAGE_ID.test(id)) throw new Error('Invalid image id.'); };

export function createMemoryBlobDriver() {
  const files = new Map();
  return {
    name: 'memory',
    async put(id, bytes, contentType) { assertId(id); files.set(id, { bytes: new Uint8Array(bytes), contentType }); },
    async get(id) { assertId(id); const f = files.get(id); return f ? { bytes: new Uint8Array(f.bytes), contentType: f.contentType } : null; },
    async remove(id) { assertId(id); return files.delete(id); },
  };
}

export function createFileBlobDriver(dir) {
  const file = (id) => { assertId(id); return path.join(dir, id); };
  return {
    name: 'file',
    async put(id, bytes) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(file(id), bytes); },
    async get(id) {
      try { return { bytes: new Uint8Array(await fs.readFile(file(id))), contentType: contentTypeFor(id) }; }
      catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    },
    async remove(id) {
      try { await fs.unlink(file(id)); return true; }
      catch (e) { if (e.code === 'ENOENT') return false; throw e; }
    },
  };
}

export function createSupabaseBlobDriver({ url, key, bucket = 'alchemist-photos', fetchImpl = globalThis.fetch }) {
  const base = `${url.replace(/\/+$/, '')}/storage/v1/object/${bucket}`;
  const auth = { apikey: key, Authorization: `Bearer ${key}` };
  return {
    name: 'supabase',
    async put(id, bytes, contentType) {
      assertId(id);
      const res = await fetchImpl(`${base}/${id}`, { method: 'POST', headers: { ...auth, 'Content-Type': contentType, 'x-upsert': 'true' }, body: bytes, cache: 'no-store' });
      if (!res.ok) throw new Error(`Photo storage request failed (${res.status}).`);
    },
    async get(id) {
      assertId(id);
      const res = await fetchImpl(`${base}/${id}`, { headers: auth, cache: 'no-store' });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`Photo storage request failed (${res.status}).`);
      return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: contentTypeFor(id) };
    },
    async remove(id) {
      assertId(id);
      const res = await fetchImpl(`${base}/${id}`, { method: 'DELETE', headers: auth, cache: 'no-store' });
      if (res.status === 404 || res.status === 400) return false;
      if (!res.ok) throw new Error(`Photo storage request failed (${res.status}).`);
      return true;
    },
  };
}

let cached;
/** The configured photo store, or null when storage is off. */
export function getBlobStore(env = process.env) {
  if (cached !== undefined && env === process.env) return cached;
  const kind = storeKind(env);
  let store = null;
  if (kind === 'file') store = createFileBlobDriver(path.resolve(env.EMPATHERAPY_DATA_DIR || '.data', 'images'));
  if (kind === 'supabase') store = createSupabaseBlobDriver({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_PHOTO_BUCKET || 'alchemist-photos' });
  if (env === process.env) cached = store;
  return store;
}
