import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Modal } from "./ui/Modal.jsx";
import { useToast } from "./ui/Toast.jsx";
import { api } from "../api/client.js";
import { errorMessage } from "../lib/errors.js";
import { mediaSrc } from "../../services/mediaUrl.js";
import {
  checkActivityPhoto, ACTIVITY_PHOTO_MAX, ACTIVITY_PHOTO_MAX_BYTES, ACTIVITY_PHOTO_TYPES, ACTIVITY_PHOTO_EXTS,
} from "../../services/vargActivities.js";

// Adds photographs to an activity record, up to the form's three in all.
// An Excel import arrives with none and stays hidden until it has one, so a
// hidden record offers to go public in the same step.

const CMS_API = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";
const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const PHOTO_ERRORS = {
  photoType: "Photos must be JPG, PNG or WEBP images.",
  photoSize: `Each photo must be ${mb(ACTIVITY_PHOTO_MAX_BYTES)} or smaller.`,
};

export default function VargActivityPhotos({ record, onClose, onSaved }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [picked, setPicked] = useState([]); // { file, url }
  const [error, setError] = useState("");
  const [show, setShow] = useState(true);
  const [busy, setBusy] = useState(false);

  const held = Array.isArray(record?.photos) ? record.photos : [];
  const room = ACTIVITY_PHOTO_MAX - held.length;

  // A fresh dialog for each record; previews are released as they go.
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  useEffect(() => {
    setPicked([]);
    setError("");
    setShow(true);
    return () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, [record?.id]);

  function close() {
    if (busy) return;
    picked.forEach((p) => URL.revokeObjectURL(p.url));
    setPicked([]);
    onClose();
  }

  function onPick(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    if (picked.length + files.length > room) {
      setError(`This record can take ${room} more photo${room === 1 ? "" : "s"} (at most ${ACTIVITY_PHOTO_MAX} in all).`);
      return;
    }
    const problem = files.map((f) => checkActivityPhoto(f, PHOTO_ERRORS)).find(Boolean);
    setError(problem || "");
    if (!problem) setPicked((list) => [...list, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function remove(i) {
    setPicked((list) => {
      URL.revokeObjectURL(list[i].url);
      return list.filter((_, j) => j !== i);
    });
    setError("");
  }

  async function upload() {
    if (!picked.length) {
      setError("Choose at least one photograph.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      picked.forEach((p) => form.append("photos", p.file));
      const goPublic = !record.is_active && show;
      form.append("show", String(goPublic));
      await api.post(`/admin/varg-activities/${record.id}/photos`, form);
      toast.success(goPublic ? "Photos added — the record is now public" : "Photos added");
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      setPicked([]);
      onSaved();
    } catch (err) {
      setError(err.status === 413
        ? "Those photos are too large to send together. Upload them one at a time."
        : errorMessage(err, "Could not upload the photos"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(record)}
      onClose={close}
      title="Add photos"
      size="lg"
      className="av-sheet"
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="a-btn a-btn-primary" onClick={upload} disabled={busy || !picked.length}>
            {busy ? "Uploading…" : picked.length ? `Upload ${picked.length} photo${picked.length === 1 ? "" : "s"}` : "Upload photos"}
          </button>
        </>
      }
    >
      {record && (
        <div className="av-import">
          <div>
            <p className="a-font-bold">{record.institution_name}</p>
            <p className="a-text-muted a-text-sm">
              {[record.taluka, record.district_en || record.district_mr].filter(Boolean).join(", ")} · Pramukh{" "}
              <span className="av-pramukh-name">{record.incharge_name}</span>
            </p>
          </div>

          {held.length ? (
            <div>
              <p className="a-label">On record</p>
              <span className="av-thumbs">
                {held.map((p) => <img key={p.url} src={mediaSrc(CMS_API, p.url)} alt={p.originalName || ""} />)}
              </span>
            </div>
          ) : null}

          {room > 0 ? (
            <div>
              <p className="a-label a-label-required">Photographs</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={[...ACTIVITY_PHOTO_TYPES, ...ACTIVITY_PHOTO_EXTS].join(",")}
                className="sr-only"
                onChange={onPick}
                disabled={busy}
              />
              <button
                type="button"
                className="a-btn a-btn-secondary a-btn-sm"
                onClick={() => inputRef.current?.click()}
                disabled={busy || picked.length >= room}
              >
                <Camera size={14} /> Choose photos
              </button>
              <span className="a-field-note">
                JPG, PNG or WEBP · up to {mb(ACTIVITY_PHOTO_MAX_BYTES)} each · {room} more allowed (at most {ACTIVITY_PHOTO_MAX} per record)
              </span>
              {picked.length ? (
                <ul className="av-photo-picks">
                  {picked.map((p, i) => (
                    <li key={p.url}>
                      <img src={p.url} alt={p.file.name} />
                      <span className="a-text-xs a-text-muted">{mb(p.file.size)}</span>
                      <button type="button" onClick={() => remove(i)} aria-label={`Remove ${p.file.name}`} disabled={busy}>
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="a-text-muted a-text-sm">This record already has {ACTIVITY_PHOTO_MAX} photographs, the most it can hold.</p>
          )}

          {error ? <p className="av-import-file-error" role="alert">{error}</p> : null}

          {!record.is_active && room > 0 ? (
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} disabled={busy} />
              Show this record on the public site once the photos are added
            </label>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
