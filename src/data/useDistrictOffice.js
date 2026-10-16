import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// The published office for one district, keyed by the district master id.
//
// Returns { office, status }:
//   'idle'    — no CMS configured, or no district chosen
//   'loading' — the request is in flight
//   'ready'   — `office` holds the record
//   'none'    — the district has no published office (a 404, which is normal)
//   'error'   — the request failed for some other reason
//
// "No office" is reported separately from "could not ask", because the two
// mean different things to a reader: most districts simply have no office
// recorded, and that is not a fault worth showing an error for. Only a real
// failure gets one.
export function useDistrictOffice(districtId) {
  const [state, setState] = useState({ office: null, status: 'idle' });

  useEffect(() => {
    if (!CMS_API || !districtId) {
      setState({ office: null, status: 'idle' });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ office: null, status: 'loading' });

    fetch(`${CMS_API}/public/offices/${districtId}`, { signal: ctrl.signal })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) return Promise.reject(new Error(`HTTP ${r.status}`));
        return r.json();
      })
      .then((body) => {
        if (ctrl.signal.aborted) return;
        if (!body?.data) setState({ office: null, status: 'none' });
        else setState({ office: body.data, status: 'ready' });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ office: null, status: 'error' });
      });

    return () => ctrl.abort();
  }, [districtId]);

  return state;
}
