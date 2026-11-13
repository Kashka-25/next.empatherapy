import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSeeker, detectThemes, detectCrisis, normalise, overlap, offeredModalities } from '../lib/matching/index.mjs';
import { modalities } from '../data/modalities.mjs';
import { alchemists } from '../data/alchemists.mjs';

const data = { modalities, alchemists };
const names = (r) => r.alchemists.map((x) => x.alchemist.name);

test('normalise handles case, apostrophes and punctuation', () => {
  assert.equal(normalise("  I DON'T know,  really!! "), 'i dont know really');
});

test('themes are found by prefix and synonym, with stronger weight for repeats', () => {
  const t = detectThemes('I feel so overwhelmed and stressed, completely burnt out');
  assert.ok(t.overwhelm >= 0.85);
  assert.equal(detectThemes('hello there').overwhelm, undefined);
  assert.ok(detectThemes('I am grieving').grief);
});

test('crisis language is detected and nothing is suggested', () => {
  assert.equal(detectCrisis("I don't want to be here anymore"), true);
  const r = matchSeeker({ experience: 'I want to end my life' }, data);
  assert.equal(r.safety.crisis, true);
  assert.match(r.safety.message, /13 11 14/);
  assert.equal(r.alchemists.length, 0);
  assert.equal(r.modalities.length, 0);
});

test('empty input produces no signal rather than random results', () => {
  const r = matchSeeker({}, data);
  assert.equal(r.noSignal, true);
  assert.equal(r.alchemists.length, 0);
});

test('overwhelm plus body interest surfaces breath and body practices first, with explanations', () => {
  const r = matchSeeker({ experience: 'I feel overwhelmed and tense in my body', intents: ['grounded'], styles: ['body'] }, data);
  const top = r.modalities.map((m) => m.modality.slug);
  assert.ok(top.includes('breathwork') || top.includes('somatic-practices'));
  assert.ok(r.alchemists.length > 0);
  assert.equal(r.alchemists[0].alchemist.name, 'Mira Okafor');
  for (const a of r.alchemists) {
    assert.ok(a.reasons.length > 0, 'every suggestion explains itself');
    assert.ok(a.score >= 20 && a.score <= 100);
  }
  assert.match(r.alchemists[0].summary, /^We thought you might connect with Mira Okafor because/);
});

test('grief and creativity point to expressive arts', () => {
  const r = matchSeeker({ experience: 'I lost my grandmother and cannot find the words', intents: ['creative'], styles: ['creative'] }, data);
  assert.equal(r.modalities[0].modality.slug, 'expressive-arts');
  assert.equal(names(r)[0], 'Saoirse Lind');
});

test('in-person with a place excludes online-only Alchemists and others far away', () => {
  const r = matchSeeker({ experience: 'I am stressed and anxious', practical: { format: 'in-person', location: 'Sydney' } }, data);
  for (const a of r.alchemists) assert.ok(/sydney/i.test(a.alchemist.location.label));
  assert.ok(r.excluded.some((e) => e.reason.includes('not located near')));
  assert.ok(!names(r).includes('Tomas Reyes'));
});

test('online preference excludes in-person-only Alchemists', () => {
  const r = matchSeeker({ experience: 'I want to slow down and be out in nature', styles: ['nature'], practical: { format: 'online' } }, data);
  assert.ok(!names(r).includes('Wren Castellano'));
  assert.ok(r.excluded.some((e) => e.id === 'alch-wren'));
});

test('budget is a soft preference: it is flagged, not hidden', () => {
  const r = matchSeeker({ experience: 'I feel stuck and want to understand my emotions', styles: ['talking'], practical: { budget: 100 } }, data, { maxAlchemists: 6 });
  const priya = r.alchemists.find((a) => a.alchemist.name === 'Priya Nair');
  if (priya) assert.ok(priya.flags.includes('Above your budget'));
});

test('unpublished and unverified Alchemists are never suggested', () => {
  const extra = [
    { ...alchemists[1], id: 'x-unpub', name: 'Unpublished Person', slug: 'u', publication_status: 'draft' },
    { ...alchemists[1], id: 'x-pending', name: 'Pending Person', slug: 'p', verification_status: 'pending' },
  ];
  const r = matchSeeker({ experience: 'overwhelmed and tense body', styles: ['body'] }, { modalities, alchemists: [...alchemists, ...extra] }, { maxAlchemists: 10 });
  assert.ok(!names(r).includes('Unpublished Person'));
  assert.ok(!names(r).includes('Pending Person'));
  assert.deepEqual(r.excluded.filter((e) => e.id.startsWith('x-')).map((e) => e.reason).sort(), ['not published', 'not verified']);
});

test('modalities that require formal training only match when the Alchemist has it (founder interest does not count)', () => {
  const cassidy = alchemists.find((a) => a.slug === 'cassidy-dugan');
  const offered = offeredModalities(cassidy, modalities).map((o) => o.modality.slug);
  assert.ok(!offered.includes('psychedelic-integration'), 'an interest is not an offering');
  assert.ok(!offered.includes('internal-family-systems'), 'study is not formal training');
  assert.ok(!offered.includes('holistic-counselling'), 'unconfirmed training is not treated as formal');
  assert.ok(offered.includes('reiki-energy-work'));
  const tomas = alchemists.find((a) => a.slug === 'tomas-reyes');
  assert.ok(offeredModalities(tomas, modalities).some((o) => o.modality.slug === 'psychedelic-integration'));
});

test('psychedelic integration is not suggested through someone with only a personal interest', () => {
  const r = matchSeeker({ experience: 'I had an intense experience and want to make sense of it', intents: ['process'], styles: ['talking'] }, data, { maxAlchemists: 8 });
  const cass = r.alchemists.find((a) => a.alchemist.slug === 'cassidy-dugan');
  if (cass) assert.notEqual(cass.primaryModality.slug, 'psychedelic-integration');
  assert.ok(names(r).includes('Tomas Reyes'));
});

test('"surprise me" still returns suggestions and broadening options', () => {
  const r = matchSeeker({ experience: 'a bit stressed', styles: ['surprise'] }, data);
  assert.equal(r.surprise, true);
  assert.ok(r.alchemists.length > 0);
  assert.ok(r.explore.modalities.length > 0);
});

test('results are deterministic', () => {
  const input = { experience: 'burnt out, want rest and nature', intents: ['grounded'], styles: ['nature', 'mindful'] };
  assert.deepEqual(JSON.stringify(matchSeeker(input, data)), JSON.stringify(matchSeeker(input, data)));
});

test('overlap normalises so breadth does not beat relevance', () => {
  const seeker = { overwhelm: 0.7 };
  assert.equal(overlap(['overwhelm'], seeker).score, overlap(['overwhelm', 'rest', 'body', 'nature'], seeker).score);
});

test('every suggestion carries the exploratory disclaimer', () => {
  const r = matchSeeker({ experience: 'stressed' }, data);
  assert.match(r.disclaimer, /not a diagnosis/);
});
