/**
 * Discovery matching engine.
 *
 * Pure functions: data goes in, an explained result comes out. No network, no storage, no UI.
 * A Seeker's words are only ever analysed in memory, here, and are not kept.
 *
 * How it works (all rules are visible below):
 *  1. Find THEMES in what the Seeker wrote and ticked (keyword and synonym rules in vocabulary.mjs).
 *  2. Score each modality and Alchemist on four dimensions:
 *       experience  (what they described)        weight 0.35
 *       intention   (what they hope to find)     weight 0.20
 *       openness    (styles they are open to)    weight 0.20
 *       practical   (format, place, budget)      weight 0.25  (Alchemists only)
 *     A dimension the Seeker left blank is skipped and the others share its weight.
 *  3. Apply exclusion rules (not published or not verified, wrong format or place, no formal training where it is required).
 *  4. Rank by score and explain every suggestion in plain words.
 *
 * Later, an AI interpretation step can fill `experience` and `intention` theme weights from free text.
 * Everything downstream stays the same, and basic discovery never depends on it.
 */
import { THEMES, INTENTS, STYLES, CRISIS_PHRASES, SUPPORT_MESSAGE, DISCLAIMER } from './vocabulary.mjs';

export const WEIGHTS = { experience: 0.35, intention: 0.2, openness: 0.2, practical: 0.25 };
export const ELIGIBLE_STATUSES = ['verified', 'founder', 'demo'];
export const MIN_SCORE = 0.2;
/** How much a practice counts, by the kind of experience behind it. Formal training counts most. */
export const BASIS_WEIGHT = { formal: 1, experience: 0.9, study: 0.8, confirm: 0.7 };

