// District contact links: /district-directory/<slug>.
// Run with: npm test
//
// What matters here is that a slug resolves to the RIGHT district or to
// nothing at all. Resolving to the wrong one would send a visitor to another
// district's contacts, which is worse than showing them the full list.

import test from 'node:test';
import assert from 'node:assert/strict';
import { districtSlug, districtPath, districtFromSlug, DISTRICT_SLUGS } from './districtLinks.js';
import { DISTRICTS } from './districts.js';

test('every one of the 36 districts has a slug', () => {
  assert.equal(DISTRICTS.length, 36);
  for (const d of DISTRICTS) {
    assert.ok(districtSlug(d), `no slug for ${d}`);
  }
});

test('a slug round-trips back to the same district', () => {
  for (const d of DISTRICTS) {
    assert.equal(districtFromSlug(districtSlug(d)), d, d);
  }
});

test('no two districts share a slug', () => {
  const slugs = DISTRICTS.map(districtSlug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('slugs are plain lowercase ASCII, safe in a URL', () => {
  for (const d of DISTRICTS) {
    assert.match(districtSlug(d), /^[a-z0-9]+(-[a-z0-9]+)*$/, `${d} -> ${districtSlug(d)}`);
  }
});

test('the slug uses the current name, not the parenthesised former one', () => {
  assert.equal(districtSlug('अहिल्यानगर'), 'ahilyanagar');
  assert.equal(districtSlug('धाराशिव'), 'dharashiv');
  assert.equal(districtSlug('छत्रपती संभाजीनगर'), 'chhatrapati-sambhajinagar');
});

test('a link shared under a former name still resolves', () => {
  assert.equal(districtFromSlug('ahmednagar'), 'अहिल्यानगर');
  assert.equal(districtFromSlug('osmanabad'), 'धाराशिव');
  assert.equal(districtFromSlug('aurangabad'), 'छत्रपती संभाजीनगर');
});

test('an unknown slug resolves to nothing rather than to a wrong district', () => {
  for (const bad of ['', null, undefined, 'nowhere', 'pun', 'puneee', '../../etc', '%2e%2e', 'ahilyanaga']) {
    assert.equal(districtFromSlug(bad), null, String(bad));
  }
});

test('resolution is tolerant of case and stray punctuation', () => {
  assert.equal(districtFromSlug('PUNE'), 'पुणे');
  assert.equal(districtFromSlug('Chhatrapati_Sambhajinagar'), 'छत्रपती संभाजीनगर');
  assert.equal(districtFromSlug('-pune-'), 'पुणे');
});

test('a path is built for a known district and falls back for an unknown one', () => {
  assert.equal(districtPath('पुणे'), '/district-directory/pune');
  // Not a district: the link still goes somewhere useful rather than nowhere.
  assert.equal(districtPath('कुठेतरी'), '/district-directory');
  assert.equal(districtPath(''), '/district-directory');
  assert.equal(districtPath(undefined), '/district-directory');
});

test('former-name aliases do not shadow a current district name', () => {
  // Every current district must still resolve to itself, even though three
  // former names were added to the same map.
  for (const d of DISTRICTS) {
    assert.equal(DISTRICT_SLUGS.get(districtSlug(d)), d, d);
  }
});
