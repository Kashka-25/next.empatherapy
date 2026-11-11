/**
 * Directory search and filters. Pure functions, used by the Discover Alchemists page.
 * @typedef {{query?:string, modality?:string, format?:string, location?:string, maxPrice?:number|string}} DirectoryFilters
 */
import { normalise } from './matching/index.mjs';

/** Modality slugs an Alchemist offers (interests are not offerings). */
export const offeredSlugs = (a) => a.modalities.filter((m) => m.basis !== 'interest').map((m) => m.slug);

export function filterAlchemists(list, filters = {}, modalityList = []) {
  const q = normalise(filters.query || '');
  const loc = normalise(filters.location || '');
  const max = Number(filters.maxPrice) > 0 ? Number(filters.maxPrice) : null;
  return list.filter((a) => {
    if (a.publication_status !== 'published') return false;
    if (filters.modality && !offeredSlugs(a).includes(filters.modality)) return false;
    if (filters.format === 'online' && !a.delivery_formats.includes('online')) return false;
    if (filters.format === 'in-person' && !a.delivery_formats.includes('in-person')) return false;
    if (filters.format === 'hybrid' && !(a.delivery_formats.includes('online') && a.delivery_formats.includes('in-person'))) return false;
    if (loc && !normalise(`${a.location.label} ${a.location.region}`).includes(loc)) return false;
    if (max != null && a.pricing.from > max) return false;
    if (q) {
      const names = offeredSlugs(a).map((s) => modalityList.find((m) => m.slug === s)?.name ?? s);
      const haystack = normalise([a.name, a.title, a.short_bio, a.tagline, ...names, ...a.interests, ...a.approach_tags, a.offering_name || ''].join(' '));
      if (!q.split(' ').every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

/** Featured first, then by name, so the directory feels curated rather than alphabetical. */
export function curatedOrder(list) {
  return [...list].sort((a, b) => Number(b.featured_status) - Number(a.featured_status) || (a.featured_rank ?? 99) - (b.featured_rank ?? 99) || a.name.localeCompare(b.name));
}

export const FORMAT_LABEL = { online: 'Online', 'in-person': 'In person' };
export const formatSummary = (a) => {
  const f = a.delivery_formats;
  return f.includes('online') && f.includes('in-person') ? 'Online and in person' : f.includes('online') ? 'Online' : 'In person';
};
