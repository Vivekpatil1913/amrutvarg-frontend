// Option lists for the Videos/Reels and Podcasts screens.
//
// These mirror the enums in the CMS backend — src/modules/videos/videos.schema.js
// and src/modules/podcasts/podcasts.schema.js — which are what actually decide.
// A value here that the server does not know would be rejected on save, so the
// two lists are meant to be kept in step.

export const CONTENT_TYPES = [
  { value: "video", label: "Video", hint: "A full-length landscape video." },
  { value: "reel", label: "Reel", hint: "A short vertical clip." },
];

export const SOURCE_TYPES = [
  { value: "upload", label: "Upload a file" },
  { value: "url", label: "External URL" },
];

export const VIDEO_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "session", label: "Daily session" },
  { value: "yoga", label: "Yoga and exercise" },
  { value: "training", label: "Training" },
  { value: "success", label: "Success story" },
  { value: "event", label: "Event" },
  { value: "awareness", label: "Awareness" },
  { value: "interview", label: "Interview" },
];

export const PODCAST_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "session", label: "Daily session" },
  { value: "interview", label: "Interview" },
  { value: "guidance", label: "Guidance" },
  { value: "story", label: "Story" },
  { value: "training", label: "Training" },
  { value: "awareness", label: "Awareness" },
];

export const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label || value || "—";

// What a browser may offer in its file picker. The server re-checks both the
// declared type and the file's own signature, so this is convenience, not
// security.
export const ACCEPT = {
  image: "image/png,image/jpeg,image/webp,image/gif",
  video: "video/mp4,video/webm,video/ogg,video/quicktime",
  audio: "audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac",
};

export const UPLOAD_ENDPOINT = {
  image: "/admin/media/upload",
  video: "/admin/media/upload/video",
  audio: "/admin/media/upload/audio",
};
