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
import { errorMessage } from "../lib/errors.js";
import { BUNDLED } from "../lib/siteImages.js";

// The whole hero configuration on one scrolling page, grouped into cards.
//
// The hero is a single document (hero_section holds one row), so this page
// loads it, edits it in place and writes it back through the endpoints the CMS
// already uses. No field, limit or validation rule differs from before — only
// the arrangement.

const MAX = {
  eyebrow: 160, title: 80, tagline: 200, desc: 600,
  label: 80, value: 80, quickDesc: 160, alt: 300, caption: 160,
};

const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

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

function TextField({ label, value, onChange, max, required, textarea, hint }) {
  const v = value ?? "";
  return (
    <div className="a-field">
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {textarea ? (
        <textarea className="a-input a-textarea" rows={3} maxLength={max}
                  value={v} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="a-input" maxLength={max}
               value={v} onChange={(e) => onChange(e.target.value)} />
      )}
      <span className="a-field-note">{hint ? `${hint} ` : ""}{v.length}/{max}</span>
    </div>
  );
}

function Bilingual({ label, base, obj, onPatch, max, textarea, required, hint }) {
  return (
    <div className="a-form-grid a-form-grid-2">
      <TextField label={`${label} (Marathi)`} required={required} hint={hint} max={max} textarea={textarea}
                 value={obj[`${base}_mr`]} onChange={(v) => onPatch({ [`${base}_mr`]: v })} />
      <TextField label={`${label} (English)`} max={max} textarea={textarea}
                 value={obj[`${base}_en`]} onChange={(v) => onPatch({ [`${base}_en`]: v })} />
    </div>
  );
}

function Picker({ label, value, onChange, options, required, hint }) {
  return (
    <div className="a-field">
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      <select className="a-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <span className="a-field-note">{hint}</span>}
    </div>
  );
}

// One entry of a repeatable collection, with its order and removal controls.
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

// One image position: upload straight from here, or pick something already in
// the library. An empty slot falls back to the photograph shipped with the site.
function ImageSlot({ slot, img, onPatch, onBrowse, maxAlt }) {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const isMain = slot === "main";

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload("/admin/media/upload", fd);
      onPatch({ media_id: res.data.id, url: res.data.url });
      toast.show("Image uploaded", "ok");
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="a-row-card">
      <div className="a-row-head">
        <span className="a-row-title">
          {isMain ? "Main image (circular)" : "Supporting image (card)"}
        </span>
        <label className="a-checkbox-label a-row-tools">
          <input type="checkbox" className="a-checkbox" checked={img.enabled !== false}
                 onChange={(e) => onPatch({ enabled: e.target.checked })} />
          Show
        </label>
      </div>
      <div className="a-row-body">
        <div className="a-media-row">
          <div className="a-media-thumb">
            <img src={img.url || BUNDLED.hero[slot]} alt="" />
          </div>
          <div className="a-media-actions">
            <label className={`a-btn a-btn-primary ${uploading ? "is-busy" : ""}`}>
              <UploadCloud size={16} /> {uploading ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                     hidden onChange={upload} disabled={uploading} />
            </label>
            <button className="a-btn a-btn-secondary" onClick={onBrowse}>
              <ImageIcon size={16} /> Choose from library
            </button>
            {img.url && (
              <button className="a-btn a-btn-ghost"
                      onClick={() => onPatch({ media_id: null, url: "" })}>
                <X size={15} /> Reset to bundled
              </button>
            )}
            <span className="a-field-note">
              {img.url ? "Uploaded image." : "The photograph shipped with the site."}
              {" "}PNG, JPG, WebP or GIF, up to 10 MB.
            </span>
          </div>
        </div>
        <Bilingual label="Alt text" base="alt" obj={img}
                   hint="Describes the photograph for screen readers."
                   onPatch={onPatch} max={maxAlt} />
      </div>
    </div>
  );
}

