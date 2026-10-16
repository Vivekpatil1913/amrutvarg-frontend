// How an external media URL may be rendered on the page.
//
// Mirrors src/lib/mediaUrl.js in the CMS backend, which is the authority: the
// server decides what may be *stored*, this decides what may be *displayed*.
// Both are needed. The server cannot stop a stale row, a hand-edited database
// value or a future provider change from reaching the browser, and the browser
// is where an iframe src actually becomes dangerous.
//
// The rule that matters is the same in both places: an embed address is never
// the stored string. A provider is recognised, its ID extracted, and a fresh
// canonical URL is BUILT from that ID — so nothing a visitor's row contains
// can smuggle parameters, or a different host, into an iframe.
//
// Kept free of imports so `node --test` can run the tests beside it.

const SAFE_PROTOCOLS = ['http:', 'https:'];

export const MAX_URL_LENGTH = 2000;

const VIDEO_FILE_EXT = /\.(mp4|webm|ogv|ogg|m4v|mov)$/i;
const AUDIO_FILE_EXT = /\.(mp3|wav|m4a|aac|oga|ogg|flac|weba)$/i;

export function parseSafeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!SAFE_PROTOCOLS.includes(url.protocol)) return null;
  if (url.username || url.password) return null;
  if (!url.hostname) return null;
  return url;
}

export const isSafeHttpUrl = (value) => parseSafeUrl(value) !== null;

// The candidate must be the host itself or a subdomain of it, so
// "evil-youtube.com" and "youtube.com.evil.net" do not match.
function hostIs(hostname, domain) {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  return h === domain || h.endsWith(`.${domain}`);
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,30}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{10,40}$/;

function youtubeId(url) {
  if (hostIs(url.hostname, 'youtu.be')) {
    const id = url.pathname.split('/').filter(Boolean)[0] || '';
    return YT_ID.test(id) ? id : '';
  }
  if (!hostIs(url.hostname, 'youtube.com') && !hostIs(url.hostname, 'youtube-nocookie.com')) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'watch') {
    const id = url.searchParams.get('v') || '';
    return YT_ID.test(id) ? id : '';
  }
  if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
    const id = parts[1] || '';
    return YT_ID.test(id) ? id : '';
  }
  return '';
}

// A YouTube address can name a video, a channel or a playlist, and the three
// are not interchangeable. Turning a channel link into a video embed — or
// the reverse — sends the visitor somewhere the editor did not choose, so
// each is recognised separately and the original destination is preserved.
const YT_CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const YT_HANDLE = /^@[A-Za-z0-9._-]{3,30}$/;
const YT_VANITY = /^[A-Za-z0-9._-]{1,100}$/;
const YT_PLAYLIST = /^[A-Za-z0-9_-]{12,42}$/;

const isYouTubeHost = (url) =>
  hostIs(url.hostname, 'youtube.com') || hostIs(url.hostname, 'youtube-nocookie.com');

// The channel a URL names, in the form YouTube itself serves it. Returns ''
// when the address is not a channel.
function youtubeChannel(url) {
  if (!isYouTubeHost(url)) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length) return '';
  // /@handle — the current form.
  if (YT_HANDLE.test(parts[0])) return `https://www.youtube.com/${parts[0]}`;
  // /channel/UC… — the canonical id.
  if (parts[0] === 'channel' && YT_CHANNEL_ID.test(parts[1] || '')) {
    return `https://www.youtube.com/channel/${parts[1]}`;
  }
  // /c/Name and /user/Name — older vanity forms, still live.
  if (['c', 'user'].includes(parts[0]) && YT_VANITY.test(parts[1] || '')) {
    return `https://www.youtube.com/${parts[0]}/${parts[1]}`;
  }
  return '';
}

// The playlist a URL names. A /watch?v=…&list=… address is a VIDEO that
// happens to sit in a playlist, so it is deliberately not matched here —
// youtubeId claims it first.
function youtubePlaylist(url) {
  if (!isYouTubeHost(url)) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'playlist') return '';
  const id = url.searchParams.get('list') || '';
  return YT_PLAYLIST.test(id) ? id : '';
}

