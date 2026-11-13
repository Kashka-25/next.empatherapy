/**
 * Storage layer. Pages and admin actions talk to a small interface, never to a database directly,
 * so the driver can change (file today, Supabase next) without touching the rest of the app.
 *
 *   list(collection)            -> Promise<record[]>
 *   get(collection, id)         -> Promise<record | null>
 *   put(collection, record)     -> Promise<record>   (creates an id and timestamps when missing)
 *   remove(collection, id)      -> Promise<boolean>
 *
 * Drivers:
 *   memory  tests and throwaway use
 *   file    JSON files in EMPATHERAY_DATA_DIR (default ".data"). Good for local work.
 *           NOT suitable for production hosting: serverless disks are read-only or temporary.
 *   (planned) supabase: same interface, row-level security, see docs/ADMIN.md
 *
 * Storage is OFF unless EMPATHERAPY_STORE is set. With it off the site behaves exactly as before.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const COLLECTION = /^[a-z_]{1,40}$/;
const assertCollection = (c) => { if (!COLLECTION.test(c)) throw new Error(`Invalid collection name: ${c}`); };
const stamp = (rec, existing, now) => ({
  ...existing,
  ...rec,
  id: rec.id ?? existing?.id ?? randomUUID(),
  created_at: existing?.created_at ?? rec.created_at ?? now,
  updated_at: now,
});

/** An in-memory driver. Also the reference behaviour every driver must match. */
export function createMemoryDriver() {
  const data = {};
  const col = (c) => { assertCollection(c); return (data[c] ??= new Map()); };
  return {
    name: 'memory',
    async list(c) { return [...col(c).values()].map((r) => ({ ...r })); },
    async get(c, id) { const r = col(c).get(id); return r ? { ...r } : null; },
    async put(c, rec, now = new Date().toISOString()) { const m = col(c); const out = stamp(rec, rec.id ? m.get(rec.id) : undefined, now); m.set(out.id, out); return { ...out }; },
    async remove(c, id) { return col(c).delete(id); },
  };
}

/** One JSON file per collection, written atomically and one write at a time. */
export function createFileDriver(dir) {
  let chain = Promise.resolve();
  const file = (c) => { assertCollection(c); return path.join(dir, `${c}.json`); };
  const read = async (c) => {
    try { return JSON.parse(await fs.readFile(file(c), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
  };
  const write = async (c, data) => {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file(c)}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, file(c));
  };
  // Serialise every operation so two requests cannot overwrite each other's changes.
  const run = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };
  return {
    name: 'file',
    list: (c) => run(async () => Object.values(await read(c))),
    get: (c, id) => run(async () => (await read(c))[id] ?? null),
    put: (c, rec, now = new Date().toISOString()) => run(async () => {
      const all = await read(c);
      const out = stamp(rec, rec.id ? all[rec.id] : undefined, now);
      all[out.id] = out;
      await write(c, all);
      return out;
    }),
    remove: (c, id) => run(async () => { const all = await read(c); if (!(id in all)) return false; delete all[id]; await write(c, all); return true; }),
  };
}

let cached;
/** The configured store, or null when storage is switched off. */
export function getStore(env = process.env) {
  if (cached !== undefined && env === process.env) return cached;
  let store = null;
  if (env.EMPATHERAPY_STORE === 'file') store = createFileDriver(path.resolve(env.EMPATHERAPY_DATA_DIR || '.data'));
  if (env === process.env) cached = store;
  return store;
}
export const storeEnabled = (env = process.env) => env.EMPATHERAPY_STORE === 'file';
