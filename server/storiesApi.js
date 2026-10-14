// GET /api/stories — server-side paging of the success stories.
//   ?page=1&pageSize=8&category=<key>&q=<search>&lang=mr|en
//   → 200 { items: [story summary…], total, page, pageSize, totalPages }
//
// Reads from data/admin/stories.json (CMS) when available; falls back to the
// bundled static snapshot in src/data/yashogathaStories.js.

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { paginateStories } from '../src/data/storyPaging.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const CMS_STORIES_FILE = join(__dir, '..', 'data', 'admin', 'stories.json');

export const STORIES_ROUTE = '/api/stories';

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

// Convert a CMS story record to the static story card shape.
function cmsToCard(s) {
  return {
    slug:     s.slug,
    category: s.category,
    image:    s.image || null,
    en: { title: s.title_en || '', short: s.short_en || '' },
    mr: { title: s.title_mr || '', short: s.short_mr || '' },
  };
}

// Convert a CMS story record to the full static story shape (for detail page).
function cmsToFull(s) {
  const sec = (text) => typeof text === 'string' ? text.split('\n\n').filter(Boolean) : (text || []);
  return {
    slug:     s.slug,
    category: s.category,
    image:    s.image || undefined,
    en: {
      title:      s.title_en || '',
      short:      s.short_en || '',
      intro:      s.content?.en?.intro      || '',
      challenge:  s.content?.en?.challenge  || '',
      journey:    sec(s.content?.en?.journey),
      change:     sec(s.content?.en?.change),
      lessons:    sec(s.content?.en?.lessons),
      conclusion: s.content?.en?.conclusion || '',
    },
    mr: {
      title:      s.title_mr || '',
      short:      s.short_mr || '',
      intro:      s.content?.mr?.intro      || '',
      challenge:  s.content?.mr?.challenge  || '',
      journey:    sec(s.content?.mr?.journey),
      change:     sec(s.content?.mr?.change),
      lessons:    sec(s.content?.mr?.lessons),
      conclusion: s.content?.mr?.conclusion || '',
    },
  };
}

// Load published stories from the CMS DB; returns null if unavailable.
function loadCmsStories() {
  if (!existsSync(CMS_STORIES_FILE)) return null;
  try {
    const all = JSON.parse(readFileSync(CMS_STORIES_FILE, 'utf8'));
    const pub = all.filter(s => !s.deleted_at && s.published);
    return pub.length ? pub : null;
  } catch { return null; }
}

function paginateCms(records, q) {
  const toInt = (v, d) => { const n = parseInt(v, 10); return isFinite(n) ? n : d; };
  const page     = Math.max(1, toInt(q.get('page'), 1));
  const pageSize = Math.min(50, Math.max(1, toInt(q.get('pageSize'), 8)));
  const cat      = q.get('category') || '';
  const search   = (q.get('q') || '').trim().toLowerCase();
  const lang     = q.get('lang') === 'en' ? 'en' : 'mr';

  let matches = records;
  if (cat)    matches = matches.filter(s => s.category === cat);
  if (search) matches = matches.filter(s => {
    const t = s[`title_${lang}`] || '';
    const sh = s[`short_${lang}`] || '';
    return t.toLowerCase().includes(search) || sh.toLowerCase().includes(search);
  });

  const total      = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current    = Math.min(page, totalPages);
  const start      = (current - 1) * pageSize;

  return {
    items: matches.slice(start, start + pageSize).map(cmsToCard),
    total, page: current, pageSize, totalPages,
  };
}

// Connect-style middleware: (req, res, next).
export function storiesMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(STORIES_ROUTE)) return next();

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { message: 'Method not allowed' }, { Allow: 'GET, HEAD' });
  }

  // GET /api/stories/:slug — full story detail for StoryPage when served from CMS
  const slugMatch = url.pathname.match(/^\/api\/stories\/(.+)$/);
  if (slugMatch) {
    const cms = loadCmsStories();
    if (cms) {
      const story = cms.find(s => s.slug === slugMatch[1]);
      if (story) return send(res, 200, cmsToFull(story), { 'Cache-Control': 'no-store' });
    }
    return send(res, 404, { message: 'Story not found' });
  }

  try {
    const cms = loadCmsStories();
    const body = cms
      ? paginateCms(cms, url.searchParams)
      : paginateStories({ page: url.searchParams.get('page'), pageSize: url.searchParams.get('pageSize'), category: url.searchParams.get('category'), q: url.searchParams.get('q'), lang: url.searchParams.get('lang') });
    return send(res, 200, body, { 'Cache-Control': 'no-store' });
  } catch {
    return send(res, 500, { message: 'Could not load stories' });
  }
}

// Vite plugin: mounts the endpoint on `vite` (dev) and `vite preview`.
export function storiesApi() {
  return {
    name: 'amrut-stories-api',
    configureServer(server) {
      server.middlewares.use(storiesMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(storiesMiddleware);
    },
  };
}
