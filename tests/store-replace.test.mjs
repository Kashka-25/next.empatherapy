import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMemoryDriver, createFileDriver } from '../lib/store/index.mjs';
import { createSupabaseDriver } from '../lib/store/supabase.mjs';

/** put() replaces the whole record. A field left out is gone, so editors can really remove things. */
async function replaceContract(d) {
  const a = await d.put('things', { id: 'x', keep: 1, private_note: 'remove me', nested: { a: 1 } });
  const b = await d.put('things', { id: 'x', keep: 2 });
  assert.equal(b.keep, 2);
  assert.equal('private_note' in b, false, 'a removed field does not come back');
  assert.equal('nested' in b, false);
  const stored = await d.get('things', 'x');
  assert.deepEqual(Object.keys(stored).sort(), ['created_at', 'id', 'keep', 'updated_at']);
  assert.equal(stored.created_at, a.created_at, 'created_at survives a replace');
  assert.equal((await d.list('things')).length, 1);
}

test('store put replaces the whole record (memory)', () => replaceContract(createMemoryDriver()));

test('store put replaces the whole record (file)', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emp-replace-'));
  try { await replaceContract(createFileDriver(dir)); } finally { await rm(dir, { recursive: true, force: true }); }
});

test('store put replaces the whole record (supabase)', async () => {
  const rows = new Map();
  const respond = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
  const fetchImpl = async (url, init = {}) => {
    const q = new URL(url).searchParams;
    const col = q.get('collection')?.replace(/^eq\./, ''), id = q.get('id')?.replace(/^eq\./, '');
    if (init.method === 'POST') { const b = JSON.parse(init.body); rows.set(`${b.collection}|${b.id}`, b); return respond(201); }
    const match = [...rows.values()].filter((r) => r.collection === col && (id === undefined || r.id === id));
    return respond(200, match.map((r) => ({ data: r.data })));
  };
  await replaceContract(createSupabaseDriver({ url: 'https://abc.supabase.co', key: 'service-role-key-that-is-long-enough', fetchImpl }));
});
