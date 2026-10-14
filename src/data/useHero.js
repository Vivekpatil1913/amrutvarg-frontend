import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published hero configuration from the CMS.
//
//   config — the published hero, or null while loading and whenever the CMS
//            cannot be reached. Null means "render the built-in content", so a
//            CMS outage never blanks the top of the home page.
//
// Only published content is exposed by this endpoint; drafts stay in the admin.
export function useHero() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    fetch(`${CMS_API}/public/hero`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (data && data.text) setConfig(data);
      })
      .catch(() => {
        // Keeps the hardcoded content on screen; visitors see no error.
      });

    return () => ctrl.abort();
  }, []);

  return config;
}

// Reads the field for the active language, falling back to Marathi when an
// English value was left blank in the admin rather than showing nothing.
export const pick = (obj, base, lang) => {
  if (!obj) return '';
  return obj[`${base}_${lang}`] || obj[`${base}_mr`] || obj[`${base}_en`] || '';
};
