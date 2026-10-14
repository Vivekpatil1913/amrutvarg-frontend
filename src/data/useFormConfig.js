import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const CMS_API = import.meta.env.VITE_CMS_API;

// One request for every form's configuration, shared by all three form
// components and by both languages. Without this each modal would refetch on
// every open.
let cache = null;
let inFlight = null;
const listeners = new Set();

function load() {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  if (!CMS_API) return Promise.resolve(null);

  inFlight = fetch(`${CMS_API}/public/forms`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ data }) => {
      cache = data && typeof data === 'object' ? data : null;
      listeners.forEach((fn) => fn(cache));
      return cache;
    })
    .catch(() => null)          // the form keeps its built-in wording
    .finally(() => { inFlight = null; });

  return inFlight;
}

// Published presentation settings for one form.
//
// Returns resolved strings for the active language plus `isActive`. Every value
// is '' when the CMS has nothing set or cannot be reached, so each caller falls
// back to its own translation and no form ever loses its wording. Nothing here
// touches fields, validation or the submission payload.
export function useFormConfig(formKey) {
  const { lang } = useLanguage();
  const [config, setConfig] = useState(cache?.[formKey] ?? null);

  useEffect(() => {
    let alive = true;
    const onLoad = (data) => { if (alive) setConfig(data?.[formKey] ?? null); };
    listeners.add(onLoad);
    load().then(onLoad);
    return () => { alive = false; listeners.delete(onLoad); };
  }, [formKey]);

  const pick = (base) => config?.[`${base}_${lang}`] || config?.[`${base}_mr`] || '';

  return {
    title: pick('title'),
    intro: pick('intro'),
    submitLabel: pick('submit_label'),
    successTitle: pick('success_title'),
    successDesc: pick('success_desc'),
    closedMessage: pick('closed_message'),
    // Only an explicit false closes a form: while the config is loading or
    // unreachable the form stays open, exactly as it behaves today.
    isActive: config?.is_active !== false,
  };
}
