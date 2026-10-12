import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, translations } from './translations';

// Same storage key as the live portal, so a visitor's choice carries over.
const STORAGE_KEY = 'amrut_lang';
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

const readStoredLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' || saved === 'mr' ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);
  const [switching, setSwitching] = useState(false);

  const setLang = useCallback(
    (next) => {
      if (next === lang) return;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable — keep the choice for this visit only */
      }
      // Brief cross-fade so the script change does not snap.
      setSwitching(true);
      window.setTimeout(() => {
        setLangState(next);
        window.setTimeout(() => setSwitching(false), 40);
      }, 140);
    },
    [lang],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translations[lang].meta.title;
  }, [lang]);

  const value = useMemo(() => {
    const t = translations[lang];
    const locale = lang === 'mr' ? 'mr-IN' : 'en-IN';
    const num = (n) =>
      lang === 'mr' ? String(n).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[d]) : String(n);
    return {
      lang,
      setLang,
      switching,
      t,
      num,
      district: (name) => (name && t.districts[name]) || name,
      division: (name) => (name && t.divisions[name]) || name,
      formatDate: (iso) =>
        new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
    };
  }, [lang, setLang, switching]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
