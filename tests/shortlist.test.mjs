import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShortlist, serialiseShortlist, toggleSlug, keepKnown, MAX_SHORTLIST, SHORTLIST_KEY } from '../lib/shortlist.mjs';

test('anything unexpected in storage becomes an empty list, never an error', () => {
  for (const raw of [null, undefined, '', 'not json', '{"a":1}', '42', '"text"', 'null']) assert.deepEqual(parseShortlist(raw), []);
});

test('only plain profile addresses survive, once each, in the saved order', () => {
  const raw = JSON.stringify(['sam-example', 'sam-example', '<script>', 'Bad Slug', 42, null, '../admin', 'jo-example', '']);
  assert.deepEqual(parseShortlist(raw), ['sam-example', 'jo-example']);
});

test('the list holds at most twelve', () => {
  const many = Array.from({ length: 30 }, (_, i) => `a-${i}`);
  assert.equal(MAX_SHORTLIST, 12);
  assert.equal(parseShortlist(JSON.stringify(many)).length, 12);
});

test('saving and removing', () => {
  let r = toggleSlug([], 'sam-example');
  assert.deepEqual([r.list, r.saved], [['sam-example'], true]);
  r = toggleSlug(r.list, 'jo-example');
  assert.deepEqual(r.list, ['sam-example', 'jo-example']);
  r = toggleSlug(r.list, 'sam-example');
  assert.deepEqual([r.list, r.saved], [['jo-example'], false], 'toggling a saved one removes it');
});

test('a full shortlist says so and does not drop anything', () => {
  const full = Array.from({ length: MAX_SHORTLIST }, (_, i) => `a-${i}`);
  const r = toggleSlug(full, 'new-one');
  assert.equal(r.reason, 'full');
  assert.deepEqual(r.list, full);
  assert.equal(toggleSlug(full, 'a-3').list.length, MAX_SHORTLIST - 1, 'but removing is always allowed');
});

test('a bad address is refused', () => {
  assert.equal(toggleSlug(['a'], '<b>').reason, 'bad');
  assert.equal(toggleSlug(['a'], 12).reason, 'bad');
  assert.deepEqual(toggleSlug(['a'], '').list, ['a']);
});

test('profiles that no longer exist drop out, order kept', () => {
  assert.deepEqual(keepKnown(['c', 'a', 'gone', 'b'], ['a', 'b', 'c']), ['c', 'a', 'b']);
  assert.deepEqual(keepKnown(['a'], []), []);
});

test('what is written back is clean, and the key is namespaced', () => {
  assert.equal(serialiseShortlist(['a', 'a', '<x>', 'b']), '["a","b"]');
  assert.match(SHORTLIST_KEY, /^empatherapy:/);
});
