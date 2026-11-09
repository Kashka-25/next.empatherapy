import { DEMO } from '@/lib/demo';
import { therapists as liveTherapists } from '@/data/therapists';
import { demoAlchemists } from '@/data/demo/alchemists';

/** Practitioners to show: fictional examples in demo mode, the real data file otherwise. */
export const therapists = DEMO ? demoAlchemists : liveTherapists;

export function getTherapistBySlug(slug) {
  return therapists.find((t) => t.slug === slug) ?? null;
}
