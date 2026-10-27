// Public suggestion / complaint intake and the complainant's rating page.
//
// Unlike the registration forms these always go to the CMS: there is no
// preview mode for a grievance, because a complaint that silently goes nowhere
// is worse than one that fails loudly.

import { SubmitError } from './submissions';

const CMS_API = import.meta.env.VITE_CMS_API || 'http://localhost:4000/api/v1';

async function send(path, init) {
  let res;
  try {
    res = await fetch(`${CMS_API}${path}`, init);
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

export function submitGrievance(values, photos, video) {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => form.append(key, String(value).trim()));
  photos.forEach((file) => form.append('photos', file));
  if (video) form.append('video', video);
  return send('/grievances', { method: 'POST', body: form });
}

export const fetchFeedback = (token) => send(`/grievances/feedback/${encodeURIComponent(token)}`);

export const sendFeedback = (token, rating, comment) =>
  send(`/grievances/feedback/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  });
