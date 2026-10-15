import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published District Directory page wording from the CMS.
//
// Returns null while loading and whenever the CMS cannot be reached, which is
// the signal to render the bundled content instead — an outage never blanks the
// page. Only published content is exposed by this endpoint; drafts stay in the
// admin.
export function useDirectory() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    fetch(`${CMS_API}/public/directory`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (data && data.text && data.roles?.length) setConfig(data);
      })
      .catch(() => {
        // Keeps the bundled content on screen; visitors see no error.
      });

    return () => ctrl.abort();
  }, []);

  return config;
}

// Fills {n} / {shown} / {total} / {name} into a CMS template. A placeholder the
// editor removed simply drops its value rather than printing "{n}" at a reader.
export const fill = (templateText, values) =>
  Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    templateText ?? ''
  );
