import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published official links and social profiles from the CMS.
//
// One record serves both places the official links appear — the footer column
// and the contact desk's "अधिकृत माहिती" tab — so the two cannot drift apart.
//
// Returns null while loading and whenever the CMS cannot be reached, which is
// the signal to render the bundled content instead; an outage never blanks the
// footer. Social profiles have no bundled fallback, because the site has never
// shipped any — until the CMS answers, the row is simply absent.
export function useFooter() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    const load = () => fetch(`${CMS_API}/public/footer`, { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (data && Array.isArray(data.links)) setConfig(data);
      })
      .catch(() => {
        // Keeps the bundled content on screen; visitors see no error.
      });

    load();
    // Re-fetch when returning to an already-open site tab after publishing in
    // the admin panel. The server response is no-store, so this sees the latest
    // published footer instead of a cached copy.
    window.addEventListener('focus', load);

    return () => {
      window.removeEventListener('focus', load);
      ctrl.abort();
    };
  }, []);

  return config;
}
