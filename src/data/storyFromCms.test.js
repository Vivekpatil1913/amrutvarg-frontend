// Converting a CMS story row into the shape the story components read.
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { storyFromCms, storyPageFromCms } from './storyFromCms.js';

const row = () => ({
  id: 1,
  slug: 'discovering-my-own-voice',
  category: 'confidence',
  title_mr: 'माझा स्वर शोधताना',
  title_en: 'Discovering My Own Voice',
  short_mr: 'एक अबोल विद्यार्थी बोलू लागतो.',
  short_en: 'A quiet student learns to speak.',
  image_key: 'varg1',
  image_url: '',
  featured: true,
  content: {
    mr: { intro: 'परिचय', challenge: 'आव्हान', journey: 'पहिला टप्पा\n\nदुसरा टप्पा',
          change: 'बदल', lessons: 'धडा एक\n\nधडा दोन', conclusion: 'समारोप' },
    en: { intro: 'Intro', challenge: 'Challenge', journey: 'First step\n\nSecond step',
          change: 'Change', lessons: 'Lesson one\n\nLesson two', conclusion: 'Conclusion' },
  },
});

test('both languages come back with a title and a summary', () => {
  const s = storyFromCms(row());
  assert.equal(s.mr.title, 'माझा स्वर शोधताना');
  assert.equal(s.en.title, 'Discovering My Own Voice');
  assert.equal(s.en.short, 'A quiet student learns to speak.');
});

test('the cover keys are the ones StoryCover reads', () => {
  const s = storyFromCms({ ...row(), image_key: 'varg2', image_url: '/uploads/a.jpg' });
  assert.equal(s.image, 'varg2');
  assert.equal(s.image_url, '/uploads/a.jpg');
});

test('the parts StoryPage maps over are arrays', () => {
  const s = storyFromCms(row());
  for (const part of ['journey', 'change', 'lessons']) {
    assert.ok(Array.isArray(s.mr[part]), `mr.${part}`);
    assert.ok(Array.isArray(s.en[part]), `en.${part}`);
  }
  assert.deepEqual(s.en.journey, ['First step', 'Second step']);
  assert.deepEqual(s.mr.lessons, ['धडा एक', 'धडा दोन']);
});

test('the parts StoryPage renders as text are strings', () => {
  const s = storyFromCms(row());
  for (const part of ['intro', 'challenge', 'conclusion']) {
    assert.equal(typeof s.mr[part], 'string', `mr.${part}`);
    assert.equal(typeof s.en[part], 'string', `en.${part}`);
  }
});

test('an array already in the stored content passes through', () => {
  const r = row();
  r.content.en.journey = ['One', 'Two', 'Three'];
  assert.deepEqual(storyFromCms(r).en.journey, ['One', 'Two', 'Three']);
});

test('blank paragraphs are dropped rather than rendered empty', () => {
  const r = row();
  r.content.en.lessons = 'One\n\n\n\n   \n\nTwo';
  assert.deepEqual(storyFromCms(r).en.lessons, ['One', 'Two']);
});

test('a story written in one language only still reads in the other', () => {
  const r = row();
  r.title_en = '';
  r.short_en = '';
  r.content.en = {};
  const s = storyFromCms(r);
  assert.equal(s.en.title, 'माझा स्वर शोधताना', 'falls back to Marathi rather than blank');
  assert.equal(s.en.intro, 'परिचय');
  assert.deepEqual(s.en.lessons, ['धडा एक', 'धडा दोन']);
});

test('a story with no content at all still has every field', () => {
  const s = storyFromCms({ slug: 'x', title_mr: 'क', category: 'personality' });
  assert.equal(s.en.challenge, '');
  assert.deepEqual(s.mr.journey, []);
  assert.equal(s.category, 'personality');
});

test('a row without a slug is rejected', () => {
  assert.equal(storyFromCms({ title_mr: 'क' }), null);
  assert.equal(storyFromCms(null), null);
});

// ── The page envelope ───────────────────────────────────────────────────────

test('a {data, meta} envelope becomes the {items, total, …} page shape', () => {
  const page = storyPageFromCms({
    data: [row()],
    meta: { total: 3, page: 1, pageSize: 8, totalPages: 1 },
  });
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 3);
  assert.equal(page.pageSize, 8);
  assert.equal(page.items[0].slug, 'discovering-my-own-voice');
});

test('the converted page satisfies the service\'s own validity check', () => {
  const page = storyPageFromCms({ data: [row()], meta: { total: 1, page: 1, pageSize: 8, totalPages: 1 } });
  const isPage = (b) =>
    b && Array.isArray(b.items) &&
    [b.total, b.page, b.pageSize, b.totalPages].every(Number.isInteger) &&
    b.items.every((s) => s && typeof s.slug === 'string' && s.en && s.mr);
  assert.equal(isPage(page), true);
});

test('a malformed envelope is rejected so the next source is tried', () => {
  assert.equal(storyPageFromCms(null), null);
  assert.equal(storyPageFromCms({ data: [row()] }), null);
  assert.equal(storyPageFromCms({ data: 'nope', meta: { total: 1, page: 1, pageSize: 8, totalPages: 1 } }), null);
  assert.equal(storyPageFromCms({ data: [row()], meta: { total: '1', page: 1, pageSize: 8, totalPages: 1 } }), null);
});

test('an empty page is a valid answer, not a failure', () => {
  const page = storyPageFromCms({ data: [], meta: { total: 0, page: 1, pageSize: 8, totalPages: 1 } });
  assert.deepEqual(page.items, []);
  assert.equal(page.total, 0);
});
