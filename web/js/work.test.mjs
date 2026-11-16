// node --test web/js/work.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { TASKS, wordCount, createProgress } from './work.js';

test('counts words, not punctuation or spacing', () => {
  assert.equal(wordCount('  We are aligned.  We have never been more aligned. '), 9);
  assert.equal(wordCount("Q4 doesn't matter - 2026!"), 4);
  assert.equal(wordCount(''), 0);
});

test('each task is counted once, unknown ids are ignored', () => {
  const p = createProgress();
  assert.equal(p.mark('reply'), true);
  assert.equal(p.mark('reply'), false);
  assert.equal(p.mark('nope'), false);
  assert.equal(p.count, 1);
});

test('three cleared notifications finish the clear task', () => {
  const p = createProgress();
  assert.equal(p.cleared(), false);
  assert.equal(p.cleared(), false);
  assert.equal(p.cleared(), true);
  assert.equal(p.done.has('clear'), true);
});

test('reset starts a fresh run', () => {
  const p = createProgress();
  for (const t of TASKS) p.mark(t.id);
  assert.equal(p.count, TASKS.length);
  p.reset();
  assert.equal(p.count, 0);
});
