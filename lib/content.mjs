/**
 * Pure helpers for Alchemists and modalities. Every function takes the lists it needs, so the same code
 * works on the built-in sample content and on content edited in the admin (see content-store.mjs).
 */
import { curatedOrder, offeredSlugs } from './directory.mjs';

export { curatedOrder, offeredSlugs };

export const BASIS_LABEL = {
  formal: 'Formal training',
  study: 'Personal study',
  experience: 'Practised experience',
  interest: 'Developing interest',
  confirm: 'A practice I draw on',
};

export const bySlug = (list, slug) => list.find((x) => x.slug === slug) ?? null;

/** Modalities an Alchemist offers, with the basis behind each. Interests and unpublished modalities are left out. */
export function modalitiesOf(alchemist, modalityList) {
  return alchemist.modalities
    .filter((m) => m.basis !== 'interest')
    .map((m) => ({ ...m, modality: bySlug(modalityList, m.slug) }))
    .filter((m) => m.modality);
}

/** Alchemists who offer a modality. Where formal training is required, only formally trained ones are listed. */
export function alchemistsFor(modality, alchemistList) {
  return curatedOrder(
    alchemistList.filter((a) => a.publication_status === 'published' && a.modalities.some((m) => m.slug === modality.slug && m.basis !== 'interest' && (!modality.requires_formal_training || m.basis === 'formal')))
  );
}

export const priceFrom = (a) => `from $${a.pricing.from} ${a.pricing.currency}`;
export const placeAndFormat = (a) => {
  const f = a.delivery_formats;
  const fmt = f.includes('online') && f.includes('in-person') ? 'Online and in person' : f.includes('online') ? 'Online' : 'In person';
  return `${a.location.label} · ${fmt}`;
};
