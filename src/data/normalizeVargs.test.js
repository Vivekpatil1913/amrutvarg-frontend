// Run with `npm test` (Node's built-in test runner; no extra dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVargs, VargsFormatError } from './normalizeVargs.js';
import { vargs as snapshot } from './vargs.js';

const record = (over = {}) => ({
  id: 7,
  vibhag: 'पुणे',
  district: 'सातारा',
  taluka: '',
  schoolName: ' शाळा ',
  vargName: '',
  coordinatorName: '',
  enrollmentCount: 0,
  status: 'APPROVED',
  ...over,
});

test('keeps the published fields of approved records, trimmed', () => {
  assert.deepEqual(normalizeVargs([record()]), [
    {
      id: 7,
      vibhag: 'पुणे',
      district: 'सातारा',
      taluka: '',
      schoolName: 'शाळा',
      vargName: '',
      coordinatorName: '',
      enrollmentCount: 0,
      status: 'APPROVED',
    },
  ]);
});

test('drops records that are not approved, so drafts stay hidden', () => {
  const list = normalizeVargs([
    record({ id: 1, status: 'PENDING' }),
    record({ id: 2, status: 'REJECTED' }),
    record({ id: 3, status: undefined }),
    record({ id: 4 }),
  ]);
  assert.deepEqual(
    list.map((v) => v.id),
    [4],
  );
});

test('drops records without a valid id, and duplicates', () => {
  const list = normalizeVargs([record({ id: 'x' }), record({ id: -1 }), null, 'text', record({ id: 5 }), record({ id: 5 })]);
  assert.deepEqual(
    list.map((v) => v.id),
    [5],
  );
});

test('never invents values: missing text is empty, unknown counts are null', () => {
  const [v] = normalizeVargs([{ id: 9, status: 'APPROVED', enrollmentCount: 'many', extra: 'ignored' }]);
  assert.equal(v.district, '');
  assert.equal(v.schoolName, '');
  assert.equal(v.enrollmentCount, null);
  assert.equal('extra' in v, false);
  assert.equal(normalizeVargs([record({ enrollmentCount: null })])[0].enrollmentCount, null);
});

test('accepts a bare array or a { data } / { content } wrapper', () => {
  assert.equal(normalizeVargs({ data: [record()] }).length, 1);
  assert.equal(normalizeVargs({ content: [record()] }).length, 1);
  assert.deepEqual(normalizeVargs([]), []);
});

test('rejects responses that are not a list', () => {
  assert.throws(() => normalizeVargs({ message: 'error' }), VargsFormatError);
  assert.throws(() => normalizeVargs(null), VargsFormatError);
});

test('the bundled snapshot passes through unchanged', () => {
  assert.deepEqual(normalizeVargs(snapshot), snapshot);
});
