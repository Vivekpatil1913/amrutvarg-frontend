// Form submission.
//
// By default the site runs as a static front end: forms validate locally and
// `submit*` resolves with { sent: false }, so the UI can say plainly that
// nothing was sent. Setting VITE_ENABLE_LIVE_SUBMIT=true re-enables the
// existing integration with the AMRUT VARG service.

import { LIVE_SUBMIT } from './config';

export { LIVE_SUBMIT };

const CMS_API = import.meta.env.VITE_CMS_API || 'http://localhost:4000/api/v1';

export class SubmitError extends Error {
  constructor(kind, message, details = []) {
    super(message);
    this.kind = kind; // 'network' | 'server'
    this.details = Array.isArray(details) ? details : [];
  }
}

async function post(path, body, isForm = false) {
  let res;
  try {
    res = await fetch(`${CMS_API}${path}`, {
      method: 'POST',
      headers: isForm ? undefined : { 'Content-Type': 'application/json' },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new SubmitError('network', 'Network error — please check your connection');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new SubmitError('server', data?.error?.message || `HTTP ${res.status}`, data?.error?.details);
  }
  return res.json();
}

export async function submitParticipant(payload) {
  if (!LIVE_SUBMIT) return { sent: false };
  await post('/forms/participants', payload);
  return { sent: true };
}

export async function submitOrganizer(payload) {
  if (!LIVE_SUBMIT) return { sent: false };
  await post('/forms/organizers', payload);
  return { sent: true };
}

export async function submitLeader(payload, photo) {
  if (!LIVE_SUBMIT) return { sent: false };
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') form.append(key, String(value));
  });
  if (photo) form.append('photo', photo);
  await post('/forms/leaders', form, true);
  return { sent: true };
}