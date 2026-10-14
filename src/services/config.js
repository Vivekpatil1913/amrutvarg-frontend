// Environment-specific settings for the AMRUT VARG service (see .env).

// Base URL of the AMRUT VARG service — the same backend the live portal uses.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://d1n58pfwi63jf3.cloudfront.net';

// Forms post to the service only when this is "true"; otherwise they run in preview.
export const LIVE_SUBMIT = import.meta.env.VITE_ENABLE_LIVE_SUBMIT === 'true';

// Paged success stories (server/storiesApi.js). Same-origin by default. This is
// the fallback now that the CMS holds the stories; see CMS_API below.
export const STORIES_API = import.meta.env.VITE_STORIES_API || '/api/stories';

// The CMS. Stories, like every other section, are read from here first.
export const CMS_API = import.meta.env.VITE_CMS_API || '';

// The active Amrut Varg list is read from the service only when this is "true";
// otherwise the bundled snapshot in src/data/vargs.js is shown.
export const LIVE_CONTENT = import.meta.env.VITE_ENABLE_LIVE_CONTENT === 'true';
