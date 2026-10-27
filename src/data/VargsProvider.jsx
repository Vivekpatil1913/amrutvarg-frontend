import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { LIVE_CONTENT } from '../services/config';
import { fetchActiveVargs } from '../services/content';
import { vargs as snapshot, VARGS_SNAPSHOT_DATE } from './vargs';

// The active Amrut Varg list, shared by every page.
//
//   vargs   — approved records only
//   asOf    — ISO date the list reflects
//   status  — 'snapshot' | 'loading' | 'live' | 'error'
//
// Data priority: CMS local API → external portal (LIVE_CONTENT) → static snapshot.

const VargsContext = createContext(null);
const CMS_API = import.meta.env.VITE_CMS_API;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// The CMS keeps the two languages in separate columns; the site reads one
// `vibhag`/`district` per record, as src/data/vargs.js and normalizeVargs both
// produce. Without this the division count came out as zero, because every
// record carried `vibhag_mr` and nothing read it.
export const fromCms = (row) => ({
  id: row.id,
  vibhag: row.vibhag_mr || row.vibhag_en || '',
  vibhagEn: row.vibhag_en || '',
  district: row.district_mr || row.district_en || '',
  districtEn: row.district_en || '',
  taluka: row.taluka || '',
  village: row.village || '',
  schoolName: row.school_name || '',
  vargName: row.varg_name || '',
  coordinatorName: row.coordinator_name || '',
  enrollmentCount: Number.isInteger(row.enrollment_count) ? row.enrollment_count : null,
  // Optional school introduction video or website. Absent on most records,
  // and empty rather than null so the details panel can just test for truth.
  resourceUrl: row.resource_url || '',
  status: 'APPROVED',
});

export function VargsProvider({ children }) {
  const [state, setState] = useState({
    vargs: snapshot,
    asOf: VARGS_SNAPSHOT_DATE,
    status: 'loading',
  });

  // Bumped to re-read the list, e.g. right after an organiser's registration
  // has published a new varg, so its deep link resolves without a reload.
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();

    // 1. Try the local CMS API first
    fetch(`${CMS_API}/public/vargs`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(({ data }) => {
        if (Array.isArray(data) && data.length) {
          setState({ vargs: data.map(fromCms), asOf: today(), status: 'live' });
          return;
        }
        throw new Error('empty');
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        // 2. Fall back to external portal if enabled
        if (LIVE_CONTENT) {
          fetchActiveVargs(ctrl.signal)
            .then(list => setState({ vargs: list, asOf: today(), status: 'live' }))
            .catch(() => {
              if (!ctrl.signal.aborted) setState(s => ({ ...s, status: 'error' }));
            });
        } else {
          setState(s => ({ ...s, status: 'snapshot' }));
        }
      });

    return () => ctrl.abort();
  }, [version]);

  return <VargsContext.Provider value={{ ...state, refresh }}>{children}</VargsContext.Provider>;
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
