import { createContext, useContext, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { LIVE_CONTENT } from '../services/config';
import { fetchActiveVargs } from '../services/content';
import { vargs as snapshot, VARGS_SNAPSHOT_DATE } from './vargs';

// The active Amrut Varg list, shared by every page.
//
// The bundled snapshot is shown first, so the site never waits on the network
// or goes blank. With VITE_ENABLE_LIVE_CONTENT=true the latest published list
// is then read from the AMRUT VARG service and replaces it; if that fails the
// snapshot stays, labelled with its own date.
//
//   vargs   — approved records only
//   asOf    — ISO date the list reflects
//   status  — 'snapshot' (live reading off) | 'loading' | 'live' | 'error'

const VargsContext = createContext(null);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function VargsProvider({ children }) {
  const [state, setState] = useState({
    vargs: snapshot,
    asOf: VARGS_SNAPSHOT_DATE,
    status: LIVE_CONTENT ? 'loading' : 'snapshot',
  });

  useEffect(() => {
    if (!LIVE_CONTENT) return undefined;
    const ctrl = new AbortController();
    fetchActiveVargs(ctrl.signal)
      .then((list) => setState({ vargs: list, asOf: today(), status: 'live' }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState((s) => ({ ...s, status: 'error' }));
      });
    return () => ctrl.abort();
  }, []);

  return <VargsContext.Provider value={state}>{children}</VargsContext.Provider>;
}

export function useVargs() {
  const ctx = useContext(VargsContext);
  if (!ctx) throw new Error('useVargs must be used inside VargsProvider');
  return ctx;
}

// "This list reflects … as of <date>", or the loading / fallback wording.
export function useVargsSourceNote() {
  const { asOf, status } = useVargs();
  const { t, formatDate } = useLanguage();
  const date = formatDate(asOf);
  if (status === 'loading') return t.vargs.sourceLoading(date);
  if (status === 'error') return t.vargs.sourceError(date);
  return t.vargs.source(date);
}
