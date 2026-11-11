/**
 * Weekly featured modalities: validation and loading.
 * The schedule comes from the store when an admin has set one up, and from the sample schedule in
 * data/features.mjs otherwise, so the public pages always have something to show.
 */
import { featuredModalities, activeFeatures } from '../data/features.mjs';
import { modalities } from '../data/modalities.mjs';
import { getStore } from './store/index.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (s) => ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const overlaps = (a, b) => a.feature_start <= b.feature_end && b.feature_start <= a.feature_end;

/** @returns {{ valid: boolean, errors: Record<string,string>, data: object }} */
export function validateFeature(raw, existing = [], knownModalities = modalities) {
  const data = {
    modality_id: String(raw.modality_id ?? ''),
    feature_start: String(raw.feature_start ?? ''),
    feature_end: String(raw.feature_end ?? ''),
    featured_position: Number(raw.featured_position),
    editorial_introduction: String(raw.editorial_introduction ?? '').replace(/[<>]/g, '').trim().slice(0, 240),
    publication_status: ['published', 'draft', 'archived'].includes(raw.publication_status) ? raw.publication_status : 'draft',
  };
  const errors = {};
  if (!knownModalities.some((m) => m.id === data.modality_id)) errors.modality_id = 'Choose a modality.';
  if (!isRealDate(data.feature_start)) errors.feature_start = 'Enter a start date.';
  if (!isRealDate(data.feature_end)) errors.feature_end = 'Enter an end date.';
  if (!errors.feature_start && !errors.feature_end && data.feature_end < data.feature_start) errors.feature_end = 'The end date must be on or after the start date.';
  if (![1, 2, 3].includes(data.featured_position)) errors.featured_position = 'Position must be 1, 2 or 3.';
  if (data.editorial_introduction.length < 10) errors.editorial_introduction = 'Write a short introduction (at least 10 characters).';

  if (!Object.keys(errors).length && data.publication_status === 'published') {
    const others = existing.filter((f) => f.id !== raw.id && f.publication_status === 'published' && overlaps(f, data));
    if (others.some((f) => f.featured_position === data.featured_position)) errors.featured_position = `Position ${data.featured_position} is already taken in those dates.`;
    else if (others.some((f) => f.modality_id === data.modality_id)) errors.modality_id = 'This modality is already featured in those dates.';
    else if (new Set(others.map((f) => f.featured_position)).size >= 3) errors.featured_position = 'Three modalities are already featured in those dates.';
  }
  return { valid: Object.keys(errors).length === 0, errors, data };
}

/** The schedule in use: the store's when set up, the sample schedule otherwise. */
export async function loadFeatures(store = getStore()) {
  if (!store) return featuredModalities;
  const rows = await store.list('features');
  return rows.length ? rows : featuredModalities;
}

export async function currentFeatures(date = new Date(), store = getStore()) {
  return activeFeatures(date, await loadFeatures(store));
}

/** Copy the sample schedule into the store so an admin can edit it. */
export async function seedFeatures(store) {
  if ((await store.list('features')).length) return 0;
  for (const f of featuredModalities) await store.put('features', { ...f });
  return featuredModalities.length;
}
