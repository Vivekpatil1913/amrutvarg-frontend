// Paged success stories for the Yashogatha page, requested one page at a time
// from GET /api/stories (server/storiesApi.js), which filters, searches and
// pages on the server:
//
//   fetchStoryPage({ page, pageSize, category, q, lang })
//   → { items, total, page, pageSize, totalPages, source: 'server' | 'local' }
//
// If no stories endpoint is reachable (e.g. the site is deployed as static
// files only), the same paging runs in the browser so the page keeps working;
// `source` says which one answered.

import { STORIES_API } from './config';
import { DEFAULT_PAGE_SIZE, paginateStories } from '../data/storyPaging.js';

export const STORIES_PAGE_SIZE = DEFAULT_PAGE_SIZE;

const TIMEOUT_MS = 8000;

const isPage = (b) =>
  b &&
  Array.isArray(b.items) &&
  [b.total, b.page, b.pageSize, b.totalPages].every(Number.isInteger) &&
  b.items.every((s) => s && typeof s.slug === 'string' && s.en && s.mr);

async function fromServer(params, signal) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) query.set(k, String(v));
  });

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${STORIES_API}?${query}`, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null); // a static host may answer with index.html
    return isPage(body) ? body : null;
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function fetchStoryPage({ page = 1, pageSize = STORIES_PAGE_SIZE, category = '', q = '', lang }, signal) {
  const params = { page, pageSize, category, q: q.trim(), lang };
  const body = await fromServer(params, signal);
  if (body) return { ...body, source: 'server' };
  return { ...paginateStories(params), source: 'local' };
}
