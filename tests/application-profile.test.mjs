import test from 'node:test';
import assert from 'node:assert/strict';
import { draftFromApplication, matchModalities, terms } from '../lib/application-to-profile.mjs';
import { validateAlchemist, alchemistToForm } from '../lib/admin-content.mjs';
import { alchemists } from '../data/alchemists.mjs';
import { modalities } from '../data/modalities.mjs';

const ctx = { alchemists, modalities };
const application = {
  name: 'Sam Example', email: 'sam@example.com',
  introduction: 'I offer gentle breath and movement sessions for people who feel stressed and want a slower pace.',
  personal_story: 'I found this work after a long period of burnout.\n\nIt changed how I live, and I wanted to share what helped.',
  modalities: 'Breathwork, Reiki and sound healing; Aura reading',
  qualifications: 'Certificate in Breathwork Facilitation\nFirst Aid certificate (2024)',
  experience: 'Ten years of daily meditation',
  location: 'Inner West, Sydney', delivery_format: 'both', pricing: '$90 a session, concessions available',
  links: 'https://sam.example.com https://instagram.com/samexample', consent: true,
};

test('terms: splits a free-text list of practices', () => {
  assert.deepEqual(terms('Breathwork, Reiki and sound healing; Aura reading'), ['Breathwork', 'Reiki', 'sound healing', 'Aura reading']);
  assert.deepEqual(terms('- breathwork\n- somatic / movement'), ['breathwork', 'somatic', 'movement']);
  assert.deepEqual(terms(''), []);
});

test('matching: practices are matched to modality pages and the rest are kept aside', () => {
  const r = matchModalities(application.modalities, modalities);
  assert.deepEqual(r.matched, ['breathwork', 'reiki-energy-work', 'sound-healing']);
  assert.deepEqual(r.unmatched, ['Aura reading']);
  assert.deepEqual(matchModalities('Breath work', modalities).matched, ['breathwork']);
  assert.deepEqual(matchModalities('somatic', modalities).matched, ['somatic-practices']);
  assert.deepEqual(matchModalities('IFS', modalities).matched, [], 'no guessing from abbreviations');
  assert.deepEqual(matchModalities('ab', modalities).matched, [], 'very short terms never match');
  assert.deepEqual(matchModalities('breathwork, Breathwork', modalities).matched, ['breathwork'], 'no duplicates');
});

test('draft: an application becomes a hidden, unverified draft that passes the normal rules', () => {
  const { form } = draftFromApplication(application, modalities);
  assert.equal(form.publication_status, 'draft');
  assert.equal(form.verification_status, 'pending');
  const r = validateAlchemist(form, null, ctx);
  assert.deepEqual(r.errors, {});
  assert.equal(r.record.id, 'alch-sam-example');
  assert.equal(r.record.publication_status, 'draft');
  assert.equal(r.record.verification_status, 'pending');
  assert.equal(r.record.demo, false);
  assert.deepEqual(r.record.personal_story, ['I found this work after a long period of burnout.', 'It changed how I live, and I wanted to share what helped.']);
  assert.deepEqual(r.record.delivery_formats, ['online', 'in-person']);
  assert.equal(r.record.location.label, 'Inner West, Sydney');
});

test('draft: nothing the applicant claims becomes verified fact', () => {
  const { form } = draftFromApplication(application, modalities);
  const r = validateAlchemist(form, null, ctx);
  assert.ok(r.record.modalities.every((m) => m.basis === 'confirm'), 'practices are claims, never formal training');
  assert.ok(r.record.qualifications.length === 2 && r.record.qualifications.every((q) => q.confirm === true && q.basis === 'formal'), 'qualifications are flagged to confirm');
  assert.equal(r.record.qualifications[0].title, 'Certificate in Breathwork Facilitation');
  assert.equal(r.record.experience[0].title, 'Ten years of daily meditation');
});

