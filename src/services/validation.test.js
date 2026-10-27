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
test('suggestion/complaint form: RFC 5322 email, letters-only names, file rules', async () => {
  const v = await import('./validation.js');
  assert.equal(v.isRfcEmail('first.last+tag@sub.example.org'), true);
  assert.equal(v.isRfcEmail('a@b..co'), false);
  assert.equal(v.isRfcEmail('a b@c.co'), false);
  assert.equal(v.isPersonName('राम पाटील'), true);
  assert.equal(v.isPersonName('R. K. Patil'), true);
  assert.equal(v.isPersonName('Ram 2'), false);
  const errors = { photoType: 'type', photoSize: 'size', videoType: 'vtype', videoSize: 'vsize' };
  assert.equal(v.checkGrievancePhoto({ type: 'image/png', name: 'a.png', size: 1024 }, errors), null);
  assert.equal(v.checkGrievancePhoto({ type: 'image/gif', name: 'a.gif', size: 1024 }, errors), 'type');
  assert.equal(v.checkGrievancePhoto({ type: 'image/jpeg', name: 'a.jpg', size: 4 * 1024 * 1024 }, errors), 'size');
  assert.equal(v.checkGrievanceVideo({ type: 'video/quicktime', name: 'clip.MOV', size: 1024 }, errors), null);
  assert.equal(v.checkGrievanceVideo({ type: 'video/x-msvideo', name: 'clip.avi', size: 1024 }, errors), 'vtype');
  assert.equal(v.checkGrievanceVideo({ type: 'video/mp4', name: 'clip.mp4', size: 21 * 1024 * 1024 }, errors), 'vsize');
});
