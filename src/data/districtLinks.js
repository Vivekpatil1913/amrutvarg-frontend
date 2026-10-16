// Shareable links for one district's contacts: /district-directory/<slug>.
//
// Built the same way as vargLinks.js — the English name, lowercased and
// hyphenated — so the two kinds of link read alike and neither needs a lookup
// table maintained by hand.
//
// Three district names changed recently, and translations.en.districts records
// both forms as "Ahilyanagar (Ahmednagar)". The slug uses the current name, and
// the former one is kept as an alias that still resolves: a link shared before
// the rename must not break, and a contact record still filed under the old
// spelling must still be found.

import { DISTRICTS } from './districts.js';
import { translations } from '../i18n/translations.js';

const slugify = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// "Ahilyanagar (Ahmednagar)" -> ["Ahilyanagar", "Ahmednagar"]
const nameForms = (english) => {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(english || '');
  return match ? [match[1], match[2]] : [english || ''];
};

/** The slug for a district's Marathi name, or "" when it is not a known district. */
export function districtSlug(marathiName) {
  const english = translations.en.districts[marathiName];
  if (!english) return '';
  return slugify(nameForms(english)[0]);
}

/** The path to that district's contacts, or the unfiltered directory. */
export function districtPath(marathiName) {
  const slug = districtSlug(marathiName);
  return slug ? `/district-directory/${slug}` : '/district-directory';
}

// Every slug that should resolve — the current name and any former one —
// mapped to the canonical Marathi name. Built once from the district list.
const BY_SLUG = (() => {
  const map = new Map();
  for (const marathi of DISTRICTS) {
    const english = translations.en.districts[marathi];
    if (!english) continue;
    for (const form of nameForms(english)) {
      const slug = slugify(form);
      // The current name wins where a former name of one district collides
      // with the current name of another.
      if (slug && !map.has(slug)) map.set(slug, marathi);
    }
  }
  return map;
})();

/**
 * The Marathi district name a slug refers to, or null when it refers to none.
 * Null is the signal to say so rather than quietly showing another district.
 */
export function districtFromSlug(slug) {
  if (!slug) return null;
  return BY_SLUG.get(slugify(String(slug))) ?? null;
}

/** Every resolvable slug, for tests and for sanity-checking coverage. */
export const DISTRICT_SLUGS = BY_SLUG;
