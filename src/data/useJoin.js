import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published "अमृत वर्गात सहभागी व्हा" configuration from the CMS.
//
// Returns null while loading and whenever the CMS cannot be reached, which is
// the signal to render the bundled content instead — an outage never blanks the
// section. Only published content is exposed by this endpoint; drafts stay in
// the admin.
export function useJoin() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    fetch(`${CMS_API}/public/join`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (data && data.text && data.cards?.length) setConfig(data);
      })
      .catch(() => {
        // Keeps the bundled content on screen; visitors see no error.
      });

    return () => ctrl.abort();
  }, []);

  return config;
}
