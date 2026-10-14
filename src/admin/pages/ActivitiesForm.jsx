import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Rocket, Undo2, Plus, Trash2, ArrowUp, ArrowDown, X,
} from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// The whole Activities section on one page, grouped into cards.
//
// Limits here mirror src/modules/activities/activities.schema.js exactly. The
// browser catches mistakes early; the server is still what decides, and its
// field-level errors are shown against the same inputs.

const MAX = { badge: 80, title: 120, lead: 300, gainsLabel: 80, cardTitle: 160, gain: 60, cta: 80 };
const LIMITS = { items: 12, gains: 8 };

const newId = () => `act-${Math.random().toString(36).slice(2, 8)}`;
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

// The outcome pills under a card, edited as chips rather than one text box per
// value, which is what the section actually renders.
function GainsEditor({ label, items, onChange, max }) {
  const [entry, setEntry] = useState("");
  const full = items.length >= LIMITS.gains;

  const add = () => {
    const v = entry.trim();
    if (!v || full || items.includes(v)) return;
    onChange([...items, v]);
    setEntry("");
  };

  return (
    <div className="a-field">
      <label className="a-label">{label}</label>
      <div className="a-chip-row">
        {items.map((g, i) => (
          <span key={`${g}-${i}`} className="a-chip">
            {g}
            <button type="button" aria-label={`Remove ${g}`}
                    onClick={() => onChange(items.filter((_, n) => n !== i))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="a-flex a-gap-2">
        <input className="a-input" value={entry} maxLength={max}
               placeholder={full ? `At most ${LIMITS.gains}` : "Add an outcome…"}
               disabled={full}
               onChange={(e) => setEntry(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="a-btn a-btn-secondary" onClick={add} disabled={full}>
          Add
        </button>
      </div>
      <span className="a-field-note">{items.length}/{LIMITS.gains} outcomes</span>
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

export default function ActivitiesForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [options, setOptions] = useState({ icons: [], targets: [] });
  const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState({});
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
    if (draft.items.length === 0) e["items"] = "At least one activity is required";
    draft.items.forEach((it, i) => {
      if (blank(it.title_mr)) e[`items.${i}.title_mr`] = "A Marathi title is required";
    });
    return e;
  }, [draft]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  useEffect(() => {
    Promise.all([api.get("/admin/activities"), api.get("/admin/activities/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
        setOptions(opt.data);
      })
      .catch(() => toast.show("Could not load the Activities section", "bad"))
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

  const patchItem = useCallback((i, values) => {
    setDraft((d) => ({ ...d, items: d.items.map((it, n) => (n === i ? { ...it, ...values } : it)) }));
  }, []);

  const moveItem = useCallback((i, delta) => {
    setDraft((d) => {
      const list = [...d.items];
      const to = i + delta;
      if (to < 0 || to >= list.length) return d;
      [list[i], list[to]] = [list[to], list[i]];
      return { ...d, items: list };
    });
  }, []);

  async function save({ thenPublish = false } = {}) {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const res = await api.put("/admin/activities/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/activities/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.show("Published — the website is updated", "ok");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/activities");
      } catch (err) {
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
      const res = await api.post("/admin/activities/discard");
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
        Loading Activities section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Activities section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/activities")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone={dirty ? "warn" : meta.has_unpublished_changes ? "info" : "ok"}>
            {dirty ? "Unsaved changes" : meta.has_unpublished_changes ? "Draft" : "Published"}
          </Badge>
          <h1 className="a-page-title a-mt-1">Edit Activities Section</h1>
          <p className="a-page-desc">
            “प्रमुख उपक्रम” in full. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/activities")}>
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
          <Section title="Heading" desc="The label, title and the line beside them.">
            <Bilingual label="Top label" base="badge" obj={draft.text}
                       hint="The small line above the title."
                       onPatch={(v) => patch("text", v)} max={MAX.badge} />
            <Bilingual label="Section title" base="title" obj={draft.text} required
                       error={errFor("text.title_mr")}
                       onPatch={(v) => patch("text", v)} max={MAX.title} />
            <Bilingual label="Lead" base="lead" obj={draft.text} textarea
                       hint="The sentence to the right of the title."
                       onPatch={(v) => patch("text", v)} max={MAX.lead} />
            <Bilingual label="Outcomes label" base="gains_label" obj={draft.text}
                       hint="Printed above the pills on every card."
                       onPatch={(v) => patch("text", v)} max={MAX.gainsLabel} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          <Section
            title="Activity Cards"
            desc="The grid of activities. Numbering follows this order."
            action={draft.items.length < LIMITS.items && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDraft((d) => ({
                ...d,
                items: [...d.items, {
                  id: newId(), icon: options.icons[0] ?? "sparkle",
                  title_mr: "", title_en: "", gains_mr: [], gains_en: [], enabled: true,
                }],
              }))}>
                <Plus size={15} /> Add activity
              </button>
            )}
          >
            {errFor("items") && <p className="a-field-error">{errFor("items")}</p>}
            {draft.items.map((it, i) => (
              <Row key={it.id} index={i} total={draft.items.length} title={it.title_mr}
                   onMove={(d) => moveItem(i, d)}
                   onRemove={() => setDraft((d) => ({ ...d, items: d.items.filter((_, n) => n !== i) }))}>
                <Bilingual label="Activity title" base="title" obj={it} required
                           error={errFor(`items.${i}.title_mr`)}
                           onPatch={(v) => patchItem(i, v)} max={MAX.cardTitle} />
                <div className="a-form-grid a-form-grid-2">
                  <GainsEditor label="Outcomes (Marathi)" items={it.gains_mr ?? []} max={MAX.gain}
                               onChange={(gains_mr) => patchItem(i, { gains_mr })} />
                  <GainsEditor label="Outcomes (English)" items={it.gains_en ?? []} max={MAX.gain}
                               onChange={(gains_en) => patchItem(i, { gains_en })} />
                </div>
                <div className="a-form-grid a-form-grid-2">
                  <div className="a-field">
                    <label className="a-label">Icon</label>
                    <select className="a-input" value={it.icon}
                            onChange={(e) => patchItem(i, { icon: e.target.value })}>
                      {options.icons.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <label className="a-checkbox-label">
                    <input type="checkbox" className="a-checkbox" checked={it.enabled !== false}
                           onChange={(e) => patchItem(i, { enabled: e.target.checked })} />
                    Show this activity
                  </label>
                </div>
              </Row>
            ))}
          </Section>

          <Section title="Footer Button" desc="The link under the grid.">
            <Bilingual label="Button label" base="label" obj={draft.cta}
                       onPatch={(v) => patch("cta", v)} max={MAX.cta} />
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">Destination</label>
                <select className="a-input" value={draft.cta.target}
                        onChange={(e) => patch("cta", { target: e.target.value })}>
                  {options.targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span className="a-field-note">Only pages and sections that exist on the site.</span>
              </div>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={draft.cta.enabled !== false}
                       onChange={(e) => patch("cta", { enabled: e.target.checked })} />
                Show the button
              </label>
            </div>
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Preview" desc="How the section reads on the site, in Marathi.">
            {draft.text.badge_mr && (
              <p className="a-mini-eyebrow">
                {draft.text.eyebrow_dot !== false && <span className="a-mini-dot" />}
                {draft.text.badge_mr}
              </p>
            )}
            <h3 className="a-mini-title">{draft.text.title_mr || "—"}</h3>
            {draft.text.lead_mr && <p className="a-mini-desc">{draft.text.lead_mr}</p>}

            <div className="a-mini-cards">
              {draft.items.filter((i) => i.enabled !== false).map((it, i) => (
                <div key={it.id} className="a-mini-card">
                  <span className="a-mini-card-n">{String(i + 1).padStart(2, "0")}</span>
                  <strong className="a-mini-card-t">{it.title_mr || "—"}</strong>
                  {draft.text.gains_label_mr && (
                    <span className="a-mini-card-l">{draft.text.gains_label_mr}</span>
                  )}
                  <span className="a-mini-tags">
                    {(it.gains_mr ?? []).map((g, n) => <span key={n} className="a-chip">{g}</span>)}
                  </span>
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
          {invalid
            ? `${Object.keys(errors).length} field(s) need attention`
            : dirty
              ? "Unsaved changes"
              : meta.has_unpublished_changes
                ? "Draft saved — not yet on the website"
                : "Everything published"}
        </span>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/activities")}>Cancel</button>
          <button className="a-btn a-btn-secondary" onClick={() => save()} disabled={saving || !dirty || invalid}>
            <Save size={16} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button className="a-btn a-btn-primary" onClick={() => save({ thenPublish: true })} disabled={saving || invalid}>
            <Rocket size={16} /> {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

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