export default function HeroForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [options, setOptions] = useState({ icons: [], targets: [], statSources: [] });
  const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [loading, setLoading] = useState(true);
  const [mediaPicker, setMediaPicker] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const dirty = useMemo(
    () => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false),
    [draft, saved]
  );

  useEffect(() => {
    Promise.all([api.get("/admin/hero"), api.get("/admin/hero/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
        setOptions(opt.data);
      })
      .catch(() => toast.show("Could not load the hero section", "bad"))
      .finally(() => setLoading(false));
  }, [toast]);

  // Warns on tab close while edits are unsaved.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = useCallback((section, values) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...values } }));
  }, []);

  const patchItem = useCallback((key, i, values) => {
    setDraft((d) => ({ ...d, [key]: d[key].map((it, n) => (n === i ? { ...it, ...values } : it)) }));
  }, []);

  const moveItem = useCallback((key, i, delta) => {
    setDraft((d) => {
      const list = [...d[key]];
      const to = i + delta;
      if (to < 0 || to >= list.length) return d;
      [list[i], list[to]] = [list[to], list[i]];
      return { ...d, [key]: list };
    });
  }, []);

  const removeItem = useCallback((key, i) => {
    setDraft((d) => ({ ...d, [key]: d[key].filter((_, n) => n !== i) }));
  }, []);

  const addItem = useCallback((key, item) => {
    setDraft((d) => ({ ...d, [key]: [...d[key], item] }));
  }, []);

  async function saveDraft({ thenPublish = false, thenLeave = false } = {}) {
    await mutate(async () => {
      try {
        const res = await api.put("/admin/hero/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/hero/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.success("Published — the website is updated");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        if (thenLeave || thenPublish) navigate("/admin/hero");
      } catch (err) {
        // Server-side validation decides; show the field it refused.
        const first = err.details?.[0];
        toast.error(errorMessage(err));
        throw err;
      }
    }).catch(() => {});
  }

  async function discard() {
    await mutate(async () => {
      const res = await api.post("/admin/hero/discard");
      setDraft(res.data.draft);
      setSaved(res.data.draft);
      setMeta((m) => ({ ...m, has_unpublished_changes: false }));
      setConfirmDiscard(false);
      toast.show("Draft reset to the published version", "ok");
    }).catch((err) => {
      setConfirmDiscard(false);
      toast.error(errorMessage(err, "Could not discard the draft"));
    });
  }

  if (loading) {
    return (
      <div className="a-spinner">
        <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading hero section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Hero section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/hero")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const iconOptions = options.icons.map((i) => ({ value: i, label: i }));
  const targetOptions = options.targets;
  const sourceOptions = options.statSources;

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone={dirty ? "warn" : meta.has_unpublished_changes ? "info" : "ok"}>
            {dirty ? "Unsaved changes" : meta.has_unpublished_changes ? "Draft" : "Published"}
          </Badge>
          <h1 className="a-page-title a-mt-1">Edit Hero Section</h1>
          <p className="a-page-desc">
            Every part of the homepage hero on one page. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/hero")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>

      <div className="a-form-layout">
        <div className="a-form-main">
          {/* ── A. General content ─────────────────────────────────────── */}
          <Section title="General Content" desc="The text at the top of the home page, in both languages.">
            <Bilingual label="Top label" base="eyebrow" obj={draft.text}
                       hint="The small line above the heading."
                       onPatch={(v) => patch("text", v)} max={MAX.eyebrow} />
            <Bilingual label="Main heading" base="title" obj={draft.text} required
                       hint="The hero's headline."
                       onPatch={(v) => patch("text", v)} max={MAX.title} />
            <Bilingual label="Subheading" base="tagline" obj={draft.text}
                       hint="The line under the heading."
                       onPatch={(v) => patch("text", v)} max={MAX.tagline} />
            <Bilingual label="Description" base="desc" obj={draft.text} textarea
                       hint="The paragraph under the subheading."
                       onPatch={(v) => patch("text", v)} max={MAX.desc} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          {/* ── B. CTA buttons ─────────────────────────────────────────── */}
          <Section
            title="CTA Buttons"
            desc="The first renders as the solid primary action, the second as the outlined one."
            action={draft.ctas.length < 2 && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => addItem("ctas", {
                id: newId("cta"), label_mr: "", label_en: "", icon: "arrowRight",
                target: targetOptions[0]?.value ?? "#about", enabled: true,
              })}>
                <Plus size={15} /> Add button
              </button>
            )}
          >
            {draft.ctas.length === 0 && (
              <p className="a-field-note">No buttons — the hero will show none.</p>
            )}
            {draft.ctas.map((c, i) => (
              <Row key={c.id} index={i} total={draft.ctas.length} title={c.label_mr}
                   onMove={(d) => moveItem("ctas", i, d)} onRemove={() => removeItem("ctas", i)}>
                <Bilingual label="Button label" base="label" obj={c} required
                           onPatch={(v) => patchItem("ctas", i, v)} max={MAX.label} />
                <div className="a-form-grid a-form-grid-2">
                  <Picker label="Icon" value={c.icon} options={iconOptions}
                          onChange={(v) => patchItem("ctas", i, { icon: v })} />
                  <Picker label="Destination" value={c.target} options={targetOptions} required
                          hint="Only pages and sections that exist on the site."
                          onChange={(v) => patchItem("ctas", i, { target: v })} />
                </div>
                <label className="a-checkbox-label">
                  <input type="checkbox" className="a-checkbox" checked={c.enabled !== false}
                         onChange={(e) => patchItem("ctas", i, { enabled: e.target.checked })} />
                  Show this button
                </label>
              </Row>
            ))}
          </Section>

          {/* ── C. Statistics ──────────────────────────────────────────── */}
          <Section
            title="Statistics"
            desc="A counted card takes its number from the database, so it can never go stale."
            action={draft.stats.length < 8 && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => addItem("stats", {
                id: newId("stat"), label_mr: "", label_en: "", value_mr: "", value_en: "",
                source: "manual", enabled: true,
              })}>
                <Plus size={15} /> Add statistic
              </button>
            )}
          >
            {draft.stats.map((s, i) => (
              <Row key={s.id} index={i} total={draft.stats.length} title={s.label_mr}
                   onMove={(d) => moveItem("stats", i, d)} onRemove={() => removeItem("stats", i)}>
                <Bilingual label="Label" base="label" obj={s} required
                           onPatch={(v) => patchItem("stats", i, v)} max={MAX.label} />
                <Picker label="Value source" value={s.source} options={sourceOptions} required
                        onChange={(v) => patchItem("stats", i, { source: v })} />
                {s.source === "manual" ? (
                  <Bilingual label="Value" base="value" obj={s} required
                             onPatch={(v) => patchItem("stats", i, v)} max={MAX.value} />
                ) : (
                  <p className="a-field-note">
                    Counted when the page loads. Marathi digits are applied by the site.
                  </p>
                )}
                <label className="a-checkbox-label">
                  <input type="checkbox" className="a-checkbox" checked={s.enabled !== false}
                         onChange={(e) => patchItem("stats", i, { enabled: e.target.checked })} />
                  Show this statistic
                </label>
              </Row>
            ))}
          </Section>

          {/* ── D. Media & images ──────────────────────────────────────── */}
          <Section title="Media & Images" desc="The two photographs beside the hero copy, and the caption over them.">
            {["main", "small"].map((slot) => (
              <ImageSlot
                key={slot}
                slot={slot}
                img={draft.images[slot]}
                onPatch={(v) => patch("images", { [slot]: { ...draft.images[slot], ...v } })}
                onBrowse={() => setMediaPicker(slot)}
                maxAlt={MAX.alt}
              />
            ))}

            <div className="a-form-divider" />
            <Bilingual label="Image caption" base="caption" obj={draft.images}
                       onPatch={(v) => patch("images", v)} max={MAX.caption} />
            <div className="a-form-grid a-form-grid-2">
              <Picker label="Caption icon" value={draft.images.caption_icon} options={iconOptions}
                      onChange={(v) => patch("images", { caption_icon: v })} />
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox"
                       checked={draft.images.caption_enabled !== false}
                       onChange={(e) => patch("images", { caption_enabled: e.target.checked })} />
                Show the caption chip
              </label>
            </div>
          </Section>

          {/* ── E. Quick navigation ────────────────────────────────────── */}
          <Section
            title="Quick Navigation"
            desc="The row of shortcut links below the hero."
            action={draft.quicknav.length < 8 && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => addItem("quicknav", {
                id: newId("quick"), title_mr: "", title_en: "", desc_mr: "", desc_en: "",
                icon: "arrowRight", target: targetOptions[0]?.value ?? "#about", enabled: true,
              })}>
                <Plus size={15} /> Add quick link
              </button>
            )}
          >
            {draft.quicknav.map((q, i) => (
              <Row key={q.id} index={i} total={draft.quicknav.length} title={q.title_mr}
                   onMove={(d) => moveItem("quicknav", i, d)} onRemove={() => removeItem("quicknav", i)}>
                <Bilingual label="Title" base="title" obj={q} required
                           onPatch={(v) => patchItem("quicknav", i, v)} max={MAX.label} />
                <Bilingual label="Subtitle" base="desc" obj={q}
                           onPatch={(v) => patchItem("quicknav", i, v)} max={MAX.quickDesc} />
                <div className="a-form-grid a-form-grid-2">
                  <Picker label="Icon" value={q.icon} options={iconOptions}
                          onChange={(v) => patchItem("quicknav", i, { icon: v })} />
                  <Picker label="Destination" value={q.target} options={targetOptions} required
                          onChange={(v) => patchItem("quicknav", i, { target: v })} />
                </div>
                <label className="a-checkbox-label">
                  <input type="checkbox" className="a-checkbox" checked={q.enabled !== false}
                         onChange={(e) => patchItem("quicknav", i, { enabled: e.target.checked })} />
                  Show this link
                </label>
              </Row>
            ))}
          </Section>

          {/* ── F. Accessibility ───────────────────────────────────────── */}
          <Section
            title="Accessibility"
            desc="Screen readers announce the quick-link bar by this name. Alt text lives with each image above."
          >
            <Bilingual label="Quick-link bar label" base="quick_label" obj={draft.a11y}
                       onPatch={(v) => patch("a11y", v)} max={MAX.label} />
          </Section>
        </div>

        {/* ── G. Preview ───────────────────────────────────────────────── */}
        <aside className="a-form-side">
          <Section title="Preview" desc="How the draft reads on the site, in Marathi.">
            {draft.text.title_mr ? (
              <div className="a-mini-hero">
                {draft.text.eyebrow_mr && (
                  <p className="a-mini-eyebrow">
                    {draft.text.eyebrow_dot !== false && <span className="a-mini-dot" />}
                    {draft.text.eyebrow_mr}
                  </p>
                )}
                <h3 className="a-mini-title">{draft.text.title_mr}</h3>
                {draft.text.tagline_mr && <p className="a-mini-tagline">{draft.text.tagline_mr}</p>}
                {draft.text.desc_mr && <p className="a-mini-desc">{draft.text.desc_mr}</p>}
              </div>
            ) : (
              <p className="a-text-muted a-text-sm">Nothing to preview yet.</p>
            )}

            <div className="a-preview-actions a-mt-1">
              {draft.ctas.filter((c) => c.enabled !== false).map((c, i) => (
                <span key={c.id} className={`a-preview-btn ${i === 0 ? "is-primary" : ""}`}>
                  {c.label_mr || "Button"}
                </span>
              ))}
            </div>

            <div className="a-preview-facts">
              {draft.stats.filter((s) => s.enabled !== false).map((s) => (
                <div key={s.id} className="a-preview-fact">
                  <span className="a-preview-fact-label">{s.label_mr}</span>
                  <strong className="a-preview-fact-value">
                    {s.source === "manual" ? s.value_mr : <em className="a-text-muted">from database</em>}
                  </strong>
                </div>
              ))}
            </div>

            <div className="a-preview-quick">
              {draft.quicknav.filter((q) => q.enabled !== false).map((q) => (
                <div key={q.id} className="a-preview-quick-item">
                  <strong>{q.title_mr}</strong>
                  <span>{q.desc_mr}</span>
                </div>
              ))}
            </div>
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
          {dirty
            ? "Unsaved changes"
            : meta.has_unpublished_changes
              ? "Draft saved — not yet on the website"
              : "Everything published"}
        </span>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/hero")}>Cancel</button>
          <button className="a-btn a-btn-secondary" onClick={() => saveDraft()} disabled={saving || !dirty}>
            <Save size={16} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button className="a-btn a-btn-primary" onClick={() => saveDraft({ thenPublish: true })} disabled={saving}>
            <Rocket size={16} /> {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <MediaPicker
        slot={mediaPicker}
        onClose={() => setMediaPicker(null)}
        onPick={(asset) => {
          const img = draft.images[mediaPicker];
          patch("images", { [mediaPicker]: { ...img, media_id: asset.id, url: asset.url } });
          setMediaPicker(null);
        }}
      />

      <ConfirmModal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
        loading={saving}
        title="Discard draft"
        confirmLabel="Discard"
        loadingLabel="Discarding…"
        message="Throw away the draft and start again from the published version?"
        subMessage="The live website is not affected. Unsaved and saved draft edits are both lost."
      />
    </>
  );
}

