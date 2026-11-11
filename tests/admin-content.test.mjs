import test from 'node:test';
import assert from 'node:assert/strict';
import { alchemists } from '../data/alchemists.mjs';
import { modalities } from '../data/modalities.mjs';
import { overlay } from '../lib/content-store.mjs';
import {
  alchemistToForm, validateAlchemist, modalityToForm, validateModality, modalityDeleteBlocker,
  slugify, lines, paragraphs, csv,
} from '../lib/admin-content.mjs';
import { alchemistsFor, modalitiesOf, bySlug } from '../lib/content.mjs';

const ctx = { alchemists, modalities };
const minimalDraft = { name: 'Jo Example', title: 'Test Alchemist', short_bio: 'A short bio that is comfortably over twenty characters long.', publication_status: 'draft' };
const complete = (over = {}) => ({
  ...minimalDraft, personal_story: 'My story, in a few honest sentences.', philosophy: 'My philosophy of care, written plainly and kindly.',
  modalities: 'breathwork: formal', safety_information: 'Please check with your doctor before starting breathwork.',
  session_steps: 'Arrive | We settle in', pricing_sessions: 'First session | 30 min | $90 | A gentle start', pricing_from: '90',
  delivery_formats: ['online'], location_label: 'Online', suits: 'People who feel wired', verification_status: 'verified', ...over,
});

/* ---------- round trips: opening and saving unchanged changes nothing ---------- */
for (const a of alchemists) {
  test(`round trip keeps ${a.name} exactly as it was`, () => {
    const r = validateAlchemist(alchemistToForm(a), a, ctx);
    assert.deepEqual(r.errors, {});
    assert.deepEqual(r.record, a);
  });
}
for (const m of modalities) {
  test(`round trip keeps the ${m.name} page exactly as it was`, () => {
    const r = validateModality(modalityToForm(m), m, ctx);
    assert.deepEqual(r.errors, {});
    assert.deepEqual(r.record, m);
  });
}

/* ---------- helpers ---------- */
test('text helpers', () => {
  assert.equal(slugify('  Zoë O’Brien-Smith! '), 'zoe-o-brien-smith');
  assert.deepEqual(lines('a\n\n b \r\n<c>'), ['a', 'b', 'c']);
  assert.deepEqual(paragraphs('one\ntwo\n\nthree'), ['one two', 'three']);
  assert.deepEqual(csv('a, b ,, c'), ['a', 'b', 'c']);
});

/* ---------- Alchemist rules ---------- */
test('a draft needs only the basics', () => {
  const r = validateAlchemist(minimalDraft, null, ctx);
  assert.equal(r.valid, true);
  assert.equal(r.record.publication_status, 'draft');
  assert.equal(r.record.verification_status, 'pending');
  assert.equal(r.record.id, 'alch-jo-example');
  assert.equal(r.record.demo, false);
  assert.match(r.record.initials, /^JE$/);
});

test('publishing an incomplete or unverified profile is refused with specific reasons', () => {
  const r = validateAlchemist({ ...minimalDraft, publication_status: 'published' }, null, ctx);
  assert.equal(r.valid, false);
  for (const k of ['personal_story', 'philosophy', 'safety_information', 'modalities', 'session_steps', 'pricing_sessions', 'delivery_formats', 'location_label', 'suits', 'verification_status']) assert.ok(r.errors[k], k);
});

test('a complete verified profile can be published, but pending cannot', () => {
  assert.equal(validateAlchemist(complete({ publication_status: 'published' }), null, ctx).valid, true);
  const pending = validateAlchemist(complete({ publication_status: 'published', verification_status: 'pending' }), null, ctx);
  assert.ok(pending.errors.verification_status);
});

test('nobody can be made a founder or a fictional example from the form', () => {
  assert.ok(validateAlchemist(complete({ verification_status: 'founder' }), null, ctx).errors.verification_status);
  assert.ok(validateAlchemist(complete({ verification_status: 'demo' }), null, ctx).errors.verification_status);
});

test('fictional examples stay examples, whatever the form says', () => {
  const mira = alchemists.find((a) => a.slug === 'mira-okafor');
  const r = validateAlchemist({ ...alchemistToForm(mira), verification_status: 'verified' }, mira, ctx);
  assert.equal(r.record.verification_status, 'demo');
  assert.equal(r.record.demo, true);
});

test('the founder keeps founder status when edited', () => {
  const c = alchemists.find((a) => a.slug === 'cassidy-dugan');
  assert.equal(validateAlchemist(alchemistToForm(c), c, ctx).record.verification_status, 'founder');
});

test('practices must exist, have a real basis, and not repeat', () => {
  assert.ok(validateAlchemist(complete({ modalities: 'made-up: formal' }), null, ctx).errors.modalities);
  assert.ok(validateAlchemist(complete({ modalities: 'breathwork: expert' }), null, ctx).errors.modalities);
  assert.ok(validateAlchemist(complete({ modalities: 'breathwork: formal\nbreathwork: study' }), null, ctx).errors.modalities);
  assert.ok(validateAlchemist(complete({ modalities: 'psychedelic-integration: interest', publication_status: 'published' }), null, ctx).errors.modalities, 'an interest alone is not an offering');
});

