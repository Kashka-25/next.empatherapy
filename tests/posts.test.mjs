import test from 'node:test';
import assert from 'node:assert/strict';
import { claimChecks, parseBody, parseSources, sourcesToText, validatePost, postToForm, publicPosts, postsBy, postsAbout, atomFeed, escapeXml, readingMinutes, LICENSE, KIND_LABEL, POST_KINDS } from '../lib/posts.mjs';
import { modalities } from '../data/modalities.mjs';

const para = 'Breathing slowly, with a longer breath out than in, is a gentle way many people settle themselves. '.repeat(5);
const good = { title: 'A gentle way to begin with breath', kind: 'practice', summary: 'A short, kind introduction to slow breathing, written from my own sessions with people new to the practice.', body: para, modality_slugs: ['breathwork'], sources: '', license_ok: 'on' };
const ctx = (over = {}) => ({ posts: [], modalities, status: 'submitted', profileId: 'alch-sam', now: new Date('2026-11-13T00:00:00Z'), ...over });

/* ---------- what may not be promised ---------- */
test('claims: promises of results and advice to skip medical care are blocked, softer words are only flagged', () => {
  for (const bad of ['This is guaranteed to work', 'A miracle for anxiety', 'You can stop taking your medication', 'Use this instead of seeing a doctor', 'There is no need for a doctor', 'It heals your cancer', 'This cures depression']) assert.ok(claimChecks(bad).block.length, bad);
  assert.deepEqual(claimChecks('There is no cure for grief, and breathwork does not claim to be one.').block, [], 'saying there is no cure is not a claim');
  assert.ok(claimChecks('There is no cure for grief.').warn.length, 'but the word is flagged for a human to read');
  assert.deepEqual(claimChecks('Many people find slow breathing calming.'), { block: [], warn: [] });
  assert.ok(claimChecks('Some say it is proven by science').warn.length);
});

/* ---------- reading the body ---------- */
test('body: paragraphs, headings and lists, and nothing else is interpreted', () => {
  const blocks = parseBody('## Getting started\nFind a quiet place.\n\nSit comfortably.\nBreathe in.\n\n- First\n- Second\n\n<script>alert(1)</script> and **bold**');
  assert.deepEqual(blocks.map((b) => b.type), ['h', 'p', 'p', 'ul', 'p']);
  assert.equal(blocks[0].text, 'Getting started');
  assert.equal(blocks[1].text, 'Find a quiet place.');
  assert.equal(blocks[2].text, 'Sit comfortably. Breathe in.');
  assert.deepEqual(blocks[3].items, ['First', 'Second']);
  assert.ok(blocks[4].text.includes('**bold**') && blocks[4].text.includes('<script>'), 'markup stays as plain text, for React to escape');
  assert.deepEqual(parseBody(''), []);
  assert.equal(parseBody('a\r\n\r\nb').length, 2);
});

test('sources: only https links, with or without a title, and a sensible limit', () => {
  const ok = parseSources('A good study | https://example.org/study\nhttps://example.com/page');
  assert.deepEqual(ok.sources.map((s) => [s.title, s.url]), [['A good study', 'https://example.org/study'], ['example.com', 'https://example.com/page']]);
  assert.ok(parseSources('Not safe | http://example.org').error, 'plain http is refused');
  assert.ok(parseSources('javascript:alert(1)').error);
  assert.ok(parseSources('no link here').error);
  assert.ok(parseSources(Array.from({ length: 10 }, (_, i) => `https://example.org/${i}`).join('\n')).error);
  assert.equal(sourcesToText(ok.sources), 'A good study | https://example.org/study\nexample.com | https://example.com/page');
  assert.deepEqual(parseSources('').sources, []);
});

/* ---------- checking a post ---------- */
test('a draft needs little; a post to submit needs everything', () => {
  const draft = validatePost({ title: 'Thoughts', kind: 'perspective' }, ctx({ status: 'draft' }));
  assert.equal(draft.valid, true);
  assert.equal(draft.record.status, 'draft');
  assert.equal(draft.record.slug, 'thoughts');
  assert.equal(draft.record.profile_id, 'alch-sam');
  assert.equal(validatePost({ title: '', kind: 'perspective' }, ctx({ status: 'draft' })).valid, false, 'even a draft needs a title');
  const full = validatePost({ title: 'Short', kind: '', summary: 'x', body: 'y' }, ctx());
  assert.deepEqual(Object.keys(full.errors).sort(), ['body', 'kind', 'license_ok', 'summary', 'title']);
  assert.equal(validatePost(good, ctx()).valid, true);
});

