/**
 * Where the site's Alchemists and modalities come from.
 *
 * The built-in sample content (data/*.mjs) is the starting point. When storage is on, anything saved in the admin
 * is layered on top: a stored record replaces the built-in one with the same id, and new records are added.
 * Deleting a stored record ("reset to original") brings the built-in version back. With storage off, the site shows
 * the built-in content exactly as before.
 */
import { alchemists as seedAlchemists } from '../data/alchemists.mjs';
import { modalities as seedModalities } from '../data/modalities.mjs';
import { getStore } from './store/index.mjs';
import { ELIGIBLE_STATUSES } from './matching/index.mjs';

export function overlay(seed, rows) {
  const stored = new Map(rows.map((r) => [r.id, r]));
  const merged = seed.map((s) => stored.get(s.id) ?? s);
  const added = rows.filter((r) => !seed.some((s) => s.id === r.id));
  return [...merged, ...added];
}

/** Everything, including drafts and unverified profiles. For the admin. */
export async function loadContent(store = getStore()) {
  const [aRows, mRows] = store ? await Promise.all([store.list('alchemists'), store.list('modalities')]) : [[], []];
  return {
    alchemists: overlay(seedAlchemists, aRows),
    modalities: overlay(seedModalities, mRows),
    edited: { alchemists: new Set(aRows.map((r) => r.id)), modalities: new Set(mRows.map((r) => r.id)) },
    seedIds: { alchemists: new Set(seedAlchemists.map((a) => a.id)), modalities: new Set(seedModalities.map((m) => m.id)) },
  };
}

/** What visitors may see: published modalities, and Alchemists that are published and verified (or the founder or an example). */
export async function publicContent(store = getStore()) {
  const { alchemists, modalities } = await loadContent(store);
  return {
    alchemists: alchemists.filter((a) => a.publication_status === 'published' && ELIGIBLE_STATUSES.includes(a.verification_status)),
    modalities: modalities.filter((m) => m.publication_status === 'published'),
  };
}
