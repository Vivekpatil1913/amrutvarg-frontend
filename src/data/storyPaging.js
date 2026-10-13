// Filtering, search and paging of the success stories — the logic behind
// GET /api/stories (server/storiesApi.js). Plain JavaScript with no browser or
// Vite APIs, so the server, the browser fallback and `node --test` share it.

import { FEATURED_SLUGS, STORY_CATEGORIES, stories } from './yashogathaStories.js';
import { translations } from '../i18n/translations.js';

// Stories published in the listing. For now only these three are listed; the
// rest stay in yashogathaStories.js, unpublished. Set to null to list every
// story — paging then works as before (pagination appears above 8 stories).
export const LISTED_SLUGS = FEATURED_SLUGS;

export const listedStories = LISTED_SLUGS ? stories.filter((s) => LISTED_SLUGS.includes(s.slug)) : stories;

export const DEFAULT_PAGE_SIZE = 8;
export const MAX_PAGE_SIZE = 50;
export const MAX_QUERY_LENGTH = 100;

// Lower-cased, so search ignores case in English; Devanagari is unaffected.
const norm = (s) => (s || '').toLocaleLowerCase();

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

// Only what a story card needs; the full story is read on its own page.
export const storySummary = (s) => ({
  slug: s.slug,
  category: s.category,
  image: s.image || null,
  en: { title: s.en.title, short: s.en.short },
  mr: { title: s.mr.title, short: s.mr.short },
});

// Unknown or out-of-range values fall back to safe defaults instead of failing.
export function storyQuery({ page, pageSize, category, q, lang } = {}) {
  return {
    page: Math.max(1, toInt(page, 1)),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(pageSize, DEFAULT_PAGE_SIZE))),
    category: STORY_CATEGORIES[category] ? category : '',
    q: String(q || '').trim().slice(0, MAX_QUERY_LENGTH),
    lang: lang === 'en' ? 'en' : 'mr',
  };
}

// Filters and searches first, then pages, so `total` counts every match.
// A page past the end returns the last page.
export function paginateStories(params) {
  const { page, pageSize, category, q, lang } = storyQuery(params);
  const labels = translations[lang].yashogatha.categories;
  const query = norm(q);
  const matches = listedStories.filter((s) => {
    if (category && s.category !== category) return false;
    if (!query) return true;
    const text = s[lang];
    return [text.title, text.short, labels[s.category]].some((v) => norm(v).includes(query));
  });

  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: matches.slice(start, start + pageSize).map(storySummary),
    total,
    page: current,
    pageSize,
    totalPages,
  };
}