test('a post must say what kind of knowledge it is, and research needs a source', () => {
  assert.ok(validatePost({ ...good, kind: 'gospel' }, ctx()).errors.kind);
  assert.deepEqual(POST_KINDS.map((k) => KIND_LABEL[k]).length, 5);
  assert.ok(validatePost({ ...good, kind: 'research', sources: '' }, ctx()).errors.sources);
  assert.equal(validatePost({ ...good, kind: 'research', sources: 'A study | https://example.org/s' }, ctx()).valid, true);
  assert.ok(validatePost({ ...good, sources: 'http://not-secure.example' }, ctx()).errors.sources);
});

test('promises and advice to skip care stop a post from being submitted, with a kind explanation', () => {
  const r = validatePost({ ...good, body: `${para} This is a miracle cure, guaranteed.` }, ctx());
  assert.equal(r.valid, false);
  assert.match(r.errors.body, /cannot publish that/);
  assert.match(r.errors.body, /speak with their doctor/);
  assert.equal(validatePost({ ...good, body: `${para} Stop taking your medication and just breathe.` }, ctx()).valid, false);
  const soft = validatePost({ ...good, body: `${para} There is no cure for grief.` }, ctx());
  assert.equal(soft.valid, true, 'softer words pass, but are reported to the reviewer');
  assert.ok(soft.warnings.length);
});

test('the licence: the author confirms the writing is theirs to share, once', () => {
  assert.ok(validatePost({ ...good, license_ok: '' }, ctx()).errors.license_ok);
  const first = validatePost(good, ctx());
  assert.equal(first.record.license, LICENSE.id);
  assert.equal(first.record.license_confirmed_at, '2026-11-13T00:00:00.000Z');
  const again = validatePost({ ...good, license_ok: '' }, ctx({ existing: first.record, posts: [first.record] }));
  assert.equal(again.valid, true, 'already confirmed, so editing does not ask again');
  assert.equal(again.record.license_confirmed_at, first.record.license_confirmed_at);
  assert.equal(LICENSE.id, 'CC BY 4.0');
  assert.match(LICENSE.url, /creativecommons\.org\/licenses\/by\/4\.0/);
});

test('slugs are unique and stay put, text is cleaned, and at most three modalities are tagged', () => {
  const one = validatePost(good, ctx()).record;
  const two = validatePost(good, ctx({ posts: [{ ...one, id: 'p1' }] })).record;
  assert.equal(one.slug, 'a-gentle-way-to-begin-with-breath');
  assert.equal(two.slug, 'a-gentle-way-to-begin-with-breath-2');
  const edited = validatePost({ ...good, title: 'A completely different title now' }, ctx({ existing: { ...one, id: 'p1' }, posts: [{ ...one, id: 'p1' }] })).record;
  assert.equal(edited.slug, one.slug, 'the address does not change when the title does');
  const dirty = validatePost({ ...good, title: '<b>Bold title</b> here', body: `${para}<script>x</script>` }, ctx()).record;
  assert.ok(!dirty.title.includes('<') && !dirty.body.includes('<'));
  const tags = validatePost({ ...good, modality_slugs: ['breathwork', 'breathwork', 'not-real', 'sound-healing', 'expressive-arts', 'meditation-mindfulness'] }, ctx()).record.modality_slugs;
  assert.deepEqual(tags, ['breathwork', 'sound-healing', 'expressive-arts']);
});

test('status rules: publishing stamps a date once, anything else clears it, and a decline note goes away on resubmit', () => {
  const pub = validatePost(good, ctx({ status: 'published' })).record;
  assert.equal(pub.published_at, '2026-11-13T00:00:00.000Z');
  const later = validatePost(good, ctx({ status: 'published', existing: pub, now: new Date('2026-12-01T00:00:00Z') })).record;
  assert.equal(later.published_at, pub.published_at, 'the original date is kept');
  assert.equal('published_at' in validatePost(good, ctx({ status: 'draft', existing: pub })).record, false, 'unpublishing clears it');
  const rejected = { ...pub, status: 'rejected', review_note: 'Please soften this.' };
  assert.equal('review_note' in validatePost(good, ctx({ status: 'submitted', existing: rejected })).record, false);
  assert.equal(validatePost(good, ctx({ status: 'rejected', existing: rejected })).record.review_note, 'Please soften this.');
});

