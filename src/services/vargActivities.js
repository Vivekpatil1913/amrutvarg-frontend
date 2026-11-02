// Amrut Varg activity records: the public portal's submission form and its
// digital repository. Like grievances these always go to the CMS — there is no
// preview mode, because a record that silently goes nowhere is worse than one
// that fails loudly.

import { SubmitError } from './submissions';

const CMS_API = import.meta.env.VITE_CMS_API || 'http://localhost:4000/api/v1';

export const ACTIVITY_PHOTO_MIN = 3;
export const ACTIVITY_PHOTO_MAX = 10;
export const ACTIVITY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ACTIVITY_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACTIVITY_PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'];

const extOf = (name) => {
  const i = String(name).lastIndexOf('.');
  return i === -1 ? '' : String(name).slice(i).toLowerCase();
};

export function checkActivityPhoto(file, errors) {
  if (!ACTIVITY_PHOTO_TYPES.includes(file.type) || !ACTIVITY_PHOTO_EXTS.includes(extOf(file.name))) return errors.photoType;
  if (file.size > ACTIVITY_PHOTO_MAX_BYTES) return errors.photoSize;
  return null;
}

export async function submitActivity(values, photos) {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => form.append(key, String(value ?? '').trim()));
  photos.forEach((file) => form.append('photos', file));
  let res;
  try {
    res = await fetch(`${CMS_API}/varg-activities`, { method: 'POST', body: form });
  } catch {
    throw new SubmitError('network', 'Network error — please check your connection');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new SubmitError('server', data?.error?.message || `HTTP ${res.status}`, data?.error?.details);
    err.status = res.status;
    throw err;
  }
  return data.data;
}

export async function fetchActivities(params = {}, signal) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v != null) q.set(k, String(v));
  });
  const res = await fetch(`${CMS_API}/varg-activities${q.toString() ? `?${q}` : ''}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const cmsApiBase = CMS_API;
