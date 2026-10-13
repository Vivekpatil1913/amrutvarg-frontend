// Shareable links for individual Amrut Vargs: /vargs/<slug>.
// The slug reads as "<district>-<place>-<id>" (e.g. jalgaon-muktai-nagar-14).
// The trailing record id makes it unique and keeps old links working if a
// place name is later corrected; lookups use the id alone.
import { VARG_NAMES_EN } from './vargNamesEn';
import { translations } from '../i18n/translations';

const MAX_WORDS = 4;

const slugify = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

export function vargSlug(varg) {
  const district = slugify(translations.en.districts[varg.district]);
  // First named place only, so slugs stay short; list numbering ("1.") is dropped.
  const place = slugify((VARG_NAMES_EN[varg.id] || '').split(/[;,/]/)[0])
    .filter((w) => !/^\d+$/.test(w))
    .slice(0, MAX_WORDS);
  return [...district, ...place, String(varg.id)].join('-');
}

export const vargPath = (varg) => `/vargs/${vargSlug(varg)}`;

export function findVargBySlug(vargs, slug) {
  const id = Number((slug || '').match(/(\d+)$/)?.[1]);
  return Number.isInteger(id) ? vargs.find((v) => v.id === id) || null : null;
}
