// Published content read from the AMRUT VARG service.
//
// Only the active Amrut Varg list is read: it is the one public, read-only
// endpoint the live portal exposes (GET /api/amrut-vargs/active). Records are
// created, edited, approved and removed by administrators on the portal, so
// this site never writes them.

import { API_BASE } from './config';
import { normalizeVargs } from '../data/normalizeVargs';

const TIMEOUT_MS = 10000;

export class ContentError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'network' | 'timeout' | 'server' | 'format'
  }
}

async function getJson(path, signal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = window.setTimeout(() => ctrl.abort(new ContentError('timeout', 'Timed out')), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
  } catch (err) {
    if (err instanceof ContentError) throw err;
    if (ctrl.signal.reason instanceof ContentError) throw ctrl.signal.reason;
    throw new ContentError('network', 'Network error');
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
  if (!res.ok) throw new ContentError('server', `HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new ContentError('format', 'Response is not JSON');
  }
}

export async function fetchActiveVargs(signal) {
  const body = await getJson('/api/amrut-vargs/active', signal);
  try {
    return normalizeVargs(body);
  } catch (err) {
    throw new ContentError('format', err.message);
  }
}
