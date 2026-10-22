import { useCallback, useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published videos, reels and podcast episodes from the CMS.
//
// Only published rows are exposed by these endpoints — a draft is excluded by
// the query itself, not filtered out afterwards — so nothing an administrator
// has not released can reach this hook in the first place.
//
// Unlike the homepage sections there is no bundled fallback: there is no
// shipped video content to fall back to. An outage therefore has to be visible
// rather than silent, so the hook reports its state and the page says what
// happened instead of showing an empty shelf as though nothing were published.
//
//   status — 'idle' | 'loading' | 'ready' | 'error'

function useCmsList(path, { limit = 24, category = '' } = {}) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState(CMS_API ? 'loading' : 'idle');
  const [reloads, setReloads] = useState(0);

  const retry = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    if (!CMS_API) {
      setStatus('idle');
      return undefined;
    }
    const ctrl = new AbortController();
    setStatus('loading');

    const qs = new URLSearchParams({ limit: String(limit) });
    if (category) qs.set('category', category);

    fetch(`${CMS_API}${path}?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (ctrl.signal.aborted) return;
        setItems(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('error');
      });

    return () => ctrl.abort();
  }, [path, limit, category, reloads]);

  return { items, status, retry };
}

export const useVideos = (options) => useCmsList('/public/videos', options);
export const usePodcasts = (options) => useCmsList('/public/podcasts', options);
