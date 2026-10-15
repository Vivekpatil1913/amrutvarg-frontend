// Small inline stroke-icon set (24×24, 1.75 stroke) — avoids an icon dependency.
const PATHS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  phone: (
    <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  mapPin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.8 2.8L16.5 9.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  scroll: (
    <>
      <path d="M8 4h11a2 2 0 0 1 2 2v1h-4" />
      <path d="M17 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h9" />
      <path d="M8 4a2 2 0 0 0-2 2v11" />
      <path d="M10 9h4M10 13h4" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a14 14 0 0 1 0 18M3.5 9.5h17M3.5 14.5h17" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 4 6" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  graduation: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5l8-2v18M12 7l8 3v11M2 21h20" />
      <path d="M7.5 8v.01M7.5 12v.01M7.5 16v.01M16 13v.01M16 17v.01" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-9-9.3C2 7.5 4 4.5 7.2 4.5c2 0 3.5 1.1 4.8 2.9 1.3-1.8 2.8-2.9 4.8-2.9 3.2 0 5.2 3 4.2 6.2-1.5 4.7-9 9.3-9 9.3z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z" />
      <path d="M5 19l8-8" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M7 15l1.5 4.5M17.5 9.5a3.5 3.5 0 0 1 0 5" />
    </>
  ),

  // Social marks. Drawn in the same stroke style as the rest of the set so the
  // footer row reads as one piece of artwork rather than four pasted logos.
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      {/* A zero-length line with the svg's round linecap draws the lens dot. */}
      <path d="M17.5 6.5h0" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-13h4v1.5A6 6 0 0 1 16 8z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  // The one filled mark in the set: the X glyph is built from thin diagonals,
  // and outlining them at this stroke width doubles every edge into a muddle.
  twitter: (
    <path
      fill="currentColor"
      stroke="none"
      d="M17.2 3h3.3l-7.2 8.2L21.8 21h-6.6l-5.2-6.6L4.1 21H.8l7.7-8.8L.4 3H7l4.7 6.1L17.2 3zm-1.2 16h1.8L6.1 4.9H4.2L16 19z"
    />
  ),
  youtube: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  tiktok: <path d="M14 4v11.2a4 4 0 1 1-3-3.9M14 4c.6 3.2 2.5 5 5.5 5.3" />,
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20l.9-4.7a8.5 8.5 0 1 1 16.6-3.6z" />
      <path d="M8.5 8.5c.5 3 2.2 4.8 5.2 5.8l1.2-1.2 2 1c-.3 1.5-1.4 2.1-2.7 2-3.4-.4-6.7-3.7-7-7.1-.1-1.3.5-2.4 2-2.7l1 2z" />
    </>
  ),
  telegram: <path d="m22 3-7 18-4-7-7-4 18-7zM11 14 22 3" />,
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 20 2.2-8.2M9.8 10.2c0-2.2 1.5-3.7 3.8-3.7 2 0 3.3 1.2 3.3 3 0 2.3-1.2 4.2-3 4.2-1 0-1.7-.8-1.5-1.8l.5-2" />
    </>
  ),
  threads: <path d="M19.5 10.2c-.5-4.2-3-6.5-7.2-6.5-4.7 0-7.8 3.2-7.8 8.3 0 5.4 3 8.3 7.7 8.3 4 0 6.7-2.2 6.7-5.3 0-2.6-1.8-4.2-4.5-4.2-2.1 0-3.6 1-3.6 2.5 0 1.2.9 2 2.2 2 2.7 0 4.5-2.8 4.5-6.2" />,
  discord: (
    <>
      <path d="M7 6.5a16 16 0 0 1 10 0l2.5 11a14 14 0 0 1-4 2l-1-1.5M9.5 18 8.5 19.5a14 14 0 0 1-4-2L7 6.5" />
      <path d="M9 12h.01M15 12h.01" />
    </>
  ),
  reddit: (
    <>
      <path d="M12 7.5 13 4l4 1" />
      <circle cx="17.5" cy="5" r="1" />
      <path d="M5 12c-2-1-3.5 2 .5 3.5.8 3 3.2 4.5 6.5 4.5s5.7-1.5 6.5-4.5c4-1.5 2.5-4.5.5-3.5" />
      <path d="M8.5 14h.01M15.5 14h.01M9.5 17c1.5 1 3.5 1 5 0" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5 8.5 15a4 4 0 0 1-5.5-5.8l3-3a4 4 0 0 1 5.7 0" />
      <path d="m14 10.5 1.5-1.5A4 4 0 0 1 21 14.8l-3 3a4 4 0 0 1-5.7 0" />
      <path d="m8.5 15 7-7" />
    </>
  ),
};

export default function Icon({ name, size = 20, className, title }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name] ?? PATHS.link}
    </svg>
  );
}
