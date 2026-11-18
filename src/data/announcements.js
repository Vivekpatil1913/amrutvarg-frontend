// Ordering and expiry rules for the announcements shown in the home-page strip
// and on the /announcements page.
//
// Announcements are managed only in the CMS (Admin → Announcements) and loaded
// by useAnnouncements. Nothing is bundled with the site: when the CMS has none,
// the strip hides itself and the page says there are no announcements.
//
// Entry shape (see fromCms in useAnnouncements.js):
//   id      unique, stable name
//   title   { mr, en }   heading, in both languages
//   desc    { mr, en }   one or two sentences, in both languages
//   date    'YYYY-MM-DD' publication date, shown under the heading
//   status  'new' | 'comingSoon'  small badge beside the heading
//   link    { href, label: { mr, en } }  a page or PDF; opens in a new tab.
//   until   'YYYY-MM-DD' last day to show it; it disappears automatically after.
//   pinned  true  keeps an important notice at the top, whatever its date.

// Today as 'YYYY-MM-DD' in the visitor's time zone.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Entries still current (no `until`, or `until` is today or later), most
// important first: pinned, then newest date, then undated in list order.
export function activeAnnouncements(list = [], on = today()) {
  const rank = (a) => (a.pinned ? 0 : a.date ? 1 : 2);
  return list
    .filter((a) => a && a.id && a.title && (!a.until || a.until >= on))
    .map((a, i) => ({ a, i }))
    .sort((x, y) => rank(x.a) - rank(y.a) || (y.a.date || '').localeCompare(x.a.date || '') || x.i - y.i)
    .map(({ a }) => a);
}
