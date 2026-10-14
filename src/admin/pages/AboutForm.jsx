import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Rocket, Undo2, Plus, Trash2, ArrowUp, ArrowDown,
  UploadCloud, X, Image as ImageIcon,
} from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { BUNDLED } from "../lib/siteImages.js";

// The whole About section on one page, grouped into cards.
//
// Limits here mirror src/modules/about/about.schema.js exactly. The browser
// catches mistakes early; the server is still what decides, and its field-level
// errors are shown against the same inputs.

const MAX = {
  badge: 80, title: 120, question: 80, stepTitle: 120, stepDesc: 600,
  alt: 300, caption: 200, featTitle: 80, featLabel: 60,
};
const LIMITS = { steps: 8, features: 12 };

const newId = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const blank = (v) => !String(v ?? "").trim();

function Section({ title, desc, action, children }) {
  return (
    <section className="a-card a-panel">
      <header className="a-panel-head a-panel-head--row">
        <div>
          <h2 className="a-panel-title">{title}</h2>
          {desc && <p className="a-panel-desc">{desc}</p>}
        </div>
        {action}
      </header>
      <div className="a-panel-body">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, max, required, textarea, hint, error }) {
  const v = value ?? "";
  return (
    <div className={`a-field ${error ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {textarea ? (
        <textarea className="a-input a-textarea" rows={3} maxLength={max}
                  value={v} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="a-input" maxLength={max}
               value={v} onChange={(e) => onChange(e.target.value)} />
      )}
      {error
        ? <span className="a-field-error">{error}</span>
        : <span className="a-field-note">{hint ? `${hint} ` : ""}{v.length}/{max}</span>}
    </div>
  );
}

function Bilingual({ label, base, obj, onPatch, max, textarea, required, hint, error }) {
  return (
    <div className="a-form-grid a-form-grid-2">
      <TextField label={`${label} (Marathi)`} required={required} hint={hint} max={max}
                 textarea={textarea} error={error}
                 value={obj[`${base}_mr`]} onChange={(v) => onPatch({ [`${base}_mr`]: v })} />
      <TextField label={`${label} (English)`} max={max} textarea={textarea}
                 value={obj[`${base}_en`]} onChange={(v) => onPatch({ [`${base}_en`]: v })} />
    </div>
  );
}

function Row({ index, total, title, onMove, onRemove, children }) {
  return (
    <div className="a-row-card">
      <div className="a-row-head">
        <span className="a-row-index">{index + 1}</span>
        <span className="a-row-title">{title || <em className="a-text-muted">Untitled</em>}</span>
        <div className="a-row-tools">
          <button type="button" className="a-action-btn" disabled={index === 0}
                  onClick={() => onMove(-1)} title="Move up"><ArrowUp size={15} /></button>
          <button type="button" className="a-action-btn" disabled={index === total - 1}
                  onClick={() => onMove(1)} title="Move down"><ArrowDown size={15} /></button>
          <button type="button" className="a-action-btn danger" onClick={onRemove}
                  title="Remove"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="a-row-body">{children}</div>
    </div>
  );
}

export default function AboutForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [icons, setIcons] = useState([]);
  const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState({});
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const dirty = useMemo(
    () => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false),
    [draft, saved]
  );

  // The same rules the server applies, so a mistake is caught before the request.
  const errors = useMemo(() => {
    if (!draft) return {};
    const e = {};
    if (blank(draft.text.title_mr)) e["text.title_mr"] = "A Marathi heading is required";
    if (draft.steps.length === 0) e["steps"] = "At least one step is required";
    draft.steps.forEach((s, i) => {
      if (blank(s.question_mr)) e[`steps.${i}.question_mr`] = "A Marathi question is required";
      if (blank(s.title_mr)) e[`steps.${i}.title_mr`] = "A Marathi title is required";
    });
    draft.features.items.forEach((f, i) => {
      if (blank(f.label_mr)) e[`features.items.${i}.label_mr`] = "A Marathi label is required";
    });
    return e;
  }, [draft]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (key) => errors[key] ?? serverErrors[key];

  useEffect(() => {
    Promise.all([api.get("/admin/about"), api.get("/admin/about/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
        setIcons(opt.data.icons ?? []);
      })
      .catch(() => toast.show("Could not load the About section", "bad"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (ev) => { ev.preventDefault(); ev.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = useCallback((section, values) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...values } }));
  }, []);

  const patchStep = useCallback((i, values) => {
    setDraft((d) => ({ ...d, steps: d.steps.map((s, n) => (n === i ? { ...s, ...values } : s)) }));
  }, []);

  const moveStep = useCallback((i, delta) => {
    setDraft((d) => {
      const list = [...d.steps];
      const to = i + delta;
      if (to < 0 || to >= list.length) return d;
      [list[i], list[to]] = [list[to], list[i]];
      return { ...d, steps: list };
    });
  }, []);

  const patchFeature = useCallback((i, values) => {
    setDraft((d) => ({
      ...d,
      features: { ...d.features, items: d.features.items.map((f, n) => (n === i ? { ...f, ...values } : f)) },
    }));
  }, []);

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload("/admin/media/upload", fd);
      patch("image", { media_id: res.data.id, url: res.data.url });
      toast.show("Image uploaded", "ok");
    } catch (err) {
      toast.show(err.message || "Upload failed", "bad");
    } finally {
      setUploading(false);
    }
  }

  async function save({ thenPublish = false } = {}) {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const res = await api.put("/admin/about/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/about/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.show("Published — the website is updated", "ok");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/about");
      } catch (err) {
        // Server errors land against the field they name.
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.show(err.message, "bad");
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function discard() {
    await mutate(async () => {
      const res = await api.post("/admin/about/discard");
      setDraft(res.data.draft);
      setSaved(res.data.draft);
      setMeta((m) => ({ ...m, has_unpublished_changes: false }));
      setConfirmDiscard(false);
      toast.show("Draft reset to the published version", "ok");
    });
  }

  if (loading) {
    return (
      <div className="a-spinner">
        <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading About section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">About section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/about")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const iconOptions = icons.map((i) => ({ value: i, label: i }));

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone={dirty ? "warn" : meta.has_unpublished_changes ? "info" : "ok"}>
            {dirty ? "Unsaved changes" : meta.has_unpublished_changes ? "Draft" : "Published"}
          </Badge>
          <h1 className="a-page-title a-mt-1">Edit About Section</h1>
          <p className="a-page-desc">
            “What is Amrut Varg?” in full. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/about")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>

      {invalid && (
        <div className="a-notice a-notice-warn">
          <div className="a-notice-body">
            <p className="a-notice-title">{Object.keys(errors).length} field(s) need attention</p>
            <p>Saving is blocked until the highlighted fields are filled in.</p>
          </div>
        </div>
      )}

      <div className="a-form-layout">
        <div className="a-form-main">
          {/* ── Heading ─────────────────────────────────────────────────── */}
          <Section title="Heading" desc="The small label and the section title.">
            <Bilingual label="Top label" base="badge" obj={draft.text}
                       hint="The small line above the title."
                       onPatch={(v) => patch("text", v)} max={MAX.badge} />
            <Bilingual label="Section title" base="title" obj={draft.text} required
                       error={errFor("text.title_mr")}
                       onPatch={(v) => patch("text", v)} max={MAX.title} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          {/* ── Steps ───────────────────────────────────────────────────── */}
          <Section
            title="Steps"
            desc="The numbered path down the section. Numbering follows this order."
            action={draft.steps.length < LIMITS.steps && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDraft((d) => ({
                ...d,
                steps: [...d.steps, {
                  id: newId("step"), icon: icons[0] ?? "sparkle",
                  question_mr: "", question_en: "", title_mr: "", title_en: "",
                  desc_mr: "", desc_en: "", enabled: true,
                }],
              }))}>
                <Plus size={15} /> Add step
              </button>
            )}
          >
            {errFor("steps") && <p className="a-field-error">{errFor("steps")}</p>}
            {draft.steps.map((s, i) => (
              <Row key={s.id} index={i} total={draft.steps.length} title={s.title_mr}
                   onMove={(d) => moveStep(i, d)}
                   onRemove={() => setDraft((d) => ({ ...d, steps: d.steps.filter((_, n) => n !== i) }))}>
                <Bilingual label="Question" base="question" obj={s} required
                           hint="The small coloured line, e.g. “कोणासाठी?”."
                           error={errFor(`steps.${i}.question_mr`)}
                           onPatch={(v) => patchStep(i, v)} max={MAX.question} />
                <Bilingual label="Title" base="title" obj={s} required
                           error={errFor(`steps.${i}.title_mr`)}
                           onPatch={(v) => patchStep(i, v)} max={MAX.stepTitle} />
                <Bilingual label="Description" base="desc" obj={s} textarea
                           onPatch={(v) => patchStep(i, v)} max={MAX.stepDesc} />
                <div className="a-form-grid a-form-grid-2">
                  <div className="a-field">
                    <label className="a-label">Icon</label>
                    <select className="a-input" value={s.icon}
                            onChange={(e) => patchStep(i, { icon: e.target.value })}>
                      {iconOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <label className="a-checkbox-label">
                    <input type="checkbox" className="a-checkbox" checked={s.enabled !== false}
                           onChange={(e) => patchStep(i, { enabled: e.target.checked })} />
                    Show this step
                  </label>
                </div>
              </Row>
            ))}
          </Section>

          {/* ── Image ───────────────────────────────────────────────────── */}
          <Section title="Image" desc="The photograph beside the text, and the quote over it.">
            <div className="a-media-row">
              <div className="a-media-thumb">
                <img src={draft.image.url || BUNDLED.about.image} alt="" />
              </div>
              <div className="a-media-actions">
                <label className="a-btn a-btn-primary">
                  <UploadCloud size={16} /> {uploading ? "Uploading…" : "Upload image"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                         hidden onChange={uploadImage} disabled={uploading} />
                </label>
                <button className="a-btn a-btn-secondary" onClick={() => setPicking(true)}>
                  <ImageIcon size={16} /> Choose from library
                </button>
                {draft.image.url && (
                  <button className="a-btn a-btn-ghost"
                          onClick={() => patch("image", { media_id: null, url: "" })}>
                    <X size={15} /> Reset to bundled
                  </button>
                )}
                <span className="a-field-note">
                  {draft.image.url ? "Uploaded image." : "The photograph shipped with the site."}
                  {" "}PNG, JPG, WebP or GIF, up to 10 MB.
                </span>
              </div>
            </div>
            <Bilingual label="Alt text" base="alt" obj={draft.image}
                       hint="Describes the photograph for screen readers."
                       onPatch={(v) => patch("image", v)} max={MAX.alt} />
            <Bilingual label="Quote caption" base="caption" obj={draft.image}
                       hint="The line in the dark band over the photograph."
                       onPatch={(v) => patch("image", v)} max={MAX.caption} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.image.enabled !== false}
                     onChange={(e) => patch("image", { enabled: e.target.checked })} />
              Show the image
            </label>
          </Section>

          {/* ── Features ────────────────────────────────────────────────── */}
          <Section
            title="Feature Tags"
            desc="The row of pills under the steps."
            action={draft.features.items.length < LIMITS.features && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDraft((d) => ({
                ...d,
                features: {
                  ...d.features,
                  items: [...d.features.items, { id: newId("feat"), label_mr: "", label_en: "", enabled: true }],
                },
              }))}>
                <Plus size={15} /> Add tag
              </button>
            )}
          >
            <Bilingual label="Group title" base="title" obj={draft.features}
                       hint="The heading above the pills."
                       onPatch={(v) => patch("features", v)} max={MAX.featTitle} />
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Group icon</label>
                <select className="a-input" value={draft.features.icon}
                        onChange={(e) => patch("features", { icon: e.target.value })}>
                  {iconOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={draft.features.enabled !== false}
                       onChange={(e) => patch("features", { enabled: e.target.checked })} />
                Show the feature tags
              </label>
            </div>

            <div className="a-form-divider" />
            {draft.features.items.map((f, i) => (
              <Row key={f.id} index={i} total={draft.features.items.length} title={f.label_mr}
                   onMove={(d) => setDraft((prev) => {
                     const list = [...prev.features.items];
                     const to = i + d;
                     if (to < 0 || to >= list.length) return prev;
                     [list[i], list[to]] = [list[to], list[i]];
                     return { ...prev, features: { ...prev.features, items: list } };
                   })}
                   onRemove={() => setDraft((prev) => ({
                     ...prev,
                     features: { ...prev.features, items: prev.features.items.filter((_, n) => n !== i) },
                   }))}>
                <Bilingual label="Tag label" base="label" obj={f} required
                           error={errFor(`features.items.${i}.label_mr`)}
                           onPatch={(v) => patchFeature(i, v)} max={MAX.featLabel} />
                <label className="a-checkbox-label">
                  <input type="checkbox" className="a-checkbox" checked={f.enabled !== false}
                         onChange={(e) => patchFeature(i, { enabled: e.target.checked })} />
                  Show this tag
                </label>
              </Row>
            ))}
          </Section>
        </div>

        {/* ── Preview ───────────────────────────────────────────────────── */}
        <aside className="a-form-side">
          <Section title="Preview" desc="How the section reads on the site, in Marathi.">
            {draft.text.badge_mr && (
              <p className="a-mini-eyebrow">
                {draft.text.eyebrow_dot !== false && <span className="a-mini-dot" />}
                {draft.text.badge_mr}
              </p>
            )}
            <h3 className="a-mini-title">{draft.text.title_mr || "—"}</h3>

            <ol className="a-mini-steps">
              {draft.steps.filter((s) => s.enabled !== false).map((s, i) => (
                <li key={s.id}>
                  <span className="a-mini-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <span className="a-mini-step-q">{s.question_mr}</span>
                    <strong className="a-mini-step-t">{s.title_mr}</strong>
                    {s.desc_mr && <span className="a-mini-step-d">{s.desc_mr}</span>}
                  </div>
                </li>
              ))}
            </ol>

            {draft.features.enabled !== false && (
              <div className="a-mini-tags">
                {draft.features.items.filter((f) => f.enabled !== false).map((f) => (
                  <span key={f.id} className="a-chip">{f.label_mr || "—"}</span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Publication" desc="Previewing never changes the live site.">
            <div className="a-view-list">
              <div className="a-view-row">
                <span className="a-view-label">Status</span>
                <div className="a-view-value">
                  {dirty
                    ? <Badge tone="warn">Unsaved changes</Badge>
                    : meta.has_unpublished_changes
                      ? <Badge tone="info">Draft saved, not published</Badge>
                      : <Badge tone="ok">Published</Badge>}
                </div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Last published</span>
                <div className="a-view-value">
                  {meta.published_at ? new Date(meta.published_at).toLocaleString("en-IN") : "—"}
                </div>
              </div>
            </div>
            {meta.has_unpublished_changes && (
              <button className="a-btn a-btn-ghost a-btn-sm a-mt-1" onClick={() => setConfirmDiscard(true)}>
                <Undo2 size={15} /> Discard draft
              </button>
            )}
          </Section>
        </aside>
      </div>

      <div className="a-save-bar">
        <span className="a-save-bar-state">
          {invalid
            ? `${Object.keys(errors).length} field(s) need attention`
            : dirty
              ? "Unsaved changes"
              : meta.has_unpublished_changes
                ? "Draft saved — not yet on the website"
                : "Everything published"}
        </span>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/about")}>Cancel</button>
          <button className="a-btn a-btn-secondary" onClick={() => save()} disabled={saving || !dirty || invalid}>
            <Save size={16} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button className="a-btn a-btn-primary" onClick={() => save({ thenPublish: true })} disabled={saving || invalid}>
            <Rocket size={16} /> {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(asset) => {
          patch("image", { media_id: asset.id, url: asset.url });
          setPicking(false);
        }}
      />

      <ConfirmModal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
        loading={saving}
        title="Discard draft"
        message="Throw away the draft and start again from the published version?"
        subMessage="The live website is not affected."
      />
    </>
  );
}

// Reuses the existing media library rather than adding a second upload path.
function MediaPicker({ open, onClose, onPick }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/admin/media?limit=60")
      .then((res) => setAssets(res.data))
      .catch(() => toast.show("Could not load the media library", "bad"))
      .finally(() => setLoading(false));
  }, [open, toast]);

  return (
    <Modal open={open} onClose={onClose} title="Choose an image" size="lg"
           footer={<button className="a-btn a-btn-ghost" onClick={onClose}>Cancel</button>}>
      {loading ? (
        <div className="a-spinner">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="a-empty-state">
          <p className="a-empty-title">The media library is empty</p>
          <p className="a-text-muted a-text-sm">Use Upload image on the form to add one.</p>
        </div>
      ) : (
        <div className="a-media-grid">
          {assets.map((a) => (
            <button key={a.id} type="button" className="a-media-pick"
                    onClick={() => onPick(a)} title={a.original_name}>
              <img src={a.url} alt={a.alt_text || a.original_name} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
