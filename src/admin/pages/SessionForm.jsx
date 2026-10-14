import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Rocket, Undo2, Plus, Trash2, ArrowUp, ArrowDown,
} from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// The whole Session section on one page, grouped into cards.
//
// Limits here mirror src/modules/activities/activities.schema.js exactly. The
// browser catches mistakes early; the server is still what decides, and its
// field-level errors are shown against the same inputs.

const MAX = { badge: 80, title: 160, lead: 300, hourLabel: 80, minutes: 20, stepTitle: 120, stepDesc: 400 };
const LIMITS = { steps: 15, stepMinutes: 120 };

const newId = () => `ses-${Math.random().toString(36).slice(2, 8)}`;
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

export default function SessionForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
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
    if (draft.steps.length === 0) e["steps"] = "At least one step is required";
    draft.steps.forEach((s, i) => {
      if (blank(s.title_mr)) e[`steps.${i}.title_mr`] = "A Marathi title is required";
      const m = Number(s.min);
      if (!Number.isInteger(m) || m < 0) e[`steps.${i}.min`] = "Whole minutes, 0 or more";
      else if (m > LIMITS.stepMinutes) e[`steps.${i}.min`] = `At most ${LIMITS.stepMinutes} minutes`;
    });
    return e;
  }, [draft]);

  // Shown as guidance, never as a blocker: "approximately one hour" is
  // approximate, and a plan that runs long is a real choice, not a mistake.
  const totalMinutes = useMemo(
    () => (draft?.steps ?? []).filter((s) => s.enabled !== false)
      .reduce((n, s) => n + (Number(s.min) || 0), 0),
    [draft]
  );

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  useEffect(() => {
    api.get("/admin/session")
      .then((cfg) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
      })
      .catch(() => toast.show("Could not load the Session section", "bad"))
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

  async function save({ thenPublish = false } = {}) {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const res = await api.put("/admin/session/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/session/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.show("Published — the website is updated", "ok");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/session");
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
      const res = await api.post("/admin/session/discard");
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
        Loading Session section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Session section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/session")}>
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
          <h1 className="a-page-title a-mt-1">Edit Session Section</h1>
          <p className="a-page-desc">
            “प्रमुख उपक्रम” in full. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/session")}>
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
            <Bilingual label="Hour-breakdown label" base="hour_label" obj={draft.text}
                       hint="The caption over the proportional bar."
                       onPatch={(v) => patch("text", v)} max={MAX.hourLabel} />
            <Bilingual label="Minutes suffix" base="minutes" obj={draft.text}
                       hint="Printed after every duration, e.g. “मि.”."
                       onPatch={(v) => patch("text", v)} max={MAX.minutes} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          <Section
            title="Steps"
            desc="The ordered plan. Numbering follows this order, and the hour-breakdown bar is built from the steps that carry minutes."
            action={draft.steps.length < LIMITS.steps && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDraft((d) => ({
                ...d,
                steps: [...d.steps, {
                  id: newId(), min: 0, title_mr: "", title_en: "",
                  desc_mr: "", desc_en: "", enabled: true,
                }],
              }))}>
                <Plus size={15} /> Add step
              </button>
            )}
          >
            {errFor("steps") && <p className="a-field-error">{errFor("steps")}</p>}

            <div className={`a-notice ${totalMinutes === 60 ? "a-notice-ok" : "a-notice-info"} a-notice--tight`}>
              <div className="a-notice-body">
                <p className="a-notice-title">{totalMinutes} minutes in total</p>
                <p>
                  {totalMinutes === 60
                    ? "Adds up to the hour the heading promises."
                    : `The heading says about an hour. This is ${totalMinutes > 60 ? "longer" : "shorter"} — fine if deliberate.`}
                </p>
              </div>
            </div>

            {draft.steps.map((st, i) => (
              <Row key={st.id} index={i} total={draft.steps.length} title={st.title_mr}
                   onMove={(d) => moveStep(i, d)}
                   onRemove={() => setDraft((d) => ({ ...d, steps: d.steps.filter((_, n) => n !== i) }))}>
                <Bilingual label="Step title" base="title" obj={st} required
                           error={errFor(`steps.${i}.title_mr`)}
                           onPatch={(v) => patchStep(i, v)} max={MAX.stepTitle} />
                <Bilingual label="Description" base="desc" obj={st} textarea
                           onPatch={(v) => patchStep(i, v)} max={MAX.stepDesc} />
                <div className="a-form-grid a-form-grid-2">
                  <div className={`a-field ${errFor(`steps.${i}.min`) ? "has-error" : ""}`}>
                    <label className="a-label">Duration (minutes)</label>
                    <input className="a-input" type="number" min="0" max={LIMITS.stepMinutes}
                           value={st.min}
                           onChange={(e) => patchStep(i, { min: e.target.value === "" ? 0 : Number(e.target.value) })} />
                    {errFor(`steps.${i}.min`)
                      ? <span className="a-field-error">{errFor(`steps.${i}.min`)}</span>
                      : <span className="a-field-note">
                          {Number(st.min) > 0
                            ? "Counted in the hour-breakdown bar."
                            : "0 shows no clock and is left out of the bar — used for the prayer and the closing mantra."}
                        </span>}
                  </div>
                  <label className="a-checkbox-label">
                    <input type="checkbox" className="a-checkbox" checked={st.enabled !== false}
                           onChange={(e) => patchStep(i, { enabled: e.target.checked })} />
                    Show this step
                  </label>
                </div>
              </Row>
            ))}
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

            <div className="a-mini-bar">
              {draft.steps.filter((x) => x.enabled !== false && Number(x.min) > 0).map((x) => (
                <span key={x.id} className="a-mini-seg"
                      style={{ flexGrow: Number(x.min) || 1 }}
                      title={`${x.title_mr} — ${x.min}`}>
                  {x.min}
                </span>
              ))}
            </div>

            <ol className="a-mini-steps">
              {draft.steps.filter((x) => x.enabled !== false).map((x, i) => (
                <li key={x.id}>
                  <span className="a-mini-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong className="a-mini-step-t">{x.title_mr || "—"}</strong>
                    {Number(x.min) > 0 && (
                      <span className="a-mini-step-q">{x.min} {draft.text.minutes_mr}</span>
                    )}
                    {x.desc_mr && <span className="a-mini-step-d">{x.desc_mr}</span>}
                  </div>
                </li>
              ))}
            </ol>
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
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/session")}>Cancel</button>
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
