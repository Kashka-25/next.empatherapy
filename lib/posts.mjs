/**
 * The knowledge feed: short articles Alchemists choose to share so visitors can learn too. Free to read, and openly
 * licensed (Creative Commons Attribution 4.0) so anyone may copy and adapt them with credit.
 *
 * Posts are written by an Alchemist about their practice, labelled by what kind of knowledge they are, reviewed by a
 * person before they appear, and never able to promise cures or tell anyone to skip medical care. A post only shows
 * while its author's profile is public, and never for a fictional example.
 */
import { clean } from './validation.mjs';
import { slugify } from './admin-content.mjs';
import { ELIGIBLE_STATUSES } from './matching/index.mjs';

export const POST_KINDS = ['practice', 'perspective', 'tradition', 'research', 'lived'];
export const KIND_LABEL = { practice: 'Practice guide', perspective: 'Personal perspective', tradition: 'Traditional practice', research: 'Research summary', lived: 'Lived experience' };
export const KIND_HELP = {
  practice: 'How to try something gently, step by step.',
  perspective: 'Your view, from your own experience of the work.',
  tradition: 'Where a practice comes from and what it has meant to people.',
  research: 'What studies say. Needs at least one source link.',
  lived: 'What it was like for you. Shown as personal experience, never as advice.',
};
export const POST_STATUSES = ['draft', 'submitted', 'published', 'rejected'];
export const STATUS_LABEL = { draft: 'Draft', submitted: 'Waiting for review', published: 'Published', rejected: 'Not approved' };
export const LICENSE = { id: 'CC BY 4.0', name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };
export const LIMITS = { title: [8, 120], summary: [40, 300], body: [300, 8000] };
export const MAX_SOURCES = 8;
export const MAX_POSTS_PER_PROFILE = 40;