test('the form round trip keeps what was written', () => {
  const r = validatePost({ ...good, kind: 'research', sources: 'A study | https://example.org/s' }, ctx()).record;
  const form = postToForm(r);
  assert.equal(form.title, r.title); assert.equal(form.sources, 'A study | https://example.org/s'); assert.equal(form.license_ok, true);
  assert.deepEqual(form.modality_slugs, ['breathwork']);
  assert.equal(readingMinutes(para), 1);
});

/* ---------- what the public sees ---------- */
const author = (over = {}) => ({ id: 'alch-sam', name: 'Sam Example', slug: 'sam-example', demo: false, publication_status: 'published', verification_status: 'verified', ...over });
const post = (over = {}) => ({ id: 'p1', slug: 'one', title: 'One', profile_id: 'alch-sam', status: 'published', published_at: '2026-11-01T00:00:00Z', modality_slugs: ['breathwork'], kind: 'practice', summary: 'S', ...over });

test('only published posts by public, real authors are shown, newest first, with the author attached', () => {
  const posts = [post(), post({ id: 'p2', slug: 'two', published_at: '2026-11-05T00:00:00Z' }), post({ id: 'p3', slug: 'draft', status: 'draft' }), post({ id: 'p4', slug: 'wait', status: 'submitted' }), post({ id: 'p5', slug: 'other', profile_id: 'alch-hidden' }), post({ id: 'p6', slug: 'fiction', profile_id: 'alch-mira' })];
  const alchemists = [author(), author({ id: 'alch-hidden', publication_status: 'draft' }), author({ id: 'alch-mira', demo: true, verification_status: 'demo' })];
  const shown = publicPosts(posts, alchemists);
  assert.deepEqual(shown.map((p) => p.slug), ['two', 'one']);
  assert.equal(shown[0].author.name, 'Sam Example');
  assert.deepEqual(publicPosts(posts, [author({ publication_status: 'draft' })]), [], 'when the author is hidden, so are their posts');
  assert.deepEqual(publicPosts(posts, [author({ verification_status: 'pending' })]), []);
  assert.deepEqual(postsBy(shown, 'alch-sam').length, 2);
  assert.equal(postsAbout(shown, 'breathwork').length, 2);
  assert.equal(postsAbout(shown, 'reiki-energy-work').length, 0);
});

/* ---------- the open feed ---------- */
test('the feed is valid-looking Atom, escapes everything, credits the author and states the licence', () => {
  const list = publicPosts([post({ title: 'Tea & <breath>', summary: 'It\'s "gentle"', updated_at: '2026-11-06T00:00:00Z' })], [author({ name: 'Sam <Example>' })]);
  const xml = atomFeed(list, 'https://empatherapy.co', new Date('2026-11-13T00:00:00Z'));
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
  assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom">'));
  assert.ok(xml.includes('Tea &amp; &lt;breath&gt;'));
  assert.ok(xml.includes('Sam &lt;Example&gt;'));
  assert.ok(!xml.includes('<breath>') && !xml.includes('<Example>'), 'nothing unescaped from the content');
  assert.ok(xml.includes('https://empatherapy.co/knowledge/one'));
  assert.ok(xml.includes('Creative Commons Attribution 4.0'));
  assert.ok(xml.includes('Credit Sam &lt;Example&gt;'));
  assert.equal((xml.match(/<entry>/g) || []).length, 1);
  assert.ok(atomFeed([], 'https://x.test').includes('<feed'), 'an empty feed is still a feed');
  assert.equal(escapeXml(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
});

test('the feed lists at most thirty posts', () => {
  const many = Array.from({ length: 40 }, (_, i) => post({ id: `p${i}`, slug: `s${i}`, published_at: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z` }));
  const xml = atomFeed(publicPosts(many, [author()]), 'https://empatherapy.co');
  assert.equal((xml.match(/<entry>/g) || []).length, 30);
});
