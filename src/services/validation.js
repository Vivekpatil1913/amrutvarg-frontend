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
