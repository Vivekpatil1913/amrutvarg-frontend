// Sharing one piece of content.
//
// Three things are kept apart on purpose:
//
//   shareUrl   — the canonical PUBLIC address a recipient can open
//   shareText  — the message, built from the content's own title
//   whatsappHref — the wa.me address that opens WhatsApp with that message
//
// The URL is always an address on this website, never a CMS endpoint, an
// /uploads path or an admin route: a share is read by someone who has no
// account here, and an internal address would be both useless and a leak.
//
// Nothing is ever sent. wa.me opens WhatsApp with the message prefilled and
// the visitor chooses a recipient and presses send themselves.
//
// Kept free of imports so `node --test` can run the tests beside it.

// The site's own origin. Falls back to the configured public URL when the
// page is rendered somewhere without a window (a build, a test).
export function siteOrigin(fallback = '') {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return fallback;
}

/**
 * An absolute address on this site for a path such as "/yashogatha/#video-3".
 * A path that is not rooted here is refused rather than shared.
 */
export function publicUrl(path, origin = siteOrigin()) {
  const p = String(path ?? '').trim();
  // A single leading slash is a path on this site. TWO is a protocol-relative
  // URL — "//evil.test/x" names another host entirely while still passing a
  // naive "starts with /" test, so it is refused here.
  if (!p.startsWith('/') || p.startsWith('//')) return '';
  const base = String(origin ?? '').replace(/\/+$/, '');
  return `${base}${p}`;
}

/**
 * The message WhatsApp opens with: a short lead, the title, then the link on
 * its own line so WhatsApp renders it as a tappable preview.
 *
 * `lead` and `title` come from the content record and the current language —
 * nothing here is hardcoded per item.
 */
export function shareText({ lead = '', title = '', url = '' }) {
  return [[lead, title].filter(Boolean).join(' ').trim(), url].filter(Boolean).join('\n');
}

/**
 * The wa.me address for a message. Everything is percent-encoded as one
 * parameter, so a title containing &, # or a newline cannot break the link.
 *
 * Returns "" for an empty message rather than a bare wa.me, which would open
 * WhatsApp with nothing in it.
 */
export function whatsappHref(message) {
  const text = String(message ?? '').trim();
  if (!text) return '';
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Whether the browser can hand this off to the operating system's own share
 * sheet. Checked at call time rather than once at module load, because a
 * server render has no navigator at all.
 */
export const canWebShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Offers the native share sheet. Resolves true when it was shown and the
 * visitor did something with it, false when it is unavailable or they
 * dismissed it — a dismissal is a normal outcome, not an error, so the caller
 * can simply fall back to the explicit buttons.
 */
export async function webShare({ title, text, url }) {
  if (!canWebShare()) return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    // AbortError when dismissed; anything else means the sheet failed.
    return false;
  }
}
