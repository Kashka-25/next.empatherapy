/**
 * Turning admin form text into Alchemist and modality records, and back.
 *
 * Forms use plain text so they stay simple: one item per line, paragraphs split by a blank line, "a | b | c" for rows.
 * `toForm` and `validate*` are exact inverses for valid content, so opening something in the editor and saving it
 * unchanged never alters it (tested against every built-in profile and modality).
 *
 * Rules that protect Seekers:
 *  - A profile can only be published when it is complete (story, philosophy, safety information, practices, sessions, prices).
 *  - A profile can only be published when it is verified (or is the founder or a labelled example). "Pending" stays hidden.
 *  - Example profiles stay examples. Nobody can be made "founder" from the form.
 *  - Every practice carries its basis (formal, study, experience, interest, confirm), so kinds of experience are never blurred.
 */
import { THEMES, STYLES } from './matching/vocabulary.mjs';
import { clean } from './validation.mjs';

export const BASES = ['formal', 'study', 'experience', 'interest', 'confirm'];
export const CATEGORIES = ['talking', 'body', 'energy', 'creative', 'nature', 'mindful', 'experimental'];
export const EVIDENCE_KINDS = ['traditional', 'practitioner', 'research', 'established'];
export const ICON_NAMES = ['breath', 'body', 'energy', 'sound', 'creative', 'nature', 'mindful', 'talk', 'parts', 'lantern'];
export const PUBLICATION = ['published', 'draft'];
export const VERIFICATION = ['pending', 'verified', 'founder', 'demo'];
export const PUBLISHABLE_VERIFICATION = ['verified', 'founder', 'demo'];
export const STYLE_IDS = STYLES.map((s) => s.id).filter((id) => id !== 'surprise');