function vimeoId(url) {
  if (!hostIs(url.hostname, 'vimeo.com')) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  const candidate = parts[0] === 'video' ? parts[1] : parts[0];
  return VIMEO_ID.test(candidate || '') ? candidate : '';
}

function instagramCode(url) {
  if (!hostIs(url.hostname, 'instagram.com')) return '';
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.findIndex((p) => ['reel', 'reels', 'p', 'tv'].includes(p));
  if (at === -1) return '';
  const code = parts[at + 1] || '';
  return IG_CODE.test(code) ? code : '';
}

function spotifyEpisode(url) {
  if (!hostIs(url.hostname, 'spotify.com')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.findIndex((p) => ['episode', 'show'].includes(p));
  if (at === -1) return null;
  const id = parts[at + 1] || '';
  if (!SPOTIFY_ID.test(id)) return null;
  return { kind: parts[at], id };
}

/**
 * { provider, mode, src, url } for a video URL, or null when it is not safe
 * to show at all.
 *   mode "iframe" — embed `src`
 *   mode "video"  — play `src` in a <video> element
 *   mode "link"   — offer `url` as an external link only
 */
export function videoEmbed(value) {
  const url = parseSafeUrl(value);
  if (!url) return null;

  const yt = youtubeId(url);
  if (yt) {
    return {
      provider: 'youtube',
      kind: 'video',
      mode: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0`,
      url: url.href,
    };
  }

  // A channel is a YouTube destination in its own right. It is never turned
  // into a video embed; it is offered as a link that opens the channel.
  const channel = youtubeChannel(url);
  if (channel) {
    return { provider: 'youtube', kind: 'channel', mode: 'link', src: '', url: channel };
  }

  const playlist = youtubePlaylist(url);
  if (playlist) {
    return {
      provider: 'youtube',
      kind: 'playlist',
      mode: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/videoseries?list=${playlist}`,
      url: url.href,
    };
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return { provider: 'vimeo', kind: 'video', mode: 'iframe', src: `https://player.vimeo.com/video/${vimeo}`, url: url.href };
  }

  const ig = instagramCode(url);
  if (ig) {
    return { provider: 'instagram', kind: 'video', mode: 'iframe', src: `https://www.instagram.com/reel/${ig}/embed/`, url: url.href };
  }

  if (VIDEO_FILE_EXT.test(url.pathname)) {
    const playable = url.protocol === 'https:';
    return { provider: 'file', kind: 'file', mode: playable ? 'video' : 'link', src: playable ? url.href : '', url: url.href };
  }

  return { provider: 'link', kind: 'page', mode: 'link', src: '', url: url.href };
}

/** Same contract for audio: mode is "audio", "iframe" or "link". */
export function audioEmbed(value) {
  const url = parseSafeUrl(value);
  if (!url) return null;

  if (AUDIO_FILE_EXT.test(url.pathname)) {
    const playable = url.protocol === 'https:';
    return { provider: 'file', mode: playable ? 'audio' : 'link', src: playable ? url.href : '', url: url.href };
  }

  const spotify = spotifyEpisode(url);
  if (spotify) {
    return {
      provider: 'spotify',
      mode: 'iframe',
      src: `https://open.spotify.com/embed/${spotify.kind}/${spotify.id}`,
      url: url.href,
    };
  }

  return { provider: 'link', mode: 'link', src: '', url: url.href };
}

// A file the CMS itself stores comes back as a path under /uploads, which the
// media host serves. Joining it here keeps the API base out of the components.
export const mediaSrc = (base, url) => {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return isSafeHttpUrl(value) ? value : '';
  if (!value.startsWith('/uploads/')) return '';
  return `${String(base ?? '').replace(/\/api\/v1\/?$/, '')}${value}`;
};

/** Seconds as m:ss, or h:mm:ss past an hour. Empty when the length is unknown. */
export function formatDuration(seconds) {
  // An unknown length arrives as null from the API. Number(null) is 0, which
  // would be shown as a real "0:00" running time — so it is ruled out by
  // identity before any arithmetic.
  if (seconds === null || seconds === undefined || seconds === '') return '';
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return '';
  const s = Math.round(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
