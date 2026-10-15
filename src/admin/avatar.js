const API_ORIGIN = (import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1").replace(/\/api\/v1\/?$/, "");

export function avatarSrc(value) {
  if (!value) return null;
  return /^(https?:|blob:|data:)/i.test(value) ? value : `${API_ORIGIN}${value}`;
}
