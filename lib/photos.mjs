/**
 * An Alchemist's photos: up to five, in order. The first is their profile picture; all of them form the
 * "Meet them" carousel on the profile. Pure functions over a list, so they are easy to test.
 *
 *   photos: [{ id, alt, caption, w, h, added_at }]
 *
 * Every photo needs descriptive alt text (so screen-reader users meet the person too). Fictional example
 * profiles can never carry photos, so a real face is never shown as a made-up person.
 */
export const MAX_PHOTOS = 5;
export const photoUrl = (id) => `/media/${id}`;
export const adminPhotoUrl = (id) => `/admin/media/${id}`;

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
export const cleanAlt = (v) => clean(v, 200);
export const cleanCaption = (v) => clean(v, 140);

export function altError(alt) {
  return alt.length < 5 ? 'Please describe the photo in a few words (at least 5 characters), for people who cannot see it.' : null;
}

export const canHavePhotos = (alchemist) => alchemist?.demo !== true;
export const photosOf = (alchemist) => (Array.isArray(alchemist?.photos) ? alchemist.photos : []);

export function addPhoto(photos = [], entry) {
  if (photos.length >= MAX_PHOTOS) return { ok: false, reason: 'full' };
  return { ok: true, photos: [...photos, entry] };
}

export function updatePhoto(photos = [], id, { alt, caption }) {
  if (!photos.some((p) => p.id === id)) return { ok: false, reason: 'not_found' };
  return { ok: true, photos: photos.map((p) => (p.id === id ? { ...p, ...(alt !== undefined ? { alt } : {}), ...(caption !== undefined ? { caption } : {}) } : p)) };
}

export function makePrimary(photos = [], id) {
  const p = photos.find((x) => x.id === id);
  if (!p) return { ok: false, reason: 'not_found' };
  return { ok: true, photos: [p, ...photos.filter((x) => x.id !== id)] };
}

export function movePhoto(photos = [], id, direction) {
  const i = photos.findIndex((x) => x.id === id);
  if (i < 0) return { ok: false, reason: 'not_found' };
  const j = i + (direction === 'left' ? -1 : 1);
  if (j < 0 || j >= photos.length) return { ok: true, photos };
  const next = [...photos];
  [next[i], next[j]] = [next[j], next[i]];
  return { ok: true, photos: next };
}

export function removePhoto(photos = [], id) {
  if (!photos.some((p) => p.id === id)) return { ok: false, reason: 'not_found' };
  return { ok: true, photos: photos.filter((p) => p.id !== id) };
}

/** Is this image part of a profile the public can see? */
export const isPublicPhoto = (publicAlchemists, id) => publicAlchemists.some((a) => photosOf(a).some((p) => p.id === id));
