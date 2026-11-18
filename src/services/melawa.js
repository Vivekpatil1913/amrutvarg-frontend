// Amrut Varg Melawa announcements for the home-page strip, the Amrut Varg page
// and the schedule page.
//
// Always fetched fresh — nothing is kept between page loads or navigations —
// so a melawa added, switched on or switched off in the CMS shows on the very
// next load, exactly like announcements. The server answers with no-store too.
// The only sharing is of a request already on its way, when two components
// ask at the same moment.

const CMS_API = import.meta.env.VITE_CMS_API;

// Earlier builds kept the list in sessionStorage for two minutes; drop any
// copy a visitor's browser still holds so it can never be read again.
try {
  sessionStorage.removeItem('amrut_melawa_active');
} catch {
  /* storage unavailable — nothing to clear */
}

let inFlight = null;

export function fetchActiveMelawas() {
  if (!CMS_API) return Promise.resolve([]);
  if (inFlight) return inFlight;
  inFlight = fetch(`${CMS_API}/melawa/active`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ data }) => (Array.isArray(data) ? data : []))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

const DEVANAGARI = '०१२३४५६७८९';
const toDeva = (s) => String(s).replace(/[0-9]/g, (d) => DEVANAGARI[d]);

// "10:00:00" -> "सकाळी १०:००" / "10:00 AM". Marathi names the part of the day,
// as the programme's own notices do ("सकाळी १०:०० ते दुपारी ०४:००").
export function formatClock(value, lang, dayParts) {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  if (lang !== 'mr' || !dayParts) return `${hh}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  const part = h < 12 ? dayParts.morning : h < 17 ? dayParts.afternoon : h < 20 ? dayParts.evening : dayParts.night;
  return `${part} ${toDeva(String(hh).padStart(2, '0'))}:${toDeva(mm)}`;
}

export function formatTiming(row, lang, t) {
  return `${formatClock(row.start_time, lang, t.dayParts)} ${t.to} ${formatClock(row.end_time, lang, t.dayParts)}`;
}

export const pickLang = (row, field, lang) => (lang === 'en' && row[`${field}_en`]) || row[`${field}_mr`] || row[`${field}_en`] || '';

// Highlights are typed one per line; leading bullets are tidied away.
export const highlightLines = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
