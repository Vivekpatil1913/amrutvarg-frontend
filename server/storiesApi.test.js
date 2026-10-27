// Run with `npm test` (Node's built-in test runner; no extra dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { storiesMiddleware } from './storiesApi.js';
import { DEFAULT_PAGE_SIZE, LISTED_SLUGS, MAX_PAGE_SIZE, listedStories as stories, paginateStories } from '../src/data/storyPaging.js';
import { FEATURED_SLUGS } from '../src/data/yashogathaStories.js';

// Calls the middleware the way the Vite server does and returns the response.
function request(url, method = 'GET') {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 0,
      setHeader: (k, v) => {
        headers[k.toLowerCase()] = v;
      },
      end: (body) => resolve({ status: res.statusCode, headers, body: body ? JSON.parse(body) : null }),
    };
    storiesMiddleware({ url, method }, res, () => resolve({ status: 'next' }));
  });
}

test('for now only the three featured stories are listed', () => {
  assert.deepEqual(LISTED_SLUGS, FEATURED_SLUGS);
  assert.deepEqual(stories.map((s) => s.slug), FEATURED_SLUGS);
  const res = paginateStories({});
  assert.deepEqual([res.total, res.items.length, res.totalPages], [3, 3, 1]);
});

test('pages split the listed stories with no repeats or gaps (smaller page size)', () => {
  const first = paginateStories({ page: 1, pageSize: 2 });
  assert.equal(first.totalPages, Math.ceil(stories.length / 2));
  const slugs = [];
  for (let p = 1; p <= first.totalPages; p += 1) slugs.push(...paginateStories({ page: p, pageSize: 2 }).items.map((s) => s.slug));
  assert.deepEqual(slugs, stories.map((s) => s.slug));
});

test('pages of 8 by default; every story appears exactly once', () => {
  const first = paginateStories({ page: 1 });
  assert.equal(DEFAULT_PAGE_SIZE, 8);
  assert.equal(first.pageSize, 8);
  assert.equal(first.items.length, Math.min(8, stories.length));
  assert.equal(first.total, stories.length);
  assert.equal(first.totalPages, Math.ceil(stories.length / 8));

  const slugs = [];
  for (let p = 1; p <= first.totalPages; p += 1) slugs.push(...paginateStories({ page: p }).items.map((s) => s.slug));
  assert.equal(slugs.length, stories.length);
  assert.equal(new Set(slugs).size, stories.length);
});

test('out-of-range and invalid parameters fall back safely', () => {
  const { totalPages } = paginateStories({});
  assert.equal(paginateStories({ page: 999 }).page, totalPages);
  assert.equal(paginateStories({ page: 0 }).page, 1);
  assert.equal(paginateStories({ page: 'x' }).page, 1);
  assert.equal(paginateStories({ pageSize: 5000 }).pageSize, MAX_PAGE_SIZE);
  assert.equal(paginateStories({ pageSize: -3 }).pageSize, 1);
  assert.equal(paginateStories({ category: 'nope' }).total, stories.length);
});

test('filters and searches before paging, in either language', () => {
  const cat = stories[0].category;
  const res = paginateStories({ category: cat });
  assert.equal(res.total, stories.filter((s) => s.category === cat).length);
  assert.ok(res.items.every((s) => s.category === cat));

  assert.ok(paginateStories({ q: stories[0].en.title.toUpperCase(), lang: 'en' }).items.some((s) => s.slug === stories[0].slug));
  assert.ok(paginateStories({ q: stories[0].mr.title, lang: 'mr' }).items.some((s) => s.slug === stories[0].slug));

  const none = paginateStories({ q: 'no-such-story-zzz' });
  assert.deepEqual([none.total, none.items.length, none.page, none.totalPages], [0, 0, 1, 1]);
});

test('items are card summaries, not full stories', () => {
  const [item] = paginateStories({}).items;
  assert.deepEqual(Object.keys(item).sort(), ['category', 'en', 'image', 'mr', 'slug']);
  assert.deepEqual(Object.keys(item.en).sort(), ['short', 'title']);
});

// The endpoint serves the local CMS stories (data/admin/stories.json) when any
// are published, and the bundled list only as a fallback, so the expected
// total depends on which source is present.
test('GET /api/stories answers with one page as JSON', async () => {
  const cmsFile = fileURLToPath(new URL('../data/admin/stories.json', import.meta.url));
  const cms = existsSync(cmsFile)
    ? JSON.parse(readFileSync(cmsFile, 'utf8')).filter((s) => !s.deleted_at && s.published)
    : [];
  const res = await request('/api/stories?page=1&pageSize=8&lang=en');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.equal(res.body.page, 1);
  if (cms.length) {
    assert.equal(res.body.total, cms.length);
    assert.equal(res.body.items.length, Math.min(8, cms.length));
  } else {
    assert.equal(res.body.total, stories.length);
    assert.deepEqual(res.body, paginateStories({ page: 1, pageSize: 8, lang: 'en' }));
  }
});

test('other routes pass through; other methods are refused', async () => {
  assert.equal((await request('/api/other')).status, 'next');
  assert.equal((await request('/yashogatha?p=2')).status, 'next');
  const post = await request('/api/stories', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});
