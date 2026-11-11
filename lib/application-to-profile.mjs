/**
 * Turns an approved Alchemist application into a DRAFT profile, as form values for the normal editor
 * (so every rule in validateAlchemist still applies). It is a starting point for a person, never a publisher:
 *
 *  - The profile is created hidden (draft) and unverified (pending).
 *  - Practices the applicant named are matched to modality pages and recorded as "confirm" (their claim, not yet
 *    checked), never as formal training. Practices that match no page are kept aside for the reviewer.
 *  - Qualifications are the applicant's own words and are flagged "(confirm)" until a person has checked them.
 *  - The applicant's email is NOT copied onto the public profile.
 *  - Their original answers about price, qualifications and links are kept in a private `source` note on the draft
 *    so nothing is lost while it is finished. The note is removed when the profile is published.
 */
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const NONE = /^(none|n\/a|na|nil|no formal (training|qualifications?)|not yet)( yet)?\.?$/i;

/** Splits "breathwork, reiki and sound healing" into separate terms. */
export const terms = (text) => String(text ?? '').split(/[,;\n/&+]|\band\b/i).map((t) => t.trim().replace(/^[-*•\d.)\s]+/, '')).filter((t) => t.length > 1);

export function matchModalities(text, modalities) {
  const matched = [], unmatched = [];
  for (const term of terms(text)) {
    const n = norm(term);
    const hit = modalities.find((m) => norm(m.name) === n || norm(m.slug) === n)
      ?? (n.length >= 4 ? modalities.find((m) => norm(m.name).includes(n) || (norm(m.name).length >= 5 && n.includes(norm(m.name)))) : undefined);
    if (hit) { if (!matched.includes(hit.slug)) matched.push(hit.slug); }
    else if (!unmatched.includes(term)) unmatched.push(term);
  }
  return { matched, unmatched };
}

const trimTo = (s, max) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40))}…`;
};
const items = (text) => String(text ?? '').split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);

/** { form, source } for an application's `data`. `form` has the same shape as the admin editor's values. */
export function draftFromApplication(data, modalities) {
  const { matched, unmatched } = matchModalities(data.modalities, modalities);
  const qualificationLines = NONE.test(String(data.qualifications ?? '').trim()) ? [] : items(data.qualifications);
  const links = String(data.links ?? '').split(/[\s,]+/).filter(Boolean);
  const form = {
    name: data.name, title: 'Alchemist', offering_name: '', tagline: '',
    short_bio: trimTo(String(data.introduction ?? ''), 400), pull_quote: '',
    personal_story: String(data.personal_story ?? ''), what_brought_me: '', philosophy: '',
    modalities: matched.map((slug) => `${slug}: confirm`).join('\n'),
    approach_tags: '', interests: '',
    qualifications: qualificationLines.map((l) => `${l.replace(/\s*\(confirm\)\s*$/i, '')} (confirm)`).join('\n'),
    training: '', experience: items(data.experience).join('\n'),
    suits: '', outcomes: '', session_steps: '',
    delivery_formats: data.delivery_format === 'both' ? ['online', 'in-person'] : data.delivery_format ? [data.delivery_format] : [],
    location_label: data.location, location_region: '', location_note: '',
    pricing_from: '', pricing_note: data.pricing ?? '', pricing_sessions: '',
    safety_information: '', enquiry_email: '', website: links[0] ?? '',
    publication_status: 'draft', verification_status: 'pending', featured_status: '', featured_rank: '',
  };
  const source = {
    unmatched_practices: unmatched,
    practices_as_written: data.modalities ?? '',
    qualifications_as_written: data.qualifications ?? '',
    pricing_as_written: data.pricing ?? '',
    links: links,
  };
  return { form, source };
}
