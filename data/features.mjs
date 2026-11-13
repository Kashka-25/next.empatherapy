/**
 * Weekly featured modalities (sample schedule).
 * Each entry features one to three modalities for one week. An editor edits this list, or later the admin
 * screen, with no code changes elsewhere.
 *
 * @typedef {Object} FeaturedModality
 * @property {string} id
 * @property {string} modality_id
 * @property {string} feature_start  ISO date (inclusive)
 * @property {string} feature_end    ISO date (inclusive)
 * @property {string} editorial_introduction
 * @property {number} featured_position  1 to 3
 * @property {'published'|'draft'|'archived'} publication_status
 */
export const featuredModalities = [
  {
    id: 'feat-2026-11-09-1', modality_id: 'mod-breathwork', feature_start: '2026-11-09', feature_end: '2026-11-15', featured_position: 1,
    editorial_introduction: 'You already do it twenty thousand times a day. This week, a look at what changes when someone guides it.',
    publication_status: 'published',
  },
  {
    id: 'feat-2026-11-09-2', modality_id: 'mod-nature', feature_start: '2026-11-09', feature_end: '2026-11-15', featured_position: 2,
    editorial_introduction: 'Forest bathing sounds mysterious. It mostly means going slowly outside on purpose.',
    publication_status: 'published',
  },
  {
    id: 'feat-2026-11-09-3', modality_id: 'mod-expressive', feature_start: '2026-11-09', feature_end: '2026-11-15', featured_position: 3,
    editorial_introduction: 'You do not need to be creative. A page, some colour and a kind facilitator is plenty.',
    publication_status: 'published',
  },
  {
    id: 'feat-2026-11-02-1', modality_id: 'mod-sound', feature_start: '2026-11-02', feature_end: '2026-11-08', featured_position: 1,
    editorial_introduction: 'Lie back and let the room hum. A quiet introduction to sound baths.',
    publication_status: 'archived',
  },
  {
    id: 'feat-2026-11-02-2', modality_id: 'mod-ifs', feature_start: '2026-11-02', feature_end: '2026-11-08', featured_position: 2,
    editorial_introduction: 'What if the voice that criticises you is actually trying to protect you?',
    publication_status: 'archived',
  },
];

/** Features active on `date` (up to three, in order). Falls back to the most recent week so the page is never empty. */
export function activeFeatures(date = new Date(), list = featuredModalities) {
  const day = (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);
  const published = list.filter((f) => f.publication_status === 'published');
  const current = published.filter((f) => f.feature_start <= day && day <= f.feature_end);
  const pool = current.length ? current : mostRecentPublished(published, day);
  return [...pool].sort((a, b) => a.featured_position - b.featured_position).slice(0, 3);
}

function mostRecentPublished(published, day) {
  const past = published.filter((f) => f.feature_start <= day);
  const source = past.length ? past : published;
  if (!source.length) return [];
  const latest = source.reduce((m, f) => (f.feature_start > m ? f.feature_start : m), '');
  return source.filter((f) => f.feature_start === latest);
}
