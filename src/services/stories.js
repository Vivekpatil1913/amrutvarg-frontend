// Paged success stories for the Yashogatha page, requested one page at a time.
//
//   fetchStoryPage({ page, pageSize, category, q, lang })
//   → { items, total, page, pageSize, totalPages, source: 'cms' | 'server' | 'local' }
//
// Three sources are tried in order:
//
//   cms    — GET {CMS_API}/public/stories, the stories an editor manages in the
//            admin. This is the real source.
//   server — GET /api/stories (server/storiesApi.js), the bundled snapshot the
//            dev server pages, kept for deployments without a CMS.
//   local  — the same paging run in the browser over yashogathaStories.js, so
//            the page still works as static files with nothing reachable.
//
// `source` says which one answered.

import { STORIES_API, CMS_API } from './config';
import { DEFAULT_PAGE_SIZE, paginateStories } from '../data/storyPaging.js';
import { storyPageFromCms } from '../data/storyFromCms.js';

export const STORIES_PAGE_SIZE = DEFAULT_PAGE_SIZE;

const TIMEOUT_MS = 8000;

const isPage = (b) =>
  b &&
  Array.isArray(b.items) &&
  [b.total, b.page, b.pageSize, b.totalPages].every(Number.isInteger) &&
  b.items.every((s) => s && typeof s.slug === 'string' && s.en && s.mr);

// One fetch with a timeout, abortable by the caller. Returns null on anything
// that is not a usable answer, which is the signal to try the next source.
async function getJson(url, signal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null); // a static host may answer with index.html
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const queryOf = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) query.set(k, String(v));
  });
  return query;
};

// The CMS names two of these differently — `limit` for the page size and
// `search` for the query — and answers with a {data, meta} envelope.
async function fromCms({ page, pageSize, category, q }, signal) {
  if (!CMS_API) return null;
  const query = queryOf({ page, limit: pageSize, category, search: q });
  const body = await getJson(`${CMS_API}/public/stories?${query}`, signal);
  const converted = storyPageFromCms(body);
  return converted && isPage(converted) ? converted : null;
}

async function fromServer(params, signal) {
  const body = await getJson(`${STORIES_API}?${queryOf(params)}`, signal);
  return isPage(body) ? body : null;
}

export async function fetchStoryPage(
  { page = 1, pageSize = STORIES_PAGE_SIZE, category = '', q = '', lang },
  signal,
) {
  const params = { page, pageSize, category, q: q.trim(), lang };

  const cms = await fromCms(params, signal);
  if (cms) return { ...cms, source: 'cms' };

  const body = await fromServer(params, signal);
  if (body) return { ...body, source: 'server' };

  return { ...paginateStories(params), source: 'local' };
}

// One story by slug, for the detail page. Same order of sources; the caller
// falls back to the bundled story when this returns null.
export async function fetchStory(slug, signal) {
  if (CMS_API) {
    const body = await getJson(`${CMS_API}/public/stories/${encodeURIComponent(slug)}`, signal);
    const converted = body?.data
      ? storyPageFromCms({ data: [body.data], meta: { total: 1, page: 1, pageSize: 1, totalPages: 1 } })
      : null;
    if (converted?.items?.[0]) return converted.items[0];
  }

  const legacy = await getJson(`${STORIES_API}/${encodeURIComponent(slug)}`, signal);
  if (legacy && legacy.slug && legacy.mr && legacy.en) return legacy;

  return null;
}

// The featured stories for the home page strip, newest first. Returns null when
// nothing is reachable, which is the signal to show the bundled three.
export async function fetchFeaturedStories(count, signal) {
  if (!CMS_API) return null;
  const query = queryOf({ featured: 'true', limit: count });
  const body = await getJson(`${CMS_API}/public/stories?${query}`, signal);
  const converted = storyPageFromCms(body);
  return converted?.items?.length ? converted.items : null;
}
