// GET /api/stories — server-side paging of the success stories.
//
//   ?page=1&pageSize=8&category=<key>&q=<search>&lang=mr|en
//   → 200 { items: [story summary…], total, page, pageSize, totalPages }
//
// Filtering, search and paging happen here, so the browser downloads one page
// of card summaries at a time. Served by the Vite dev and preview servers (see
// vite.config.js); a production host must serve the same route (or proxy it
// to the backend) — see VITE_STORIES_API in .env.example.

import { paginateStories } from '../src/data/storyPaging.js';

export const STORIES_ROUTE = '/api/stories';

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

// Connect-style middleware: (req, res, next).
export function storiesMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== STORIES_ROUTE) return next();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { message: 'Method not allowed' }, { Allow: 'GET, HEAD' });
  }
  try {
    const q = url.searchParams;
    const body = paginateStories({
      page: q.get('page'),
      pageSize: q.get('pageSize'),
      category: q.get('category'),
      q: q.get('q'),
      lang: q.get('lang'),
    });
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