// Reuses the existing media library rather than adding a second upload path.
function MediaPicker({ slot, onClose, onPick }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/media?limit=60")
      .then((res) => setAssets(res.data))
      .catch(() => toast.show("Could not load the media library", "bad"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { if (slot) load(); }, [slot, load]);

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload("/admin/media/upload", fd);
      toast.show("Image uploaded", "ok");
      onPick(res.data);
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <Modal open={!!slot} onClose={onClose}
           title={slot === "main" ? "Choose the main image" : "Choose the supporting image"}
           size="lg"
           footer={
             <>
               <button className="a-btn a-btn-ghost" onClick={onClose}>Cancel</button>
               <label className="a-btn a-btn-primary">
                 <UploadCloud size={16} /> {uploading ? "Uploading…" : "Upload new"}
                 <input type="file" accept="image/*" hidden onChange={upload} disabled={uploading} />
               </label>
             </>
           }>
      {loading ? (
        <div className="a-spinner">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="a-empty-state">
          <p className="a-empty-title">The media library is empty</p>
          <p className="a-text-muted a-text-sm">Upload an image to use it here.</p>
        </div>
      ) : (
        <div className="a-media-grid">
          {assets.map((a) => (
            <button key={a.id} type="button" className="a-media-pick" onClick={() => onPick(a)} title={a.original_name}>
              <img src={a.url} alt={a.alt_text || a.original_name} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
