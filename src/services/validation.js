// Validation rules mirrored from the live AMRUT VARG portal forms.

export const isMobile = (v) => /^[6-9]\d{9}$/.test(v.trim());
export const isPhone = (v) => {
  const value = v.trim();
  const digits = value.match(/\d/g) || [];
  return /^[0-9+\-\s()]{6,20}$/.test(value) && digits.length >= 7 && digits.length <= 15;
};
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isPin = (v) => /^[1-9]\d{5}$/.test(v.trim());
export const isWholeNumber = (v) => /^\d+$/.test(String(v).trim());
export const isDate = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [year, month, day] = v.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export const isPastDate = (v) => new Date(`${v}T00:00:00`) < new Date(new Date().toDateString());

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export function checkPhoto(file, errors) {
  if (!PHOTO_TYPES.includes(file.type)) return errors.photoType;
  if (file.size > PHOTO_MAX_BYTES) return errors.photoTooLarge;
  return null;
}

// ── Suggestion / complaint form ─────────────────────────────────────────────
// Mirrors the CMS's grievances.schema.js so the browser and the server agree.

// RFC 5322 addr-spec: dot-atom or quoted local part; hostname or IP literal.
export const EMAIL_RFC5322 =
  /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
export const isRfcEmail = (v) => EMAIL_RFC5322.test(v.trim());

// Letters in any script (Devanagari included), words separated by spaces or
// initials' dots. Digits and symbols are rejected.
export const isPersonName = (v) => /^[\p{L}\p{M}]+(?:(?:\.\s*|\s+)[\p{L}\p{M}]+)*\.?$/u.test(v.trim());

export const GRIEVANCE_PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
export const GRIEVANCE_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const GRIEVANCE_VIDEO_EXTS = ['.mp4', '.mov', '.webm'];
export const GRIEVANCE_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const GRIEVANCE_MAX_PHOTOS = 5;

const extOf = (name) => (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase();

export function checkGrievancePhoto(file, errors) {
  if (!PHOTO_TYPES.includes(file.type) || !GRIEVANCE_PHOTO_EXTS.includes(extOf(file.name))) return errors.photoType;
  if (file.size > PHOTO_MAX_BYTES) return errors.photoSize;
  return null;
}

export function checkGrievanceVideo(file, errors) {
  if (!GRIEVANCE_VIDEO_TYPES.includes(file.type) || !GRIEVANCE_VIDEO_EXTS.includes(extOf(file.name))) return errors.videoType;
  if (file.size > GRIEVANCE_VIDEO_MAX_BYTES) return errors.videoSize;
  return null;
}
