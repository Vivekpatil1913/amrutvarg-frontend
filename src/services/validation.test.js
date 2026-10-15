import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPhoto, isDate, isMobile, isPhone, isPin, PHOTO_MAX_BYTES } from './validation.js';

test('date validation rejects impossible calendar dates', () => {
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(isDate('2026-02-29'), false);
  assert.equal(isDate('2026-04-31'), false);
  assert.equal(isDate('2026-13-01'), false);
});

test('phone validators reject punctuation-only values', () => {
  assert.equal(isPhone('020-25551234'), true);
  assert.equal(isPhone('++++++++'), false);
  assert.equal(isMobile('9876543210'), true);
  assert.equal(isMobile('1234567890'), false);
});

test('PIN validator enforces six digits without a leading zero', () => {
  assert.equal(isPin('411001'), true);
  assert.equal(isPin('041001'), false);
});

test('photo validator enforces type and size', () => {
  const errors = { photoType: 'type', photoTooLarge: 'size' };
  assert.equal(checkPhoto({ type: 'image/jpeg', size: PHOTO_MAX_BYTES }, errors), null);
  assert.equal(checkPhoto({ type: 'image/gif', size: 12 }, errors), 'type');
  assert.equal(checkPhoto({ type: 'image/png', size: PHOTO_MAX_BYTES + 1 }, errors), 'size');
});