/** Lowercase, drop apostrophes, turn other punctuation into spaces, collapse spaces. */
export function normalise(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startsAtWord = (text, kw) => new RegExp(`(^|\\s)${escapeRe(normalise(kw))}`).test(text);
const countHits = (text, kw) => (text.match(new RegExp(`(^|\\s)${escapeRe(normalise(kw))}`, 'g')) || []).length;

export function detectCrisis(text) {
  const n = normalise(text);
  return CRISIS_PHRASES.some((p) => startsAtWord(n, p));
}

/** Theme id -> weight (0.7 for one hit, 0.85 for two, 1 for three or more). */
export function detectThemes(text, themes = THEMES) {
  const n = normalise(text);
  const found = {};
  if (!n) return found;
  for (const [id, def] of Object.entries(themes)) {
    const hits = def.keywords.reduce((sum, kw) => sum + Math.min(countHits(n, kw), 2), 0);
    if (hits > 0) found[id] = hits >= 3 ? 1 : hits === 2 ? 0.85 : 0.7;
  }
  return found;
}

function mergeMaps(...maps) {
  const out = {};
  for (const m of maps) for (const [k, v] of Object.entries(m)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

/** How well an entity's themes cover the Seeker's (0 to 1), plus which ones matched. */
export function overlap(entityThemes, seekerMap) {
  const total = Object.values(seekerMap).reduce((a, b) => a + b, 0);
  if (total === 0) return { score: 0, matched: [] };
  const matched = entityThemes.filter((t) => seekerMap[t]);
  const sum = matched.reduce((a, t) => a + seekerMap[t], 0);
  return { score: Math.min(1, sum / Math.max(1, Math.min(2, total))), matched };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const styleLabel = (id) => STYLES.find((s) => s.id === id)?.label.toLowerCase() ?? id;

/** Blend the applicable dimensions into a 0 to 1 score. */
function blend(parts) {
  let w = 0;
  let s = 0;
  for (const [dim, value] of Object.entries(parts)) {
    if (value == null) continue;
    w += WEIGHTS[dim];
    s += WEIGHTS[dim] * value;
  }
  return w === 0 ? 0 : s / w;
}

function prepare(input = {}) {
  const intentThemes = (input.intents || []).flatMap((id) => INTENTS.find((i) => i.id === id)?.themes ?? []);
  const experienceMap = detectThemes(input.experience);
  const intentionMap = mergeMaps(detectThemes(input.intention), Object.fromEntries(intentThemes.map((t) => [t, 1])));
  const styles = (input.styles || []).filter((s) => s !== 'surprise');
  const surprise = (input.styles || []).includes('surprise');
  const practical = input.practical || {};
  const budget = Number(practical.budget) > 0 ? Number(practical.budget) : null;
  const format = ['online', 'in-person', 'either'].includes(practical.format) ? practical.format : null;
  const location = normalise(practical.location || '');
  return { experienceMap, intentionMap, styles, surprise, format, location, budget };
}

function themeReasons(entityThemes, seeker, name) {
  const combined = mergeMaps(seeker.experienceMap, seeker.intentionMap);
  const ordered = Object.keys(combined).sort((a, b) => combined[b] - combined[a] || a.localeCompare(b));
  const matches = ordered.filter((t) => entityThemes.includes(t)).slice(0, 2);
  if (!matches.length) return [];
  const labels = matches.map((t) => THEMES[t].label);
  // One clear sentence, however many themes matched: "you mentioned A and B, and X is commonly explored for both".
  return [{ themes: matches, text: `you mentioned ${labels.join(' and ')}${name ? `, and ${name} is commonly explored for ${labels.length > 1 ? 'both' : 'this'}` : ''}` }];
}

function scoreModality(modality, seeker) {
  const exp = Object.keys(seeker.experienceMap).length ? overlap(modality.themes, seeker.experienceMap) : null;
  const int = Object.keys(seeker.intentionMap).length ? overlap(modality.themes, seeker.intentionMap) : null;
  const open = seeker.styles.length ? (modality.styles.some((s) => seeker.styles.includes(s)) ? 1 : 0.15) : null;
  const score = blend({ experience: exp?.score ?? null, intention: int?.score ?? null, openness: open });
  const clauses = themeReasons(modality.themes, seeker, modality.name.toLowerCase()).map((r) => r.text);
  const hitStyle = seeker.styles.filter((s) => modality.styles.includes(s));
  if (hitStyle.length) clauses.push(`you said you are open to ${styleLabel(hitStyle[0])}`);
  return { score, clauses, exp: exp?.score ?? 0, int: int?.score ?? 0 };
}

/** The modalities an Alchemist can honestly be matched on (formal training where required, and never mere interests). */
export function offeredModalities(alchemist, modalityList) {
  return alchemist.modalities
    .map((m) => ({ ...m, modality: modalityList.find((x) => x.slug === m.slug) }))
    .filter((m) => m.modality && m.basis !== 'interest' && (!m.modality.requires_formal_training || m.basis === 'formal'));
}

function practicalFit(alchemist, seeker) {
  const out = { format: null, location: null, budget: null, hardFail: null };
  const formats = alchemist.delivery_formats;
  if (seeker.format === 'online') {
    out.format = formats.includes('online');
    if (!out.format) out.hardFail = 'online sessions are not offered';
  } else if (seeker.format === 'in-person') {
    out.format = formats.includes('in-person');
    if (!out.format) out.hardFail = 'in-person sessions are not offered';
  }
  if (seeker.location && seeker.format !== 'online') {
    const place = normalise(`${alchemist.location.label} ${alchemist.location.region}`);
    const near = seeker.location.split(' ').filter((t) => t.length >= 3).some((t) => place.includes(t));
    if (seeker.format === 'in-person') {
      out.location = near;
      if (!near && !out.hardFail) out.hardFail = 'not located near the place you gave';
    } else {
      out.location = near || formats.includes('online');
    }
  }
  if (seeker.budget != null) out.budget = alchemist.pricing.from <= seeker.budget;
  return out;
}

function practicalScore(fit) {
  const checks = [fit.format, fit.location, fit.budget].filter((c) => c !== null);
  return checks.length ? checks.filter(Boolean).length / checks.length : null;
}

/**
 * Match a Seeker to modalities and Alchemists.
 * @param {{experience?:string,intention?:string,intents?:string[],styles?:string[],practical?:{format?:string,location?:string,budget?:number|string}}} input
 * @param {{modalities:Array,alchemists:Array}} data
 */
export function matchSeeker(input, data, options = {}) {
  const { eligibleStatuses = ELIGIBLE_STATUSES, maxAlchemists = 3, maxExplore = 3, minScore = MIN_SCORE } = options;
  const base = { safety: { crisis: false }, noSignal: false, themes: [], alchemists: [], modalities: [], explore: { modalities: [], alchemists: [] }, excluded: [], disclaimer: DISCLAIMER };

  if (detectCrisis(`${input?.experience || ''} ${input?.intention || ''}`)) {
    return { ...base, safety: { crisis: true, message: SUPPORT_MESSAGE } };
  }

  const seeker = prepare(input);
  const combined = mergeMaps(seeker.experienceMap, seeker.intentionMap);
  const hasSignal = Object.keys(combined).length > 0 || seeker.styles.length > 0;
  base.themes = Object.keys(combined).sort((a, b) => combined[b] - combined[a] || a.localeCompare(b)).map((id) => ({ id, label: THEMES[id].label, weight: combined[id] }));
  if (!hasSignal) return { ...base, noSignal: true };

  // Modalities
  const scoredModalities = data.modalities
    .filter((m) => m.publication_status === 'published')
    .map((m) => ({ modality: m, ...scoreModality(m, seeker) }))
    .sort((a, b) => b.score - a.score || a.modality.name.localeCompare(b.modality.name));

  // Alchemists
  const excluded = [];
  const scoredAlchemists = [];
  for (const a of data.alchemists) {
    if (a.publication_status !== 'published') { excluded.push({ id: a.id, reason: 'not published' }); continue; }
    if (!eligibleStatuses.includes(a.verification_status)) { excluded.push({ id: a.id, reason: 'not verified' }); continue; }
    const offered = offeredModalities(a, data.modalities);
    if (!offered.length) { excluded.push({ id: a.id, reason: 'no modality with suitable training' }); continue; }
    const fit = practicalFit(a, seeker);
    if (fit.hardFail) { excluded.push({ id: a.id, reason: fit.hardFail }); continue; }

    // Depth beats breadth: half the score is the Alchemist's single best-fitting practice,
    // weighted by how solid the basis is (formal training counts most).
    const perMod = offered
      .map((o) => { const s = scoreModality(o.modality, seeker); return { ...o, ...s, weighted: s.score * (BASIS_WEIGHT[o.basis] ?? 0.7) }; })
      .sort((x, y) => y.weighted - x.weighted || x.modality.name.localeCompare(y.modality.name));
    const themes = [...new Set(offered.flatMap((o) => o.modality.themes))];
    const styles = [...new Set(offered.flatMap((o) => o.modality.styles))];
    const exp = Object.keys(seeker.experienceMap).length ? overlap(themes, seeker.experienceMap).score : null;
    const int = Object.keys(seeker.intentionMap).length ? overlap(themes, seeker.intentionMap).score : null;
    const open = seeker.styles.length ? (styles.some((s) => seeker.styles.includes(s)) ? 1 : 0.15) : null;
    const core = 0.5 * blend({ experience: exp, intention: int, openness: open }) + 0.5 * perMod[0].weighted;
    const pScore = practicalScore(fit);
    const score = pScore == null ? core : core * (1 - WEIGHTS.practical) + pScore * WEIGHTS.practical;

    const best = perMod[0];
    const clauses = themeReasons(best.modality.themes, seeker, `their ${best.modality.name.toLowerCase()}`).map((r) => r.text);
    if (seeker.styles.length) {
      const hit = seeker.styles.find((s) => styles.includes(s));
      if (hit) clauses.push(`you said you are open to ${styleLabel(hit)}, which fits their approach`);
    }
    if (a.approach_tags?.length) clauses.push(`their approach is ${a.approach_tags.slice(0, 3).join(', ')}`);
    if (fit.format === true && seeker.format) clauses.push(`they offer ${seeker.format === 'in-person' ? 'in-person' : 'online'} sessions`);
    if (fit.budget === true) clauses.push(`sessions start from $${a.pricing.from} ${a.pricing.currency}`);
    if (fit.budget === false) clauses.push(`their sessions start from $${a.pricing.from}, a little above the budget you gave`);
    const flags = [];
    if (a.demo) flags.push('Example profile: a fictional person shown to demonstrate Empatherapy.');
    if (best.modality.requires_formal_training) flags.push('This practice needs professional training, and this Alchemist lists it.');
    if (fit.budget === false) flags.push('Above your budget');

    scoredAlchemists.push({
      alchemist: a, score, rawScore: score, clauses: clauses.slice(0, 4), primaryModality: best.modality, practical: fit, flags,
    });
  }
  scoredAlchemists.sort((x, y) => y.score - x.score || x.alchemist.name.localeCompare(y.alchemist.name));

  const finish = (r) => {
    const reasons = r.clauses.map((c) => `${cap(c)}.`);
    const summary = r.clauses.length ? `We thought you might connect with ${r.alchemist.name} because ${r.clauses.slice(0, 2).join(', and ')}.` : `We thought you might like to meet ${r.alchemist.name}.`;
    return { alchemist: r.alchemist, score: Math.round(r.score * 100), reasons, summary, primaryModality: r.primaryModality, practical: r.practical, flags: r.flags };
  };
  const finishModality = (r) => ({
    modality: r.modality, score: Math.round(r.score * 100),
    reasons: r.clauses.map((c) => `${cap(c)}.`),
    flags: r.modality.requires_formal_training ? ['Look for a practitioner with relevant professional training.'] : [],
  });

  const qualifying = scoredAlchemists.filter((r) => r.score >= minScore);
  const main = qualifying.slice(0, maxAlchemists);
  const topModalities = scoredModalities.filter((m) => m.score >= minScore);
  const mainModalities = topModalities.slice(0, 3);

  // "You might also find these interesting": broaden beyond the styles the Seeker picked, deterministically.
  const exploreModalityPool = topModalities.slice(3);
  const broadening = exploreModalityPool.filter((m) => !m.modality.styles.some((s) => seeker.styles.includes(s)));
  const exploreModalities = [...broadening, ...exploreModalityPool.filter((m) => !broadening.includes(m))].slice(0, maxExplore);
  const exploreAlchemists = qualifying.slice(maxAlchemists, maxAlchemists + 2);

  return {
    ...base,
    alchemists: main.map(finish),
    modalities: mainModalities.map(finishModality),
    explore: { modalities: exploreModalities.map(finishModality), alchemists: exploreAlchemists.map(finish) },
    excluded,
    surprise: seeker.surprise,
  };
}
