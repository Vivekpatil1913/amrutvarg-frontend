// Announcements shown in the strip at the top of the home page.
//
// HOW TO ADD ONE: copy an entry below and paste it into the list (any order).
// They are shown pinned first, then newest `date` first, then undated ones in
// list order. The strip on the home page shows the first two; "View all"
// opens every announcement in a dialog. The strip hides itself when nothing is
// left to show.
//
// Fields (only id, title and desc are required):
//   id      unique, stable name, e.g. 'varg-registration-2026'
//   title   { mr, en }   heading, in both languages
//   desc    { mr, en }   one or two sentences, in both languages
//   date    'YYYY-MM-DD' publication date, shown under the heading
//   status  'new' | 'comingSoon'  small badge beside the heading
//   link    { href, label: { mr, en } }  a page or PDF; opens in a new tab.
//           For a PDF kept with the site, put it in public/docs/ and use
//           href: '/docs/<file>.pdf'. `label` is optional ("View details").
//   until   'YYYY-MM-DD' last day to show it; it disappears automatically after.
//   pinned  true  keeps an important notice at the top, whatever its date.
//
// Example:
//   {
//     id: 'summer-batch-2026',
//     date: '2026-10-15',
//     status: 'new',
//     title: { mr: 'नवीन तुकडी सुरू', en: 'New batch starts' },
//     desc: { mr: '…', en: '…' },
//     link: { href: '/docs/summer-batch.pdf', label: { mr: 'परिपत्रक पहा', en: 'View circular' } },
//     until: '2026-11-30',
//   },

export const announcements = [
  // TEMPORARY TEST ENTRY — only to check the 5-second rotation. Delete this
  // whole object before going live.
  {
    id: 'test-dummy',
    date: '2026-10-13',
    status: 'new',
    title: {
      mr: 'चाचणी घोषणा (तात्पुरती)',
      en: 'Test announcement (temporary)',
    },
    desc: {
      mr: 'ही केवळ घोषणा-पट्टीची चाचणी करण्यासाठी तात्पुरती घोषणा आहे. दर ५ सेकंदांनी पुढील घोषणा दिसते.',
      en: 'This is a temporary announcement used only to test the announcement bar. The next announcement appears every 5 seconds.',
    },
  },
  {
    id: 'guidelines',
    status: 'comingSoon',
    title: {
      mr: 'मार्गदर्शक सूचना व परिपत्रके',
      en: 'Guidelines & Circulars',
    },
    desc: {
      mr: 'अमृत वर्गाच्या अधिकृत मार्गदर्शक सूचना किंवा PDF परिपत्रके अद्याप या संकेतस्थळावर प्रकाशित झालेली नाहीत. ती उपलब्ध झाल्यावर येथे दिली जातील.',
      en: 'Official Amrut Varg guidelines or PDF circulars have not yet been published on this website. They will be listed here once available.',
    },
  },
];

// Today as 'YYYY-MM-DD' in the visitor's time zone.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Entries still current (no `until`, or `until` is today or later), most
// important first: pinned, then newest date, then undated in list order.
export function activeAnnouncements(list = announcements, on = today()) {
  const rank = (a) => (a.pinned ? 0 : a.date ? 1 : 2);
  return list
    .filter((a) => a && a.id && a.title && (!a.until || a.until >= on))
    .map((a, i) => ({ a, i }))
    .sort((x, y) => rank(x.a) - rank(y.a) || (y.a.date || '').localeCompare(x.a.date || '') || x.i - y.i)
    .map(({ a }) => a);
}
