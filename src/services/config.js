// Environment-specific settings for the AMRUT VARG service (see .env.example).

// Base URL of the AMRUT VARG service — the same backend the live portal uses.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://d1n58pfwi63jf3.cloudfront.net';

// Forms post to the service only when this is "true"; otherwise they run in preview.
export const LIVE_SUBMIT = import.meta.env.VITE_ENABLE_LIVE_SUBMIT === 'true';

// The active Amrut Varg list is read from the service only when this is "true";
// otherwise the bundled snapshot in src/data/vargs.js is shown.
export const LIVE_CONTENT = import.meta.env.VITE_ENABLE_LIVE_CONTENT === 'true';
