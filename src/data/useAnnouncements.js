import { useEffect, useState } from 'react';
import { activeAnnouncements, announcements as staticAnnouncements } from './announcements';

const CMS_API = import.meta.env.VITE_CMS_API;

// The CMS stores one flat row per announcement, with the two languages in
// separate columns. Reshape it into the form the strip and the page render —
// the same one src/data/announcements.js produces.
export const fromCms = (row) => ({
  id: `cms-${row.id}`,
  title: { mr: row.title_mr || '', en: row.title_en || '' },
  desc: { mr: row.desc_mr || '', en: row.desc_en || '' },
  date: row.date || undefined,
  until: row.until_date || undefined,
  status: row.status,
  pinned: Boolean(row.pinned),
  link: row.link
    ? { href: row.link, label: { mr: row.link_label || '', en: row.link_label || '' } }
    : undefined,
  // Event details for an AMRUT training. All optional — a plain notice
  // carries none of them and renders exactly as it did before.
  event: {
    time: row.event_time || '',
    venue: row.venue || '',
    district: row.district || '',
    taluka: row.taluka || '',
    notes: { mr: row.notes_mr || '', en: row.notes_en || '' },
  },
});

// True when a notice carries anything worth showing as an event block. The
// date alone does not count: an ordinary circular has one too.
export const hasEventDetails = (item) =>
  Boolean(item.event && (item.event.time || item.event.venue || item.event.district
    || item.event.taluka || item.event.notes?.mr || item.event.notes?.en));

// Published announcements, already filtered to the current ones and sorted
// the way both the strip and the page show them.
//
// Extracted from the strip so the two cannot drift: the page must list exactly
// what the strip rotates through, or "view all" would be a lie. Falls back to
// the bundled list while loading and whenever the CMS cannot be reached, so an
// outage never empties the bar.
export function useAnnouncements() {
  const [raw, setRaw] = useState(staticAnnouncements);

  useEffect(() => {
    if (!CMS_API) return undefined;
    const ctrl = new AbortController();

    fetch(`${CMS_API}/public/announcements`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(({ data }) => {
        if (Array.isArray(data) && data.length) setRaw(data.map(fromCms));
      })
      .catch(() => {
        // Keeps the bundled list on screen; visitors see no error.
      });

    return () => ctrl.abort();
  }, []);

  return activeAnnouncements(raw);
}
