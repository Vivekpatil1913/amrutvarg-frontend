import { useEffect, useState } from "react";
import { UploadCloud, X, FileAudio, FileVideo, ImageOff } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "./Toast.jsx";
import { errorMessage } from "../../lib/errors.js";
import { ACCEPT, UPLOAD_ENDPOINT } from "../../lib/mediaContent.js";
import { mediaSrc } from "../../../services/mediaUrl.js";

const CMS_BASE = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";

// One file upload — image, video or audio — with a preview of whatever is
// currently attached.
//
// The size ceiling is read from the server rather than written in here, so
// raising MAX_VIDEO_SIZE_MB takes effect without a front-end change. Until it
// arrives the field still works; it just cannot pre-empt an oversized file,
// and the server's 413 is what the administrator sees instead.
//
// For audio and video the running time is read from the chosen file in the
// browser before it is sent. It is reported through `onDuration` as a
// suggestion the form may use; nothing depends on it succeeding, because a
// container the browser cannot decode is still a perfectly good upload.
export function MediaUpload({
  kind,
  url,
  onChange,
  onDuration,
  label,
  hint,
  disabled,
  previewAlt = "",
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [limits, setLimits] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/admin/media/limits")
      .then((res) => { if (!cancelled) setLimits(res.data); })
      .catch(() => { /* the server still enforces the real limit */ });
    return () => { cancelled = true; };
  }, []);

  const maxMb = limits
    ? { image: limits.imageMaxMb, video: limits.videoMaxMb, audio: limits.audioMaxMb }[kind]
    : null;

  // Reads the running time from the file itself. Resolves to null whenever the
  // browser cannot decode it, which is not an error worth showing.
  function readDuration(file) {
    return new Promise((resolve) => {
      if (kind === "image") return resolve(null);
      const el = document.createElement(kind === "audio" ? "audio" : "video");
      const src = URL.createObjectURL(file);
      const done = (value) => {
        el.removeAttribute("src");
        URL.revokeObjectURL(src);
        resolve(value);
      };
      el.preload = "metadata";
      el.onloadedmetadata = () =>
        done(Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration) : null);
      el.onerror = () => done(null);
      el.src = src;
      // A file the browser will never decode would otherwise leave the promise
      // pending and the form waiting on it.
      window.setTimeout(() => done(null), 8000);
    });
  }

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (maxMb && file.size > maxMb * 1024 * 1024) {
      toast.show(`That file is ${(file.size / 1048576).toFixed(1)} MB — the limit is ${maxMb} MB`, "bad");
      return;
    }

    setBusy(true);
    try {
      const seconds = await readDuration(file);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload(UPLOAD_ENDPOINT[kind], fd);
      onChange({ id: res.data.id, url: res.data.url });
      if (seconds && onDuration) onDuration(seconds);
      toast.show(`${label} uploaded`, "ok");
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed"));
    } finally {
      setBusy(false);
    }
  }

  const src = mediaSrc(CMS_BASE, url);
  const Placeholder = kind === "audio" ? FileAudio : kind === "video" ? FileVideo : ImageOff;

  return (
    <div className="a-media-row">
      <div className="a-media-thumb">
        {!src ? (
          <span className="a-text-muted a-text-xs" style={{ display: "grid", gap: 4, justifyItems: "center" }}>
            <Placeholder size={18} aria-hidden="true" />
            Nothing attached
          </span>
        ) : kind === "image" ? (
          <img src={src} alt={previewAlt} />
        ) : kind === "video" ? (
          <video src={src} controls preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <audio src={src} controls style={{ width: "100%" }} />
        )}
      </div>
      <div className="a-media-actions">
        <label className={`a-btn a-btn-primary${busy || disabled ? " is-disabled" : ""}`}>
          <UploadCloud size={16} /> {busy ? "Uploading…" : `Upload ${label.toLowerCase()}`}
          <input
            type="file"
            accept={ACCEPT[kind]}
            hidden
            onChange={pick}
            disabled={busy || disabled}
          />
        </label>
        {url && (
          <button
            type="button"
            className="a-btn a-btn-ghost"
            disabled={busy || disabled}
            onClick={() => onChange({ id: null, url: "" })}
          >
            <X size={15} /> Remove
          </button>
        )}
        {hint && <span className="a-field-note">{hint}{maxMb ? ` Up to ${maxMb} MB.` : ""}</span>}
      </div>
    </div>
  );
}

export default MediaUpload;