const PALETTES = [['#667D62', '#A6B59A'], ['#7A6A4F', '#B58A5A'], ['#B9823E', '#E8BE67'], ['#44583F', '#5FA8A3'], ['#5C7A52', '#C9B25F'], ['#2E75B6', '#5FA8A3']];
const MOTIFS = ['leaf', 'sun', 'wave', 'flower', 'mountain', 'lantern'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- text helpers ---------- */
export const slugify = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
export const lines = (s, max = 40, each = 400) => String(s ?? '').split(/\r?\n/).map((l) => clean(l, each)).filter(Boolean).slice(0, max);
export const paragraphs = (s, max = 8) => String(s ?? '').split(/\r?\n\s*\r?\n/).map((p) => clean(p.replace(/\s*\r?\n\s*/g, ' '), 2000)).filter(Boolean).slice(0, max);
export const csv = (s, max = 20) => String(s ?? '').split(',').map((x) => clean(x, 60)).filter(Boolean).slice(0, max);
const splitConfirm = (text) => { const m = /\s*\(confirm\)\s*$/i.exec(text); return { text: m ? text.slice(0, m.index).trim() : text, confirm: Boolean(m) }; };
const flag = (v) => v === true || v === 'on' || v === 'true' || v === '1';
const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const uniqueSlug = (base, taken) => { let s = base || 'item', i = 2; while (taken.has(s)) s = `${base}-${i++}`; return s; };
const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const len = (s, min, max) => s.length >= min && s.length <= max;

/* ---------- Alchemist ---------- */
export function alchemistToForm(a) {
  const items = (arr) => arr.map((x) => `${x.title}${x.confirm ? ' (confirm)' : ''}`).join('\n');
  return {
    name: a.name, title: a.title, offering_name: a.offering_name ?? '', tagline: a.tagline, short_bio: a.short_bio, pull_quote: a.pull_quote,
    personal_story: a.personal_story.join('\n\n'), what_brought_me: a.what_brought_me, philosophy: a.philosophy,
    modalities: a.modalities.map((m) => `${m.slug}: ${m.basis}`).join('\n'),
    approach_tags: a.approach_tags.join(', '), interests: a.interests.join(', '),
    qualifications: items(a.qualifications), training: items(a.training), experience: items(a.experience),
    suits: (a.suits ?? []).join('\n'), outcomes: (a.outcomes ?? []).join('\n'),
    session_steps: a.session_steps.map((s) => `${s.title} | ${s.text}`).join('\n'),
    delivery_formats: a.delivery_formats,
    location_label: a.location.label, location_region: a.location.region, location_note: a.location.note ?? '',
    pricing_from: String(a.pricing.from), pricing_note: a.pricing.note ?? '',
    pricing_sessions: a.pricing.sessions.map((s) => `${s.title} | ${s.duration} | ${s.price} | ${s.description}${s.confirm ? ' (confirm)' : ''}`).join('\n'),
    safety_information: a.safety_information, enquiry_email: a.enquiry_email ?? '', website: a.website ?? '',
    publication_status: a.publication_status, verification_status: a.verification_status,
    featured_status: a.featured_status ? 'on' : '', featured_rank: a.featured_rank != null ? String(a.featured_rank) : '',
  };
}

/** @returns {{valid:boolean, errors:Record<string,string>, record:object}} */
export function validateAlchemist(raw, existing, ctx) {
  const errors = {};
  const demo = existing?.demo === true;
  const f = {};

  f.name = clean(raw.name, 120);
  f.title = clean(raw.title, 120);
  f.offering_name = clean(raw.offering_name, 80);
  f.tagline = clean(raw.tagline, 140);
  f.short_bio = clean(raw.short_bio, 400);
  f.pull_quote = clean(raw.pull_quote, 240);
  f.personal_story = paragraphs(raw.personal_story);
  f.what_brought_me = clean(raw.what_brought_me, 600);
  f.philosophy = clean(raw.philosophy, 1200);
  f.safety_information = clean(raw.safety_information, 1500);
  f.approach_tags = csv(raw.approach_tags);
  f.interests = csv(raw.interests);
  f.suits = lines(raw.suits, 10, 240);
  f.outcomes = lines(raw.outcomes, 10, 240);

  if (!len(f.name, 2, 120)) errors.name = 'Please enter a name.';
  if (!len(f.title, 2, 120)) errors.title = 'Please enter a title, for example "Somatic Alchemist".';
  if (!len(f.short_bio, 20, 400)) errors.short_bio = 'The short bio needs 20 to 400 characters.';

  // Practices with their basis
  const seen = new Set();
  f.modalities = [];
  for (const l of lines(raw.modalities, 20)) {
    const [slug, basis] = l.split(/[:|]/).map((x) => x.trim().toLowerCase());
    if (!ctx.modalities.some((m) => m.slug === slug)) { errors.modalities = `"${slug}" is not a known modality slug.`; break; }
    if (!BASES.includes(basis)) { errors.modalities = `"${basis}" is not a valid basis. Use formal, study, experience, interest or confirm.`; break; }
    if (seen.has(slug)) { errors.modalities = `"${slug}" is listed twice.`; break; }
    seen.add(slug); f.modalities.push({ slug, basis });
  }

  // Keep any extra details (such as a private note) on a line whose title has not changed.
  const evidenceList = (text, basis, prior = []) => lines(text, 15, 240).map((l) => {
    const { text: title, confirm } = splitConfirm(l);
    const { confirm: _old, ...kept } = prior.find((x) => x.title === title) ?? {};
    return { ...kept, title, basis, ...(confirm ? { confirm: true } : {}) };
  });
  f.qualifications = evidenceList(raw.qualifications, 'formal', existing?.qualifications);
  f.training = evidenceList(raw.training, 'study', existing?.training);
  f.experience = evidenceList(raw.experience, 'experience', existing?.experience);

  f.session_steps = [];
  for (const l of lines(raw.session_steps, 8, 600)) {
    const [title, ...rest] = l.split('|').map((x) => x.trim());
    if (!title || !rest.join('|').trim()) { errors.session_steps = 'Each step needs a title and a description, written as "Title | description".'; break; }
    f.session_steps.push({ title: title.slice(0, 80), text: rest.join(' | ').slice(0, 500) });
  }

  f.delivery_formats = asArray(raw.delivery_formats).filter((x) => ['online', 'in-person'].includes(x));
  const label = clean(raw.location_label, 120);
  f.location = { label, region: slugify(raw.location_region || label) || '', note: clean(raw.location_note, 240) };

  const from = Number(raw.pricing_from);
  f.pricing = { currency: 'AUD', from: Number.isFinite(from) && from >= 0 && from <= 5000 ? Math.round(from) : NaN, sessions: [], note: clean(raw.pricing_note, 240) };
  if (raw.pricing_from === '' || raw.pricing_from == null ? false : Number.isNaN(f.pricing.from)) errors.pricing_from = 'Enter a price from 0 to 5000.';
  for (const l of lines(raw.pricing_sessions, 8, 600)) {
    const [title, duration, price, ...desc] = l.split('|').map((x) => x.trim());
    if (!title || !duration || !price) { errors.pricing_sessions = 'Each session needs a title, duration and price, written as "Title | duration | price | description".'; break; }
    const d = splitConfirm(desc.join(' | '));
    f.pricing.sessions.push({ title: title.slice(0, 80), duration: duration.slice(0, 30), price: price.slice(0, 40), description: d.text.slice(0, 240), ...(d.confirm ? { confirm: true } : {}) });
  }

  f.enquiry_email = clean(raw.enquiry_email, 200);
  if (f.enquiry_email && !EMAIL.test(f.enquiry_email)) errors.enquiry_email = 'That email address does not look right.';
  f.website = clean(raw.website, 300);
  if (f.website) { try { if (!/^https?:$/.test(new URL(f.website).protocol)) throw 0; } catch { errors.website = 'The website should start with https://'; } }

  // Status rules
  f.publication_status = PUBLICATION.includes(raw.publication_status) ? raw.publication_status : 'draft';
  const wanted = VERIFICATION.includes(raw.verification_status) ? raw.verification_status : 'pending';
  if (demo) f.verification_status = 'demo';
  else if (wanted === 'demo') { errors.verification_status = 'Only fictional example profiles can be marked as examples.'; f.verification_status = 'pending'; }
  else if (wanted === 'founder' && existing?.verification_status !== 'founder') { errors.verification_status = 'The founder status cannot be assigned here.'; f.verification_status = 'pending'; }
  else f.verification_status = wanted;

  f.featured_status = flag(raw.featured_status);
  const rank = parseInt(raw.featured_rank, 10);
  f.featured_rank = Number.isInteger(rank) && rank >= 1 && rank <= 99 ? rank : undefined;

  // Completeness and verification before anything becomes public
  if (f.publication_status === 'published') {
    const need = (cond, key, msg) => { if (!cond && !errors[key]) errors[key] = msg; };
    need(f.personal_story.length >= 1, 'personal_story', 'Add a personal story before publishing.');
    need(len(f.philosophy, 20, 1200), 'philosophy', 'Add a philosophy (at least 20 characters) before publishing.');
    need(f.safety_information.length >= 20, 'safety_information', 'Add safety information (at least 20 characters) before publishing.');
    need(f.modalities.some((m) => m.basis !== 'interest'), 'modalities', 'List at least one practice they offer (not just an interest) before publishing.');
    need(f.session_steps.length >= 1, 'session_steps', 'Describe a typical session before publishing.');
    need(f.pricing.sessions.length >= 1, 'pricing_sessions', 'Add at least one session with a price before publishing.');
    need(!Number.isNaN(f.pricing.from), 'pricing_from', 'Enter the "from" price before publishing.');
    need(f.delivery_formats.length >= 1, 'delivery_formats', 'Choose online, in person or both before publishing.');
    need(label.length >= 2, 'location_label', 'Add a location before publishing.');
    need(f.suits.length >= 1, 'suits', 'Say who the sessions may suit before publishing.');
    need(PUBLISHABLE_VERIFICATION.includes(f.verification_status), 'verification_status', 'Verify this person before publishing. Pending profiles stay hidden.');
  }
  if (Number.isNaN(f.pricing.from)) f.pricing.from = 0;

  // Identity
  const taken = new Set(ctx.alchemists.filter((a) => a.id !== existing?.id).map((a) => a.slug));
  const slug = existing?.slug ?? uniqueSlug(slugify(f.name), taken);
  const palette = existing?.palette ?? PALETTES[hash(slug) % PALETTES.length];

  const record = {
    ...(existing ?? {}),
    id: existing?.id ?? `alch-${slug}`, slug, demo, initials: existing?.initials ?? initialsOf(f.name), palette,
    motif: existing?.motif ?? MOTIFS[hash(slug) % MOTIFS.length],
    name: f.name, title: f.title, tagline: f.tagline, short_bio: f.short_bio, pull_quote: f.pull_quote,
    personal_story: f.personal_story, what_brought_me: f.what_brought_me, philosophy: f.philosophy,
    modalities: f.modalities, interests: f.interests, approach_tags: f.approach_tags,
    qualifications: f.qualifications, training: f.training, experience: f.experience,
    suits: f.suits, outcomes: f.outcomes, session_steps: f.session_steps,
    delivery_formats: f.delivery_formats, location: f.location, pricing: f.pricing,
    safety_information: f.safety_information, booking_url: existing?.booking_url ?? null,
    enquiry_email: f.enquiry_email || null, website: f.website || null, social_links: existing?.social_links ?? [],
    verification_status: f.verification_status, publication_status: f.publication_status, featured_status: f.featured_status,
    practices_drawn_on: existing?.practices_drawn_on,
  };
  if (f.offering_name) record.offering_name = f.offering_name; else delete record.offering_name;
  if (f.featured_rank !== undefined) record.featured_rank = f.featured_rank; else delete record.featured_rank;
  if (record.practices_drawn_on === undefined) delete record.practices_drawn_on;
  return { valid: Object.keys(errors).length === 0, errors, record };
}

/* ---------- Modality ---------- */
export function modalityToForm(m) {
  return {
    name: m.name, category: m.category, icon: m.icon, short_description: m.short_description, full_description: m.full_description,
    origins: m.origins, practice_description: m.practice_description, typical_session: m.typical_session,
    commonly_explored_for: m.commonly_explored_for.join('\n'),
    evidence_information: m.evidence_information.map((e) => `${e.kind} | ${e.text}`).join('\n'),
    limitations: m.limitations, contraindications: m.contraindications,
    related_modalities: m.related_modalities, themes: m.themes, styles: m.styles,
    requires_formal_training: m.requires_formal_training ? 'on' : '', publication_status: m.publication_status,
  };
}

export function validateModality(raw, existing, ctx) {
  const errors = {};
  const f = {
    name: clean(raw.name, 80), short_description: clean(raw.short_description, 300), full_description: clean(raw.full_description, 1500),
    origins: clean(raw.origins, 800), practice_description: clean(raw.practice_description, 1000), typical_session: clean(raw.typical_session, 800),
    limitations: clean(raw.limitations, 800), contraindications: clean(raw.contraindications, 1000),
    commonly_explored_for: lines(raw.commonly_explored_for, 8, 120),
  };
  if (!len(f.name, 2, 80)) errors.name = 'Please enter a name.';
  f.category = CATEGORIES.includes(raw.category) ? raw.category : null;
  if (!f.category) errors.category = 'Choose a category.';
  f.icon = ICON_NAMES.includes(raw.icon) ? raw.icon : 'nature';

  f.evidence_information = [];
  for (const l of lines(raw.evidence_information, 8, 600)) {
    const [kind, ...rest] = l.split('|').map((x) => x.trim());
    if (!EVIDENCE_KINDS.includes(kind?.toLowerCase()) || !rest.join('|').trim()) { errors.evidence_information = 'Write each line as "kind | text", where kind is traditional, practitioner, research or established.'; break; }
    f.evidence_information.push({ kind: kind.toLowerCase(), text: rest.join(' | ').slice(0, 500) });
  }

  f.themes = asArray(raw.themes).filter((t) => t in THEMES);
  f.styles = asArray(raw.styles).filter((s) => STYLE_IDS.includes(s));
  const others = new Set(ctx.modalities.filter((m) => m.id !== existing?.id).map((m) => m.slug));
  f.related_modalities = asArray(raw.related_modalities).filter((s) => others.has(s));
  f.requires_formal_training = flag(raw.requires_formal_training);
  f.publication_status = PUBLICATION.includes(raw.publication_status) ? raw.publication_status : 'draft';

  if (f.publication_status === 'published') {
    const need = (cond, key, msg) => { if (!cond && !errors[key]) errors[key] = msg; };
    need(len(f.short_description, 20, 300), 'short_description', 'The short description needs 20 to 300 characters.');
    need(len(f.full_description, 40, 1500), 'full_description', 'The full description needs at least 40 characters.');
    need(f.origins.length >= 10, 'origins', 'Say where this comes from before publishing.');
    need(f.practice_description.length >= 20, 'practice_description', 'Describe how it is practised before publishing.');
    need(f.typical_session.length >= 20, 'typical_session', 'Describe a typical session before publishing.');
    need(f.commonly_explored_for.length >= 1, 'commonly_explored_for', 'List what people commonly explore it for.');
    need(f.evidence_information.length >= 1, 'evidence_information', 'Add at least one evidence line before publishing.');
    need(f.limitations.length >= 10, 'limitations', 'State the limitations honestly before publishing.');
    need(f.contraindications.length >= 10, 'contraindications', 'Add safety considerations before publishing.');
    need(f.themes.length >= 1, 'themes', 'Choose at least one theme so discovery can use it.');
    need(f.styles.length >= 1, 'styles', 'Choose at least one style so discovery can use it.');
  }

  const taken = new Set(ctx.modalities.filter((m) => m.id !== existing?.id).map((m) => m.slug));
  const slug = existing?.slug ?? uniqueSlug(slugify(f.name), taken);
  const record = {
    ...(existing ?? {}), id: existing?.id ?? `mod-${slug}`, slug, name: f.name, category: f.category ?? existing?.category ?? 'talking', icon: f.icon,
    themes: f.themes, styles: f.styles, requires_formal_training: f.requires_formal_training,
    short_description: f.short_description, full_description: f.full_description, origins: f.origins,
    practice_description: f.practice_description, typical_session: f.typical_session, commonly_explored_for: f.commonly_explored_for,
    evidence_information: f.evidence_information, limitations: f.limitations, contraindications: f.contraindications,
    related_modalities: f.related_modalities, images: existing?.images ?? [f.icon], publication_status: f.publication_status,
  };
  return { valid: Object.keys(errors).length === 0, errors, record };
}

/** A built-in modality can only be reset, never deleted. A new one can go only when nobody lists it. */
export function modalityDeleteBlocker(modality, alchemists, seedIds) {
  if (seedIds.has(modality.id)) return 'Built-in modalities cannot be deleted. Unpublish it, or reset it to the original.';
  const users = alchemists.filter((a) => a.modalities.some((m) => m.slug === modality.slug));
  return users.length ? `Still listed by ${users.map((a) => a.name).join(', ')}.` : null;
}
