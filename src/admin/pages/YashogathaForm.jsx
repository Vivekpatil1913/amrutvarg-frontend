import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Rocket, Undo2,
} from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";

// The whole Yashogatha section on one page, grouped into cards.
//
// Limits here mirror src/modules/activities/activities.schema.js exactly. The
// browser catches mistakes early; the server is still what decides, and its
// field-level errors are shown against the same inputs.

const MAX = {
  badge: 80, title: 120, lead: 300, readMore: 60, viewAll: 80,
  sampleTag: 60, noStories: 200, note: 400,
};
const LIMITS = { featured: 12 };

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

export default function YashogathaForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
    const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [options, setOptions] = useState({ targets: [] });
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
    if (blank(draft.labels.read_more_mr)) e["labels.read_more_mr"] = "A Marathi label is required";
    if (blank(draft.labels.view_all_mr)) e["labels.view_all_mr"] = "A Marathi label is required";
    const n = Number(draft.homepage.featured_count);
    if (!Number.isInteger(n) || n < 1) e["homepage.featured_count"] = "Show at least one story";
    else if (n > LIMITS.featured) e["homepage.featured_count"] = `At most ${LIMITS.featured}`;
    return e;
  }, [draft]);


  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  useEffect(() => {
    Promise.all([api.get("/admin/yashogatha"), api.get("/admin/yashogatha/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
        setOptions(opt.data);
      })
      .catch(() => toast.show("Could not load the Yashogatha section", "bad"))
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


  async function save({ thenPublish = false } = {}) {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const res = await api.put("/admin/yashogatha/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/yashogatha/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.success("Published — the website is updated");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/yashogatha");
      } catch (err) {
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.error(errorMessage(err));
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function discard() {
    await mutate(async () => {
      const res = await api.post("/admin/yashogatha/discard");
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
        Loading Yashogatha section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Yashogatha section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/yashogatha")}>
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
          <h1 className="a-page-title a-mt-1">Edit Yashogatha Section</h1>
          <p className="a-page-desc">
            “प्रमुख उपक्रम” in full. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/yashogatha")}>
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
          <Section title="Heading" desc="The label, title and lead shown above the stories.">
            <Bilingual label="Top label" base="badge" obj={draft.text}
                       hint="The small line above the heading."
                       onPatch={(v) => patch("text", v)} max={MAX.badge} />
            <Bilingual label="Heading" base="title" obj={draft.text} required
                       error={errFor("text.title_mr")}
                       onPatch={(v) => patch("text", v)} max={MAX.title} />
            <Bilingual label="Lead" base="lead" obj={draft.text} textarea
                       hint="The sentence under the heading."
                       onPatch={(v) => patch("text", v)} max={MAX.lead} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          <Section title="Labels" desc="Button and tag text used across the story pages.">
            <Bilingual label="Read-more button" base="read_more" obj={draft.labels} required
                       hint="On every story card."
                       error={errFor("labels.read_more_mr")}
                       onPatch={(v) => patch("labels", v)} max={MAX.readMore} />
            <Bilingual label="View-all button" base="view_all" obj={draft.labels} required
                       hint="Under the home page strip."
                       error={errFor("labels.view_all_mr")}
                       onPatch={(v) => patch("labels", v)} max={MAX.viewAll} />
            <Bilingual label="Sample tag" base="sample_tag" obj={draft.labels}
                       hint="The badge beside a story's category."
                       onPatch={(v) => patch("labels", v)} max={MAX.sampleTag} />
            <Bilingual label="Empty-state message" base="no_stories" obj={draft.labels}
                       hint="Shown when no story is published."
                       onPatch={(v) => patch("labels", v)} max={MAX.noStories} />
          </Section>

          <Section title="Story-page disclaimer" desc="The notice above a story's body.">
            <Bilingual label="Disclaimer" base="text" obj={draft.detail_note} textarea
                       onPatch={(v) => patch("detail_note", v)} max={MAX.note} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.detail_note.enabled !== false}
                     onChange={(e) => patch("detail_note", { enabled: e.target.checked })} />
              Show the disclaimer on story pages
            </label>
          </Section>

          <Section title="Home page strip" desc="The featured stories shown on the home page.">
            <div className="a-notice a-notice-info a-notice--tight">
              <div className="a-notice-body">
                <p className="a-notice-title">Stories are managed elsewhere</p>
                <p>
                  Which stories appear is decided by the Featured flag on each record in
                  Yashogatha Stories. This only sets how many of them the strip shows.
                </p>
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className={`a-field ${errFor("homepage.featured_count") ? "has-error" : ""}`}>
                <label className="a-label a-label-required">Stories to show</label>
                <input className="a-input" type="number" min="1" max={LIMITS.featured}
                       value={draft.homepage.featured_count}
                       onChange={(e) => patch("homepage", {
                         featured_count: e.target.value === "" ? 1 : Number(e.target.value),
                       })} />
                {errFor("homepage.featured_count")
                  ? <span className="a-field-error">{errFor("homepage.featured_count")}</span>
                  : <span className="a-field-note">Featured stories, most recent first.</span>}
              </div>
              <div className="a-field">
                <label className="a-label a-label-required">View-all destination</label>
                <select className="a-input" value={draft.homepage.view_all_target}
                        onChange={(e) => patch("homepage", { view_all_target: e.target.value })}>
                  {options.targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.homepage.enabled !== false}
                     onChange={(e) => patch("homepage", { enabled: e.target.checked })} />
              Show the strip on the home page
            </label>
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
              <div className="a-mini-card">
                <strong className="a-mini-card-t">Story title</strong>
                <span className="a-mini-card-l">A story's short description sits here.</span>
                <span className="a-mini-tags">
                  <span className="a-chip">{draft.labels.read_more_mr || "—"}</span>
                </span>
              </div>
            </div>
            <div className="a-preview-actions a-mt-1">
              <span className="a-preview-btn is-primary">{draft.labels.view_all_mr || "—"}</span>
            </div>
            {draft.detail_note.enabled !== false && draft.detail_note.text_mr && (
              <p className="a-field-note a-mt-1">{draft.detail_note.text_mr}</p>
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
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/yashogatha")}>Cancel</button>
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
        confirmLabel="Discard"
        loadingLabel="Discarding…"
        message="Throw away the draft and start again from the published version?"
        subMessage="The live website is not affected."
      />
    </>
  );
}
