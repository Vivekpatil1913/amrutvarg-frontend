import { useEffect, useState } from 'react';

const CMS_API = import.meta.env.VITE_CMS_API;

// Geographical masters for the site's dropdowns.
//
// One request per master per page load, shared by every form that needs it, so
// opening three modals does not fetch the district list three times. Returns []
// while loading and whenever the API cannot be reached, which is the signal for
// callers to fall back to their bundled list.

const cache = new Map();   // key -> rows
const inFlight = new Map();
const listeners = new Map(); // key -> Set<fn>

function keyOf(master, parentId) {
  return parentId ? `${master}:${parentId}` : master;
}

function load(master, parentColumn, parentId) {
  const key = keyOf(master, parentId);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inFlight.has(key)) return inFlight.get(key);
  if (!CMS_API) return Promise.resolve([]);

  const qs = parentId ? `?${parentColumn}=${parentId}` : '';
  const req = fetch(`${CMS_API}/public/masters/${master}${qs}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ data }) => {
      const rows = Array.isArray(data) ? data : [];
      cache.set(key, rows);
      listeners.get(key)?.forEach((fn) => fn(rows));
      return rows;
    })
    .catch(() => [])
    .finally(() => inFlight.delete(key));

  inFlight.set(key, req);
  return req;
}

// `parentId` makes this a dependent dropdown: pass the selected parent's id and
// only its children come back. Pass null for a top-level list.
export function useMaster(master, parentColumn = null, parentId = null) {
  const key = keyOf(master, parentId);
  const [rows, setRows] = useState(() => cache.get(key) ?? []);

  useEffect(() => {
    // A dependent list has nothing to show until its parent is chosen.
    if (parentColumn && !parentId) { setRows([]); return undefined; }

    let alive = true;
    const onLoad = (data) => { if (alive) setRows(data); };
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(onLoad);

    load(master, parentColumn, parentId).then(onLoad);

    return () => { alive = false; listeners.get(key)?.delete(onLoad); };
  }, [key, master, parentColumn, parentId]);

  return rows;
}

// Resolves a stored name — current or former — to its master row, so a record
// written before a rename still selects the right option.
export function findByName(rows, name) {
  if (!name) return null;
  const needle = String(name).trim().toLowerCase();
  return (
    rows.find((r) => r.name_mr?.toLowerCase() === needle) ||
    rows.find((r) => r.name_en?.toLowerCase() === needle) ||
    rows.find((r) => (r.former_names || []).some((f) => f.toLowerCase() === needle)) ||
    null
  );
}
