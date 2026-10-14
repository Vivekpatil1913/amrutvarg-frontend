import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published "कार्यरत अमृत वर्ग" configuration from the CMS.
//
// Returns null while loading and whenever the CMS cannot be reached, which is
// the signal to render the bundled wording instead — an outage never blanks the
// section. Only published content is exposed by this endpoint; drafts stay in
// the admin.
export function useVargsSection() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    fetch(`${CMS_API}/public/vargs-section`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (data && data.text) setConfig(data);
      })
      .catch(() => {
        // Keeps the bundled wording on screen; visitors see no error.
      });

    return () => ctrl.abort();
  }, []);

  return config;
}

// Substitutes a phrase's placeholders: fill('{count} आढळले', { count: '२३' }).
// An unknown token is left alone — the admin rejects those on save, so one here
// means the config predates a rule and should still read sensibly.
export const fill = (template, values) =>
  String(template ?? '').replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
