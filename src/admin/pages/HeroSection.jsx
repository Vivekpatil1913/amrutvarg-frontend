import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Save, UploadCloud, Rocket, Undo2, Plus, Trash2, ArrowUp, ArrowDown, Eye,
} from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const TABS = [
  { key: "general", label: "General Content" },
  { key: "ctas", label: "CTA Buttons" },
  { key: "stats", label: "Statistics" },
  { key: "media", label: "Media & Images" },
  { key: "quicknav", label: "Quick Navigation" },
  { key: "a11y", label: "Accessibility" },
  { key: "publish", label: "Preview & Publish" },
];

const MAX = {
  eyebrow: 160, title: 80, tagline: 200, desc: 600,
  label: 80, value: 80, quickDesc: 160, alt: 300, caption: 160,
};

const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// ── Small field helpers ──────────────────────────────────────────────────────

function Field({ label, required, hint, children }) {
  return (
    <div className="a-field">
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {children}
      {hint && <span className="a-field-help">{hint}</span>}
    </div>
  );
}

function TextField({ label, value, onChange, max, required, textarea, rows = 3, placeholder }) {
  const over = value.length > max;
  return (
    <Field label={label} required={required}>
      {textarea ? (
        <textarea
          className="a-input a-textarea"
          rows={rows}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="a-input"
          value={value}
          maxLength={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <span className={`a-char-count ${over ? "a-field-error" : ""}`}>{value.length} / {max}</span>
    </Field>
  );
}

// Marathi beside English, the way every other bilingual record in this CMS is
// edited.
function BilingualRow({ label, base, obj, onPatch, max, textarea, required }) {
  return (
    <div className="a-form-grid a-form-grid-2">
      <TextField
        label={`${label} (Marathi)`}
        required={required}
        value={obj[`${base}_mr`] ?? ""}
        onChange={(v) => onPatch({ [`${base}_mr`]: v })}
        max={max}
        textarea={textarea}
      />
      <TextField
        label={`${label} (English)`}
        value={obj[`${base}_en`] ?? ""}
        onChange={(v) => onPatch({ [`${base}_en`]: v })}
        max={max}
        textarea={textarea}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <Field label={label} required={required}>
      <select className="a-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

// A repeatable item: header with order controls, enable switch and delete.
function ItemCard({ index, total, title, enabled, onToggle, onMove, onDelete, children }) {
  return (
    <div className="a-card a-item-card">
      <div className="a-item-head">
        <span className="a-item-index">{index + 1}</span>
        <span className="a-item-title">{title || <em className="a-text-muted">Untitled</em>}</span>
        <div className="a-item-tools">
          <Switch on={enabled} onToggle={onToggle} />
          <button type="button" className="a-action-btn" disabled={index === 0}
                  onClick={() => onMove(-1)} title="Move up">
            <ArrowUp size={15} />
          </button>
          <button type="button" className="a-action-btn" disabled={index === total - 1}
                  onClick={() => onMove(1)} title="Move down">
            <ArrowDown size={15} />
          </button>
          <button type="button" className="a-action-btn danger" onClick={onDelete} title="Remove">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="a-item-body">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HeroSection() {
  const toast = useToast();
  const [tab, setTab] = useState("general");
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);     // last persisted draft
  const [options, setOptions] = useState({ icons: [], targets: [], statSources: [] });
  const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [mediaPicker, setMediaPicker] = useState(null); // 'main' | 'small'
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

  // Warns on tab close while edits are unsaved; in-app navigation is guarded by
  // the banner, since this router has no blocker API wired up.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = useCallback((section, values) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...values } }));
  }, []);

  const patchList = useCallback((key, index, values) => {
    setDraft((d) => ({
      ...d,
      [key]: d[key].map((item, i) => (i === index ? { ...item, ...values } : item)),
    }));
  }, []);

  const moveItem = useCallback((key, index, delta) => {
    setDraft((d) => {
      const list = [...d[key]];
      const to = index + delta;
      if (to < 0 || to >= list.length) return d;
      [list[index], list[to]] = [list[to], list[index]];
      return { ...d, [key]: list };
    });
  }, []);

  const removeItem = useCallback((key, index) => {
    setDraft((d) => ({ ...d, [key]: d[key].filter((_, i) => i !== index) }));
  }, []);

  const addItem = useCallback((key, item) => {
    setDraft((d) => ({ ...d, [key]: [...d[key], item] }));
  }, []);

  async function saveDraft() {
    await mutate(async () => {
      const res = await api.put("/admin/hero/draft", draft);
      setSaved(res.data.draft);
      setDraft(res.data.draft);
      setMeta((m) => ({ ...m, has_unpublished_changes: true }));
      toast.show("Draft saved — not yet live", "ok");
    });
  }

  async function publish() {
    await mutate(async () => {
      if (dirty) {
        const res = await api.put("/admin/hero/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
      }
      const res = await api.post("/admin/hero/publish");
      setMeta({ published_at: res.data.published_at, has_unpublished_changes: false });
      toast.show("Published — the website is updated", "ok");
    });
  }

  async function discard() {
    await mutate(async () => {
      const res = await api.post("/admin/hero/discard");
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
        Loading hero section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Hero section unavailable</p>
      </div>
    );
  }

  const iconOptions = options.icons.map((i) => ({ value: i, label: i }));
  const targetOptions = options.targets;
  const sourceOptions = options.statSources;

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Amrut Varg Hero</h1>
          <p className="a-page-desc">Homepage hero — heading, buttons, statistics, images and quick links</p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-ghost" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} /> Preview
          </button>
          <button className="a-btn a-btn-secondary" onClick={saveDraft} disabled={saving || !dirty}>
            <Save size={16} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button className="a-btn a-btn-primary" onClick={publish} disabled={saving}>
            <Rocket size={16} /> Publish
          </button>
        </div>
      </div>

      {(dirty || meta.has_unpublished_changes) && (
        <div className={`a-notice ${dirty ? "a-notice-warn" : "a-notice-info"}`}>
          <div className="a-notice-body">
            <p className="a-notice-title">
              {dirty ? "Unsaved changes" : "Saved draft is not published"}
            </p>
            <p>
              {dirty
                ? "Your edits are only in this browser. Save the draft, then publish to put them on the website."
                : "The saved draft differs from what visitors see. Publish to make it live."}
            </p>
          </div>
          <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => setConfirmDiscard(true)}>
            <Undo2 size={15} /> Discard draft
          </button>
        </div>
      )}

      <div className="a-tabs">
        {TABS.map((tb) => (
          <button key={tb.key} className={`a-tab ${tab === tb.key ? "active" : ""}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      <div className="a-card a-form-wrap">
        {/* ── General ─────────────────────────────────────────────────── */}
        {tab === "general" && (
          <div className="a-form-section">
            <BilingualRow label="Top label" base="eyebrow" obj={draft.text}
                          onPatch={(v) => patch("text", v)} max={MAX.eyebrow} />
            <BilingualRow label="Main heading" base="title" obj={draft.text} required
                          onPatch={(v) => patch("text", v)} max={MAX.title} />
            <BilingualRow label="Subheading" base="tagline" obj={draft.text}
                          onPatch={(v) => patch("text", v)} max={MAX.tagline} />
            <BilingualRow label="Description" base="desc" obj={draft.text} textarea
                          onPatch={(v) => patch("text", v)} max={MAX.desc} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </div>
        )}

        {/* ── CTAs ────────────────────────────────────────────────────── */}
        {tab === "ctas" && (
          <div className="a-form-section">
            <p className="a-field-help">
              The first button renders as the solid primary action, the second as the outlined one.
              Destinations come from the pages and sections that exist on the site.
            </p>
            {draft.ctas.length === 0 && (
              <div className="a-empty-state"><p className="a-empty-title">No buttons — the hero will show none</p></div>
            )}
            {draft.ctas.map((c, i) => (
              <ItemCard key={c.id} index={i} total={draft.ctas.length} title={c.label_mr}
                        enabled={c.enabled !== false}
                        onToggle={() => patchList("ctas", i, { enabled: c.enabled === false })}
                        onMove={(d) => moveItem("ctas", i, d)}
                        onDelete={() => removeItem("ctas", i)}>
                <BilingualRow label="Button label" base="label" obj={c} required
                              onPatch={(v) => patchList("ctas", i, v)} max={MAX.label} />
                <div className="a-form-grid a-form-grid-2">
                  <Select label="Icon" value={c.icon} options={iconOptions}
                          onChange={(v) => patchList("ctas", i, { icon: v })} />
                  <Select label="Destination" value={c.target} options={targetOptions}
                          onChange={(v) => patchList("ctas", i, { target: v })} />
                </div>
              </ItemCard>
            ))}
            {draft.ctas.length < 2 && (
              <button className="a-btn a-btn-secondary" onClick={() => addItem("ctas", {
                id: newId("cta"), label_mr: "", label_en: "", icon: "arrowRight",
                target: targetOptions[0]?.value ?? "#about", enabled: true,
              })}>
                <Plus size={16} /> Add button
              </button>
            )}
          </div>
        )}

        {/* ── Statistics ──────────────────────────────────────────────── */}
        {tab === "stats" && (
          <div className="a-form-section">
            <p className="a-field-help">
              A counted card takes its number straight from the database, so it can never
              go stale. Manual cards show whatever text you type.
            </p>
            {draft.stats.map((s, i) => (
              <ItemCard key={s.id} index={i} total={draft.stats.length} title={s.label_mr}
                        enabled={s.enabled !== false}
                        onToggle={() => patchList("stats", i, { enabled: s.enabled === false })}
                        onMove={(d) => moveItem("stats", i, d)}
                        onDelete={() => removeItem("stats", i)}>
                <BilingualRow label="Label" base="label" obj={s} required
                              onPatch={(v) => patchList("stats", i, v)} max={MAX.label} />
                <Select label="Value source" value={s.source} options={sourceOptions}
                        onChange={(v) => patchList("stats", i, { source: v })} />
                {s.source === "manual" ? (
                  <BilingualRow label="Value" base="value" obj={s} required
                                onPatch={(v) => patchList("stats", i, v)} max={MAX.value} />
                ) : (
                  <p className="a-field-help">
                    Counted from the database when the page loads. Marathi digits are applied by the site.
                  </p>
                )}
              </ItemCard>
            ))}
            {draft.stats.length < 8 && (
              <button className="a-btn a-btn-secondary" onClick={() => addItem("stats", {
                id: newId("stat"), label_mr: "", label_en: "", value_mr: "", value_en: "",
                source: "manual", enabled: true,
              })}>
                <Plus size={16} /> Add statistic
              </button>
            )}
          </div>
        )}

        {/* ── Media ───────────────────────────────────────────────────── */}
        {tab === "media" && (
          <div className="a-form-section">
            {["main", "small"].map((slot) => {
              const img = draft.images[slot];
              return (
                <div key={slot} className="a-card a-item-card">
                  <div className="a-item-head">
                    <span className="a-item-title">
                      {slot === "main" ? "Main image (circular)" : "Supporting image (card)"}
                    </span>
                    <div className="a-item-tools">
                      <Switch on={img.enabled !== false}
                              onToggle={() => patch("images", { [slot]: { ...img, enabled: img.enabled === false } })} />
                    </div>
                  </div>
                  <div className="a-item-body">
                    <div className="a-media-row">
                      <div className="a-media-thumb">
                        {img.url
                          ? <img src={img.url} alt="" />
                          : <span className="a-text-muted a-text-xs">Using the bundled photograph</span>}
                      </div>
                      <div className="a-flex a-gap-2">
                        <button className="a-btn a-btn-secondary" onClick={() => setMediaPicker(slot)}>
                          <UploadCloud size={16} /> Choose from library
                        </button>
                        {img.url && (
                          <button className="a-btn a-btn-ghost"
                                  onClick={() => patch("images", { [slot]: { ...img, media_id: null, url: "" } })}>
                            Reset to bundled
                          </button>
                        )}
                      </div>
                    </div>
                    <BilingualRow label="Alt text" base="alt" obj={img}
                                  onPatch={(v) => patch("images", { [slot]: { ...img, ...v } })}
                                  max={MAX.alt} />
                  </div>
                </div>
              );
            })}

            <div className="a-form-divider" />
            <BilingualRow label="Image caption" base="caption" obj={draft.images}
                          onPatch={(v) => patch("images", v)} max={MAX.caption} />
            <div className="a-form-grid a-form-grid-2">
              <Select label="Caption icon" value={draft.images.caption_icon} options={iconOptions}
                      onChange={(v) => patch("images", { caption_icon: v })} />
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox"
                       checked={draft.images.caption_enabled !== false}
                       onChange={(e) => patch("images", { caption_enabled: e.target.checked })} />
                Show the caption chip
              </label>
            </div>
          </div>
        )}

        {/* ── Quick navigation ────────────────────────────────────────── */}
        {tab === "quicknav" && (
          <div className="a-form-section">
            {draft.quicknav.map((q, i) => (
              <ItemCard key={q.id} index={i} total={draft.quicknav.length} title={q.title_mr}
                        enabled={q.enabled !== false}
                        onToggle={() => patchList("quicknav", i, { enabled: q.enabled === false })}
                        onMove={(d) => moveItem("quicknav", i, d)}
                        onDelete={() => removeItem("quicknav", i)}>
                <BilingualRow label="Title" base="title" obj={q} required
                              onPatch={(v) => patchList("quicknav", i, v)} max={MAX.label} />
                <BilingualRow label="Subtitle" base="desc" obj={q}
                              onPatch={(v) => patchList("quicknav", i, v)} max={MAX.quickDesc} />
                <div className="a-form-grid a-form-grid-2">
                  <Select label="Icon" value={q.icon} options={iconOptions}
                          onChange={(v) => patchList("quicknav", i, { icon: v })} />
                  <Select label="Destination" value={q.target} options={targetOptions}
                          onChange={(v) => patchList("quicknav", i, { target: v })} />
                </div>
              </ItemCard>
            ))}
            {draft.quicknav.length < 8 && (
              <button className="a-btn a-btn-secondary" onClick={() => addItem("quicknav", {
                id: newId("quick"), title_mr: "", title_en: "", desc_mr: "", desc_en: "",
                icon: "arrowRight", target: targetOptions[0]?.value ?? "#about", enabled: true,
              })}>
                <Plus size={16} /> Add quick link
              </button>
            )}
          </div>
        )}

        {/* ── Accessibility ───────────────────────────────────────────── */}
        {tab === "a11y" && (
          <div className="a-form-section">
            <p className="a-field-help">
              Screen readers announce the quick-link bar by this name. Alt text for the
              two photographs lives on the Media &amp; Images tab.
            </p>
            <BilingualRow label="Quick-link bar label" base="quick_label" obj={draft.a11y}
                          onPatch={(v) => patch("a11y", v)} max={MAX.label} />
          </div>
        )}

        {/* ── Publish ─────────────────────────────────────────────────── */}
        {tab === "publish" && (
          <div className="a-form-section">
            <div className="a-view-list">
              <div className="a-view-row">
                <span className="a-view-label">Status</span>
                <div className="a-view-value">
                  {dirty
                    ? <Badge tone="warn">Unsaved changes</Badge>
                    : meta.has_unpublished_changes
                      ? <Badge tone="info">Draft saved, not published</Badge>
                      : <Badge tone="ok">Published — matches the live site</Badge>}
                </div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Last published</span>
                <div className="a-view-value">
                  {meta.published_at ? new Date(meta.published_at).toLocaleString("en-IN") : "—"}
                </div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Enabled items</span>
                <div className="a-view-value">
                  {draft.ctas.filter((c) => c.enabled !== false).length} buttons ·{" "}
                  {draft.stats.filter((s) => s.enabled !== false).length} statistics ·{" "}
                  {draft.quicknav.filter((q) => q.enabled !== false).length} quick links
                </div>
              </div>
            </div>
            <div className="a-flex a-gap-2 a-mt-2">
              <button className="a-btn a-btn-ghost" onClick={() => setPreviewOpen(true)}>
                <Eye size={16} /> Preview draft
              </button>
              <button className="a-btn a-btn-primary" onClick={publish} disabled={saving}>
                <Rocket size={16} /> {saving ? "Publishing…" : "Publish to website"}
              </button>
            </div>
          </div>
        )}
      </div>

      <HeroPreview open={previewOpen} onClose={() => setPreviewOpen(false)} draft={draft} />

      <MediaPicker
        slot={mediaPicker}
        onClose={() => setMediaPicker(null)}
        onPick={(asset) => {
          const img = draft.images[mediaPicker];
          patch("images", {
            [mediaPicker]: { ...img, media_id: asset.id, url: asset.url },
          });
          setMediaPicker(null);
        }}
      />

      <ConfirmModal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
        loading={saving}
        title="Discard draft"
        message="Throw away the draft and start again from the published version?"
        subMessage="The live website is not affected. Unsaved and saved draft edits are both lost."
      />
    </>
  );
}

// ── Preview ──────────────────────────────────────────────────────────────────

// Shows the draft the way the website arranges it: Marathi, enabled items only,
// in the configured order.
function HeroPreview({ open, onClose, draft }) {
  if (!draft) return null;
  const on = (list) => list.filter((i) => i.enabled !== false);

  return (
    <Modal open={open} onClose={onClose} title="Hero preview (Marathi, draft)" size="xl"
           footer={<button className="a-btn a-btn-ghost" onClick={onClose}>Close</button>}>
      <div className="a-preview">
        {draft.text.eyebrow_mr && <p className="a-preview-eyebrow">{draft.text.eyebrow_mr}</p>}
        <h2 className="a-preview-title">{draft.text.title_mr}</h2>
        {draft.text.tagline_mr && <p className="a-preview-tagline">{draft.text.tagline_mr}</p>}
        {draft.text.desc_mr && <p className="a-preview-desc">{draft.text.desc_mr}</p>}

        <div className="a-preview-actions">
          {on(draft.ctas).map((c, i) => (
            <span key={c.id} className={`a-preview-btn ${i === 0 ? "is-primary" : ""}`}>{c.label_mr}</span>
          ))}
        </div>

        <div className="a-preview-facts">
          {on(draft.stats).map((s) => (
            <div key={s.id} className="a-preview-fact">
              <span className="a-preview-fact-label">{s.label_mr}</span>
              <strong className="a-preview-fact-value">
                {s.source === "manual" ? s.value_mr : <em className="a-text-muted">from database</em>}
              </strong>
            </div>
          ))}
        </div>

        <div className="a-preview-quick">
          {on(draft.quicknav).map((q) => (
            <div key={q.id} className="a-preview-quick-item">
              <strong>{q.title_mr}</strong>
              <span>{q.desc_mr}</span>
              <code className="a-text-xs a-text-muted">{q.target}</code>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ── Media picker ─────────────────────────────────────────────────────────────

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
      toast.show(err.message || "Upload failed", "bad");
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
