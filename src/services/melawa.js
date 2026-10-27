// Amrut Varg Melawa announcements for the flashing ticker and the schedule page.
//
// The ticker sits on every page, so the list is kept for a couple of minutes in
// sessionStorage as well as in memory: moving between pages does not refetch
// it, and the server's own Cache-Control covers the rest. Storage can be
// unavailable (private mode, blocked site data) — then it is memory only.

const CMS_API = import.meta.env.VITE_CMS_API;
const KEY = 'amrut_melawa_active';
const TTL_MS = 2 * 60 * 1000;

let memory = null;
let inFlight = null;

function readStored() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.rows) && parsed.expires > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function store(rows) {
  memory = { rows, expires: Date.now() + TTL_MS };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* storage unavailable — memory copy only */
  }
}

// Already-cached rows, for a first render with no flash of empty ticker.
export function cachedMelawas() {
  if (memory && memory.expires > Date.now()) return memory.rows;
  const stored = readStored();
  if (stored) memory = stored;
  return stored?.rows ?? null;
}

export function fetchActiveMelawas() {
  const cached = cachedMelawas();
  if (cached) return Promise.resolve(cached);
  if (!CMS_API) return Promise.resolve([]);
  if (inFlight) return inFlight;
  inFlight = fetch(`${CMS_API}/melawa/active`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ data }) => {
      const rows = Array.isArray(data) ? data : [];
      store(rows);
      return rows;
    })
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
