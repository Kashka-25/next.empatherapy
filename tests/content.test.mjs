import test from 'node:test';
import assert from 'node:assert/strict';
import { modalities } from '../data/modalities.mjs';
import { alchemists } from '../data/alchemists.mjs';
import { featuredModalities, activeFeatures } from '../data/features.mjs';
import { filterAlchemists, curatedOrder } from '../lib/directory.mjs';
import { validateApplication } from '../lib/validation.mjs';
import { THEMES } from '../lib/matching/vocabulary.mjs';

test('content shape: at least 6 example Alchemists, 8 modalities, and the founding profile', () => {
  assert.ok(alchemists.filter((a) => a.demo).length >= 6);
  assert.ok(modalities.length >= 8);
  const founder = alchemists.find((a) => a.slug === 'cassidy-dugan');
  assert.equal(founder.offering_name, 'The Homecoming Sessions');
  assert.equal(founder.demo, false);
});

test('slugs are unique and every Alchemist modality exists', () => {
  const slugs = [...alchemists.map((a) => a.slug), ...modalities.map((m) => m.slug)];
  assert.equal(new Set(alchemists.map((a) => a.slug)).size, alchemists.length);
  assert.equal(new Set(modalities.map((m) => m.slug)).size, modalities.length);
  assert.ok(slugs.length > 0);
  for (const a of alchemists) for (const m of a.modalities) assert.ok(modalities.some((x) => x.slug === m.slug), `${a.slug} -> ${m.slug}`);
  for (const m of modalities) for (const r of m.related_modalities) assert.ok(modalities.some((x) => x.slug === r), `${m.slug} -> ${r}`);
});

test('all tags use the shared vocabulary', () => {
  for (const m of modalities) for (const t of m.themes) assert.ok(THEMES[t], `${m.slug} theme ${t}`);
});

test('every modality page has the full educational structure with labelled evidence', () => {
  for (const m of modalities) {
    for (const k of ['short_description', 'full_description', 'origins', 'practice_description', 'typical_session', 'limitations', 'contraindications']) assert.ok(m[k], `${m.slug}.${k}`);
    assert.ok(m.commonly_explored_for.length > 0);
    assert.ok(m.evidence_information.length > 0);
    for (const e of m.evidence_information) assert.ok(['traditional', 'practitioner', 'research', 'established'].includes(e.kind));
  }
});

test('example Alchemists are labelled as demo and are never marked verified', () => {
  for (const a of alchemists.filter((x) => x.demo)) assert.equal(a.verification_status, 'demo');
});

test('the founding profile keeps training, study, interest and unconfirmed items distinct', () => {
  const f = alchemists.find((a) => a.slug === 'cassidy-dugan');
  assert.equal(f.modalities.find((m) => m.slug === 'psychedelic-integration').basis, 'interest');
  assert.match(f.safety_information, /not clinical training/);
  assert.match(f.safety_information, /do not provide, recommend or facilitate/);
});

test('weekly features: one to three active, and never empty', () => {
  const week = activeFeatures('2026-11-10');
  assert.ok(week.length >= 1 && week.length <= 3);
  assert.deepEqual(week.map((f) => f.featured_position), [...week.map((f) => f.featured_position)].sort());
  assert.ok(activeFeatures('2027-03-01').length >= 1, 'falls back to the latest week');
  assert.ok(featuredModalities.every((f) => modalities.some((m) => m.id === f.modality_id)));
  assert.ok(activeFeatures('2026-11-10').every((f) => f.publication_status === 'published'), 'archived features are not shown');
});

test('directory search and filters', () => {
  const pub = alchemists;
  assert.equal(filterAlchemists(pub, { modality: 'breathwork' }, modalities).map((a) => a.name).includes('Mira Okafor'), true);
  assert.ok(filterAlchemists(pub, { format: 'online' }, modalities).every((a) => a.delivery_formats.includes('online')));
  assert.ok(filterAlchemists(pub, { format: 'hybrid' }, modalities).every((a) => a.delivery_formats.length === 2));
  assert.ok(filterAlchemists(pub, { maxPrice: 80 }, modalities).every((a) => a.pricing.from <= 80));
  assert.ok(filterAlchemists(pub, { location: 'melbourne' }, modalities).length >= 2);
  assert.ok(filterAlchemists(pub, { query: 'grief' }, modalities).some((a) => a.name === 'Saoirse Lind'));
  assert.equal(filterAlchemists(pub, { query: 'zzzz-nothing' }, modalities).length, 0);
  assert.equal(curatedOrder(pub)[0].featured_status, true);
});

const good = {
  name: 'Sam Example', email: 'sam@example.com', introduction: 'I offer gentle breath and movement sessions for people who feel stressed.',
  personal_story: 'I found this work after a long period of burnout and wanted to share what helped me recover, slowly and kindly.',
  modalities: 'Breathwork', qualifications: 'Certificate in breathwork facilitation', experience: '3 years', location: 'Sydney',
  delivery_format: 'both', pricing: '$150 per hour', links: 'https://example.com', consent: true,
};

test('application: a complete application is valid and sanitised', () => {
  const r = validateApplication({ ...good, name: '  Sam <b>Example</b>  ' });
  assert.equal(r.valid, true);
  assert.equal(r.data.name, 'Sam bExample/b');
});

test('application: missing and malformed fields are reported clearly', () => {
  const r = validateApplication({ ...good, email: 'nope', introduction: 'short', consent: false, links: 'not a link', delivery_format: 'x' });
  assert.equal(r.valid, false);
  for (const k of ['email', 'introduction', 'consent', 'links', 'delivery_format']) assert.ok(r.errors[k], k);
  assert.equal(validateApplication({}).valid, false);
});
