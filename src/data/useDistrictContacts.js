import { useEffect, useState } from 'react';
import { districtContacts as staticContacts } from './districtContacts';

const CMS_API = import.meta.env.VITE_CMS_API;

// Published district contacts, in the shape the directory page reads.
//
// The CMS stores a contact the way the spreadsheet does — one `role` string and
// the division split into `division_mr` / `division_en`. The page groups on
// `division` and renders `roles` as a list, because a person can hold more than
// one role in the bundled data. Handing the raw rows straight to the page left
// both fields undefined, so every card silently failed its division test and
// the page rendered none; normalising here is what keeps the two shapes apart.
function normalise(row) {
  return {
    id: String(row.id),
    division: row.division_mr ?? row.division ?? '',
    roles: Array.isArray(row.roles) ? row.roles : [row.role].filter(Boolean),
    districts: Array.isArray(row.districts) ? row.districts : [],
    name: row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
  };
}

// Falls back to the bundled list while loading and whenever the CMS cannot be
// reached, so an outage never empties the directory.
export function useDistrictContacts() {
  const [contacts, setContacts] = useState(staticContacts);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    fetch(`${CMS_API}/public/contacts`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (Array.isArray(data) && data.length) setContacts(data.map(normalise));
      })
      .catch(() => {
        // Keeps the bundled list on screen; visitors see no error.
      });

    return () => ctrl.abort();
  }, []);

  return contacts;
}