/* ---------- what may not be promised ---------- */
// BLOCK: never published. WARN: shown to the author and the reviewer, who decide.
const BLOCK = [
  [/\bguarantee[sd]?\b/i, 'promises a guaranteed result'],
  [/\bmiracle\b/i, 'calls something a miracle'],
  [/\b(stop|quit|come off|ditch|skip)\s+(taking\s+)?(your\s+)?(prescribed\s+)?(medication|meds|medicine)\b/i, 'tells people to stop their medication'],
  [/\binstead of\s+(seeing\s+)?(a\s+|your\s+)?(doctor|gp|medication|medicine|therapy|treatment)\b/i, 'sets this against seeing a doctor or having treatment'],
  [/\b(no need|do not need|don'?t need)\s+(for\s+)?(a\s+|your\s+)?(doctor|medication|medicine|treatment)\b/i, 'says people do not need medical care'],
  [/\b(heals?|treats?|reverses?|eliminates?|cures?)\s+(your\s+)?(cancer|diabetes|depression|anxiety disorder|ptsd|schizophrenia|bipolar|autism|hiv|covid)\b/i, 'claims to treat or cure a named condition'],
];
const WARN = [
  [/\bcures?\b|\bcured\b|\bcuring\b/i, 'uses the word "cure"'],
  [/\bproven\b/i, 'says something is "proven"'],
  [/\b(detox|toxins?)\b/i, 'talks about detoxing or toxins'],
];
export function claimChecks(text) {
  const t = String(text ?? '');
  const hit = (list) => list.filter(([re]) => re.test(t)).map(([, why]) => why);
  return { block: hit(BLOCK), warn: hit(WARN) };
}

/* ---------- reading the body ---------- */
/** Plain text in, simple blocks out: paragraphs, "## " headings and "- " lists. Nothing else is interpreted, so nothing can inject markup. */
export function parseBody(text) {
  const blocks = [];
  for (const chunk of String(text ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => l.startsWith('- '))) { blocks.push({ type: 'ul', items: lines.map((l) => l.slice(2).trim()).filter(Boolean) }); continue; }
    if (lines[0].startsWith('## ')) {
      blocks.push({ type: 'h', text: lines[0].slice(3).trim() });
      const rest = lines.slice(1);
      if (rest.length) blocks.push({ type: 'p', text: rest.join(' ') });
      continue;
    }
    blocks.push({ type: 'p', text: lines.join(' ') });
  }
  return blocks;
}

/** "Title | https://..." lines, or just an address. Only https links. */
export function parseSources(text) {
  const out = [];
  for (const line of String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const [a, b] = line.includes('|') ? line.split('|').map((x) => x.trim()) : [line, line];
    const url = (b || a).trim();
    let ok = false;
    try { ok = new URL(url).protocol === 'https:'; } catch { ok = false; }
    if (!ok) return { sources: out, error: `"${line.slice(0, 60)}" needs a link starting with https://` };
    out.push({ title: clean(a === url ? new URL(url).hostname : a, 150), url: clean(url, 500) });
    if (out.length > MAX_SOURCES) return { sources: out.slice(0, MAX_SOURCES), error: `Up to ${MAX_SOURCES} sources, please.` };
  }
  return { sources: out };
}

export const sourcesToText = (sources = []) => sources.map((s) => `${s.title} | ${s.url}`).join('\n');
export const readingMinutes = (body) => Math.max(1, Math.round(String(body ?? '').split(/\s+/).filter(Boolean).length / 200));

/* ---------- checking and building a post ---------- */
const uniqueSlug = (base, taken) => { let s = base || 'post', i = 2; while (taken.has(s)) s = `${base}-${i++}`; return s; };

/**
 * @param raw     the form values
 * @param ctx     { existing, posts, modalities, status, profileId, now }  status: 'draft' | 'submitted' | 'published'
 * @returns {{valid:boolean, errors:Record<string,string>, record:object, warnings:string[]}}
 */
export function validatePost(raw, ctx) {
  const { existing, posts = [], modalities = [], status = 'draft', profileId, now = new Date() } = ctx;
  const full = status === 'submitted' || status === 'published';
  const errors = {};
  const f = {
    title: clean(raw.title, 120),
    summary: clean(raw.summary, 300),
    body: String(raw.body ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, 8000),
    kind: POST_KINDS.includes(raw.kind) ? raw.kind : '',
  };
  const slugs = Array.isArray(raw.modality_slugs) ? raw.modality_slugs : raw.modality_slugs ? [raw.modality_slugs] : [];
  f.modality_slugs = [...new Set(slugs.filter((s) => modalities.some((m) => m.slug === s)))].slice(0, 3);
  const src = parseSources(raw.sources);
  f.sources = src.sources;

  if (f.title.length < (full ? LIMITS.title[0] : 3)) errors.title = full ? `Give it a title of at least ${LIMITS.title[0]} characters.` : 'Give it a title.';
  if (!f.kind) errors.kind = 'Choose what kind of writing this is, so readers know how to read it.';
  if (src.error) errors.sources = src.error;
  if (full) {
    if (f.summary.length < LIMITS.summary[0]) errors.summary = `A short summary of ${LIMITS.summary[0]} to ${LIMITS.summary[1]} characters, shown in the feed.`;
    if (f.body.length < LIMITS.body[0]) errors.body = `Write at least ${LIMITS.body[0]} characters, so it is worth reading.`;
    if (f.kind === 'research' && !f.sources.length && !errors.sources) errors.sources = 'A research summary needs at least one source link.';
    if (!raw.license_ok && !existing?.license_confirmed_at) errors.license_ok = 'Please confirm the writing is yours to share, and that you are happy for it to be shared under Creative Commons Attribution.';
  }
  const checks = claimChecks(`${f.title}\n${f.summary}\n${f.body}`);
  if (full && checks.block.length) errors.body = errors.body ?? `This ${checks.block.join(' and ')}. We cannot publish that. Please describe what people experience instead, and encourage them to speak with their doctor about health concerns.`;

  const taken = new Set(posts.filter((p) => p.id !== existing?.id).map((p) => p.slug));
  const slug = existing?.slug ?? uniqueSlug(slugify(f.title), taken);
  const record = {
    ...(existing ?? {}),
    slug, profile_id: existing?.profile_id ?? profileId, ...f,
    status, license: LICENSE.id,
    ...(existing?.license_confirmed_at || (full && raw.license_ok) ? { license_confirmed_at: existing?.license_confirmed_at ?? now.toISOString() } : {}),
  };
  if (status === 'published') record.published_at = existing?.published_at ?? now.toISOString();
  else delete record.published_at;
  if (status !== 'rejected') delete record.review_note;
  return { valid: Object.keys(errors).length === 0, errors, record, warnings: checks.warn };
}

export const postToForm = (p) => ({ title: p.title ?? '', kind: p.kind ?? '', summary: p.summary ?? '', body: p.body ?? '', modality_slugs: p.modality_slugs ?? [], sources: sourcesToText(p.sources), license_ok: Boolean(p.license_confirmed_at) });

/* ---------- what the public sees ---------- */
const isPublicAuthor = (a) => a && a.demo !== true && a.publication_status === 'published' && ELIGIBLE_STATUSES.includes(a.verification_status);

/** Published posts whose author is a public, real profile. Newest first, each with its author attached. */
export function publicPosts(posts, publicAlchemists) {
  const byId = new Map(publicAlchemists.filter(isPublicAuthor).map((a) => [a.id, a]));
  return posts
    .filter((p) => p.status === 'published' && byId.has(p.profile_id))
    .map((p) => ({ ...p, author: byId.get(p.profile_id) }))
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
}
export const postsBy = (list, profileId) => list.filter((p) => p.profile_id === profileId);
export const postsAbout = (list, modalitySlug) => list.filter((p) => p.modality_slugs?.includes(modalitySlug));

/* ---------- the open feed ---------- */
export const escapeXml = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

/** An Atom feed of the latest posts, so anyone can follow or republish them. */
export function atomFeed(list, base, now = new Date()) {
  const items = list.slice(0, 30);
  const updated = items[0]?.updated_at ?? items[0]?.published_at ?? now.toISOString();
  const entries = items.map((p) => `  <entry>
    <title>${escapeXml(p.title)}</title>
    <link href="${escapeXml(`${base}/knowledge/${p.slug}`)}"/>
    <id>${escapeXml(`${base}/knowledge/${p.slug}`)}</id>
    <published>${escapeXml(p.published_at)}</published>
    <updated>${escapeXml(p.updated_at ?? p.published_at)}</updated>
    <author><name>${escapeXml(p.author.name)}</name><uri>${escapeXml(`${base}/alchemists/${p.author.slug}`)}</uri></author>
    <category term="${escapeXml(KIND_LABEL[p.kind] ?? p.kind)}"/>
    <summary>${escapeXml(p.summary)}</summary>
    <rights>${escapeXml(`${LICENSE.name}. Credit ${p.author.name} and link back to the original.`)}</rights>
  </entry>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Empatherapy knowledge feed</title>
  <subtitle>Free, openly licensed writing from Alchemists. Educational, not medical advice, and not crisis care.</subtitle>
  <link href="${escapeXml(`${base}/knowledge/feed.xml`)}" rel="self"/>
  <link href="${escapeXml(`${base}/knowledge`)}"/>
  <id>${escapeXml(`${base}/knowledge`)}</id>
  <updated>${escapeXml(updated)}</updated>
  <rights>${escapeXml(`${LICENSE.name} (${LICENSE.url})`)}</rights>
${entries}
</feed>
`;
}