test('draft: the applicant\'s email is not copied onto the public profile, and original answers are kept aside', () => {
  const { form, source } = draftFromApplication(application, modalities);
  assert.equal(form.enquiry_email, '');
  assert.ok(!JSON.stringify(form).includes('sam@example.com'));
  assert.equal(form.website, 'https://sam.example.com');
  assert.equal(form.pricing_note, application.pricing);
  assert.equal(form.pricing_sessions, '', 'a price is never invented');
  assert.deepEqual(source.unmatched_practices, ['Aura reading']);
  assert.equal(source.qualifications_as_written, application.qualifications);
  assert.deepEqual(source.links, ['https://sam.example.com', 'https://instagram.com/samexample']);
});

test('draft: "none yet" is not turned into a qualification, and a long introduction is shortened', () => {
  const none = draftFromApplication({ ...application, qualifications: 'None yet', delivery_format: 'online' }, modalities);
  assert.equal(none.form.qualifications, '');
  assert.deepEqual(none.form.delivery_formats, ['online']);
  const long = draftFromApplication({ ...application, introduction: 'word '.repeat(300) }, modalities);
  assert.ok(long.form.short_bio.length <= 400 && long.form.short_bio.endsWith('…'));
  assert.equal(validateAlchemist(long.form, null, ctx).valid, true);
});

test('draft: a name clash gets its own address, and a bad name is explained', () => {
  const { form } = draftFromApplication({ ...application, name: 'Mira Okafor' }, modalities);
  assert.equal(validateAlchemist(form, null, ctx).record.slug, 'mira-okafor-2');
  assert.ok(validateAlchemist(draftFromApplication({ ...application, name: 'X' }, modalities).form, null, ctx).errors.name);
});

/* ---------- "verified" has to mean someone checked ---------- */
const publishable = (over = {}) => {
  const { form } = draftFromApplication(application, modalities);
  return {
    ...form, publication_status: 'published', verification_status: 'verified', title: 'Breath Alchemist', philosophy: 'Care begins with listening, and we go at the pace of the person in front of us.',
    safety_information: 'Please check with a doctor before breathwork if you are pregnant or have a heart condition.', suits: 'People who feel stressed',
    session_steps: 'Arrive | We settle in', pricing_from: '90', pricing_sessions: 'First session | 60 min | $90 | A gentle start', ...over,
  };
};

test('a verified profile cannot go public with a qualification still marked to confirm', () => {
  const r = validateAlchemist(publishable({ modalities: 'breathwork: formal' }), null, ctx);
  assert.ok(r.errors.qualifications, 'unchecked qualifications block publishing');
  const checked = validateAlchemist(publishable({ modalities: 'breathwork: formal', qualifications: 'Certificate in Breathwork Facilitation\nFirst Aid certificate (2024)' }), null, ctx);
  assert.deepEqual(checked.errors, {});
});

test('a verified profile cannot go public while a price or every practice is still unconfirmed', () => {
  const price = validateAlchemist(publishable({ modalities: 'breathwork: study', qualifications: '', pricing_sessions: 'First session | 60 min | $90 | A gentle start (confirm)' }), null, ctx);
  assert.ok(price.errors.pricing_sessions);
  const practices = validateAlchemist(publishable({ qualifications: '' }), null, ctx);
  assert.ok(practices.errors.modalities, 'all-confirm practices are not enough for a verified profile');
});

test('private application notes are dropped when the profile goes live and kept while it is a draft', () => {
  const { form, source } = draftFromApplication(application, modalities);
  const draft = validateAlchemist(form, { ...validateAlchemist(form, null, ctx).record, source }, ctx).record;
  assert.deepEqual(draft.source, source, 'kept through a draft save');
  const live = validateAlchemist(publishable({ modalities: 'breathwork: study', qualifications: '' }), draft, ctx);
  assert.deepEqual(live.errors, {});
  assert.equal('source' in live.record, false);
});

test('the founder and example profiles are unaffected by the new rules', () => {
  for (const a of alchemists) assert.deepEqual(validateAlchemist(alchemistToForm(a), a, ctx).errors, {}, a.name);
});
