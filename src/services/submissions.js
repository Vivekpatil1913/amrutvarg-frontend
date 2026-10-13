// Form submission.
//
// By default the site runs as a static front end: forms validate locally and
// `submit*` resolves with { sent: false }, so the UI can say plainly that
// nothing was sent. Setting VITE_ENABLE_LIVE_SUBMIT=true re-enables the
// existing integration with the AMRUT VARG service — the same endpoints the
// live portal posts to — and resolves with { sent: true } only on success.

import { API_BASE, LIVE_SUBMIT } from './config';

export { LIVE_SUBMIT };

export class SubmitError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'network' | 'server'
  }
}

async function post(path, body, isForm = false) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: isForm ? undefined : { 'Content-Type': 'application/json' },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new SubmitError('network', 'Network error');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new SubmitError('server', data.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function submitParticipant(payload) {
  if (!LIVE_SUBMIT) return { sent: false };
  await post('/api/participants', payload);
  return { sent: true };
}

export async function submitOrganizer(payload) {
  if (!LIVE_SUBMIT) return { sent: false };
  await post('/api/organizers', payload);
  return { sent: true };
}

export async function submitLeader(payload, photo) {
  if (!LIVE_SUBMIT) return { sent: false };
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') form.append(key, String(value));
  });
  if (photo) form.append('photo', photo);
  await post('/api/leaders', form, true);
  return { sent: true };
}