test('slugs are unique and an existing slug never changes', () => {
  const r = validateAlchemist({ ...minimalDraft, name: 'Mira Okafor' }, null, ctx);
  assert.equal(r.record.slug, 'mira-okafor-2');
  const mira = alchemists.find((a) => a.slug === 'mira-okafor');
  assert.equal(validateAlchemist({ ...alchemistToForm(mira), name: 'Mira O. Renamed' }, mira, ctx).record.slug, 'mira-okafor');
});

test('contact fields and prices are checked, and text is sanitised', () => {
  const r = validateAlchemist(complete({ enquiry_email: 'nope', website: 'ftp://x', pricing_from: '99999', pricing_sessions: 'only a title' }), null, ctx);
  for (const k of ['enquiry_email', 'website', 'pricing_from', 'pricing_sessions']) assert.ok(r.errors[k], k);
  const s = validateAlchemist(complete({ name: '<img src=x onerror=alert(1)>Jo', short_bio: minimalDraft.short_bio + '<script>' }), null, ctx);
  assert.ok(!/[<>]/.test(s.record.name) && !/[<>]/.test(s.record.short_bio));
  assert.ok(validateAlchemist(complete({ short_bio: 'x'.repeat(9000) }), null, ctx).record.short_bio.length <= 400);
});

test('"(confirm)" markers survive editing so unconfirmed items stay flagged', () => {
  const c = alchemists.find((a) => a.slug === 'cassidy-dugan');
  const r = validateAlchemist(alchemistToForm(c), c, ctx);
  assert.ok(r.record.qualifications.some((q) => q.confirm));
  assert.ok(r.record.pricing.sessions.some((s) => s.confirm));
  const cleared = validateAlchemist({ ...alchemistToForm(c), qualifications: 'Reiki Level 2' }, c, ctx);
  assert.deepEqual(cleared.record.qualifications, [{ title: 'Reiki Level 2', basis: 'formal' }]);
});

/* ---------- modality rules ---------- */
const modComplete = (over = {}) => ({
  ...modalityToForm(modalities[0]), name: 'Test Practice', ...over,
});

test('a modality needs themes, styles, evidence and honest safety text to be published', () => {
  const r = validateModality({ name: 'Draft Practice', category: 'body', publication_status: 'published' }, null, ctx);
  for (const k of ['short_description', 'full_description', 'evidence_information', 'limitations', 'contraindications', 'themes', 'styles']) assert.ok(r.errors[k], k);
  assert.equal(validateModality({ name: 'Draft Practice', category: 'body', publication_status: 'draft' }, null, ctx).valid, true);
});

test('modality evidence must name a valid kind, and themes and styles must come from the shared vocabulary', () => {
  assert.ok(validateModality(modComplete({ evidence_information: 'rumour | someone said so' }), null, ctx).errors.evidence_information);
  const r = validateModality(modComplete({ themes: ['overwhelm', 'not-a-theme'], styles: ['body', 'surprise', 'nonsense'], related_modalities: ['somatic-practices', 'missing'] }), null, ctx);
  assert.deepEqual(r.record.themes, ['overwhelm']);
  assert.deepEqual(r.record.styles, ['body']);
  assert.deepEqual(r.record.related_modalities, ['somatic-practices']);
});

test('a new modality gets a unique slug and id; an existing slug never changes', () => {
  assert.equal(validateModality(modComplete({ name: 'Breathwork' }), null, ctx).record.slug, 'breathwork-2');
  const bw = modalities[0];
  assert.equal(validateModality({ ...modalityToForm(bw), name: 'Renamed' }, bw, ctx).record.slug, bw.slug);
});

test('deleting: built-ins are protected, and a modality someone lists cannot be deleted', () => {
  const seedIds = new Set(modalities.map((m) => m.id));
  assert.match(modalityDeleteBlocker(modalities[0], alchemists, seedIds), /Built-in/);
  const custom = { id: 'mod-new', slug: 'breathwork-2' };
  assert.equal(modalityDeleteBlocker(custom, alchemists, seedIds), null);
  const used = { id: 'mod-new2', slug: 'breathwork' };
  assert.match(modalityDeleteBlocker(used, alchemists, new Set()), /Still listed by/);
});

/* ---------- the content layer ---------- */
test('stored edits replace built-in content one record at a time, and new records are added', () => {
  const edited = { ...alchemists[1], name: 'Edited Name' };
  const added = { ...alchemists[2], id: 'alch-new', slug: 'new-person' };
  const merged = overlay(alchemists, [edited, added]);
  assert.equal(merged.length, alchemists.length + 1);
  assert.equal(merged[1].name, 'Edited Name');
  assert.equal(merged[2].name, alchemists[2].name, 'untouched records stay as they were');
  assert.equal(merged.at(-1).slug, 'new-person');
  assert.deepEqual(overlay(alchemists, []), alchemists, 'with nothing stored the built-in content is unchanged');
});

test('helpers work on edited lists: an unpublished modality disappears from profiles and listings', () => {
  const mira = alchemists.find((a) => a.slug === 'mira-okafor');
  const published = modalities.filter((m) => m.slug !== 'breathwork');
  assert.ok(!modalitiesOf(mira, published).some((m) => m.slug === 'breathwork'));
  assert.ok(modalitiesOf(mira, modalities).some((m) => m.slug === 'breathwork'));
  assert.ok(!alchemistsFor(bySlug(modalities, 'breathwork'), alchemists.map((a) => ({ ...a, publication_status: 'draft' }))).length);
});
