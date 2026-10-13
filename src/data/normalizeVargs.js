// Turns a response from the AMRUT VARG service's GET /api/amrut-vargs/active
// into the record shape the site uses (the same shape as src/data/vargs.js).
//
// Only fields the service publishes are kept; nothing is filled in. Records
// that are not APPROVED (drafts, pending or rejected requests) are dropped, so
// unpublished vargs never reach the public site even if the service returns them.
// Plain JavaScript with no imports, so it also runs under `node --test`.

const TEXT_FIELDS = ['vibhag', 'district', 'taluka', 'schoolName', 'vargName', 'coordinatorName'];

export const PUBLISHED_STATUS = 'APPROVED';

export class VargsFormatError extends Error {}

// The service returns a bare array; a { data: [...] } or { content: [...] }
// wrapper (common Spring/REST envelopes) is accepted as well.
function listOf(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  if (body && Array.isArray(body.content)) return body.content;
  throw new VargsFormatError('Unexpected response: expected a list of Amrut Vargs');
}

export function normalizeVargs(body) {
  const seen = new Set();
  return listOf(body).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const id = Number(raw.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return [];
    if (raw.status !== PUBLISHED_STATUS) return [];
    seen.add(id);

    const varg = { id };
    TEXT_FIELDS.forEach((key) => {
      varg[key] = typeof raw[key] === 'string' ? raw[key].trim() : '';
    });
    // Kept as published, never shown as a count unless it is a real number.
    const count = Number(raw.enrollmentCount);
    varg.enrollmentCount = raw.enrollmentCount !== null && Number.isInteger(count) && count >= 0 ? count : null;
    varg.status = PUBLISHED_STATUS;
    return [varg];
  });
}
