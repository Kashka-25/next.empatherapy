/**
 * Supabase driver for the store interface (list, get, put, remove), over Supabase's REST API.
 * No client library is needed. Server-side only: it uses the service-role key, which must never reach a browser.
 * The table is created by supabase/schema.sql, with row-level security on and no public policies.
 *
 * Each record is stored whole in a jsonb column (`data`), keyed by (collection, id).
 */
import { randomUUID } from 'node:crypto';

const COLLECTION = /^[a-z_]{1,40}$/;
const assertCollection = (c) => { if (!COLLECTION.test(c)) throw new Error(`Invalid collection name: ${c}`); };
const PAGE = 1000;

export function validSupabaseUrl(url) {
  try {
    const u = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    return u.protocol === 'https:' || (u.protocol === 'http:' && local);
  } catch { return false; }
}

export function createSupabaseDriver({ url, key, fetchImpl = globalThis.fetch }) {
  if (!validSupabaseUrl(url)) throw new Error('SUPABASE_URL must be an https address.');
  if (!key || key.length < 20) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.');
  const base = `${url.replace(/\/+$/, '')}/rest/v1/records`;
  const headers = (extra = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra });

  async function call(query, init = {}) {
    const res = await fetchImpl(`${base}${query}`, { ...init, headers: headers(init.headers), cache: 'no-store' });
    if (!res.ok) throw new Error(`Storage request failed (${res.status}).`); // never include the response body: it may hold data
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  }
  const eq = (c, id) => `?collection=eq.${encodeURIComponent(c)}&id=eq.${encodeURIComponent(id)}`;

  return {
    name: 'supabase',
    async list(c) {
      assertCollection(c);
      const out = [];
      for (let from = 0; ; from += PAGE) {
        const rows = await call(`?collection=eq.${c}&select=data&order=created_at.asc,id.asc&limit=${PAGE}&offset=${from}`);
        out.push(...rows.map((r) => r.data));
        if (rows.length < PAGE) return out;
      }
    },
    async get(c, id) {
      assertCollection(c);
      const rows = await call(`${eq(c, String(id))}&select=data&limit=1`);
      return rows[0]?.data ?? null;
    },
    async put(c, rec, now = new Date().toISOString()) {
      assertCollection(c);
      const existing = rec.id ? await this.get(c, rec.id) : null;
      const out = { ...existing, ...rec, id: rec.id ?? existing?.id ?? randomUUID(), created_at: existing?.created_at ?? rec.created_at ?? now, updated_at: now };
      await call('?on_conflict=collection,id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ collection: c, id: out.id, data: out, created_at: out.created_at, updated_at: out.updated_at }),
      });
      return out;
    },
    async remove(c, id) {
      assertCollection(c);
      const rows = await call(`${eq(c, String(id))}&select=id`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      return rows.length > 0;
    },
  };
}
