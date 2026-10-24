import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Rocket, Undo2, Plus, Trash2, ArrowUp, ArrowDown, Star,
} from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";

// The whole District Directory page wording on one page, grouped into cards.
//
// Limits here mirror src/modules/directory/directory.schema.js exactly. The
// browser catches mistakes early; the server is still what decides, and its
// field-level errors are shown against the same inputs.
//
// Three lines are templates: they carry a number or a name into the sentence,
// and dropping the placeholder would silently lose the value on the site. The
// editor blocks that the same way the server does.

const MAX = {
  badge: 80, title: 200, lead: 400, breadcrumb: 80, searchLabel: 120,
  placeholder: 120, districtLabel: 80, allDistricts: 80, count: 80, showing: 160,
  pagination: 80, noResults: 200, clearFilters: 80, division: 80, wholeDivision: 80,
  action: 40, pendingTitle: 120, pendingDesc: 600, official: 120, submitInfo: 120,
  stateNote: 200, stateRole: 120, roleLabel: 60, url: 300,
};
const LIMITS = { roles: 15 };

const TOKENS = {
  count_one: ["{n}"],
  count_many: ["{n}"],
  showing: ["{shown}", "{total}"],
  division_label: ["{name}"],
};

const newRoleId = () => `role-${Math.random().toString(36).slice(2, 8)}`;
const blank = (v) => !String(v ?? "").trim();
const missingTokens = (value, tokens) => tokens.filter((tk) => !String(value ?? "").includes(tk));

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

function Bilingual({ label, base, obj, onPatch, max, textarea, required, hint, errorFor }) {
  return (
    <div className="a-form-grid a-form-grid-2">
      <TextField label={`${label} (Marathi)`} required={required} hint={hint} max={max}
                 textarea={textarea} error={errorFor?.(`${base}_mr`)}
                 value={obj[`${base}_mr`]} onChange={(v) => onPatch({ [`${base}_mr`]: v })} />
      <TextField label={`${label} (English)`} max={max} textarea={textarea}
                 error={errorFor?.(`${base}_en`)}
                 value={obj[`${base}_en`]} onChange={(v) => onPatch({ [`${base}_en`]: v })} />
    </div>
  );
}

function Row({ index, total, title, badge, onMove, onRemove, children }) {
  return (
    <div className="a-row-card">
      <div className="a-row-head">
        <span className="a-row-index">{index + 1}</span>
        <span className="a-row-title">{title || <em className="a-text-muted">Untitled</em>}</span>
        {badge}
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

export default function DirectoryForm() {
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

    Object.entries(TOKENS).forEach(([base, tokens]) => {
      ["mr", "en"].forEach((l) => {
        const key = `${base}_${l}`;
        const value = draft.text[key];
        if (blank(value)) {
          e[`text.${key}`] = "This line is required";
          return;
        }
        const missing = missingTokens(value, tokens);
        if (missing.length) {
          e[`text.${key}`] = `Keep the placeholder${missing.length > 1 ? "s" : ""} ${missing.join(" and ")} in this line`;
        }
      });
    });

    if (draft.roles.length === 0) e["roles"] = "At least one role is required";
    draft.roles.forEach((r, i) => {
      if (blank(r.label_mr)) e[`roles.${i}.label_mr`] = "A Marathi label is required";
      if (!/^[a-zA-Z0-9_-]+$/.test(String(r.id ?? ""))) {
        e[`roles.${i}.id`] = "Letters, digits, hyphen and underscore only";
      }
    });

    ["official_url", "submit_form_url"].forEach((k) => {
      const v = String(draft.links[k] ?? "").trim();
      if (v && !/^https?:\/\/\S+$/i.test(v)) e[`links.${k}`] = "Enter a full http:// or https:// address";
    });
    const phone = String(draft.links.state_phone ?? "").trim();
    if (phone && !/^[0-9]{10}$/.test(phone)) e["links.state_phone"] = "Enter a 10-digit mobile number";

    return e;
  }, [draft]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];
  const textErr = (k) => errFor(`text.${k}`);

  // Contact records store a role id. Renaming an id here does not rewrite the
  // contacts, so the warning says what would actually happen on the page.
  const featuredCount = useMemo(
    () => (draft?.roles ?? []).filter((r) => r.featured).length,
    [draft]
  );

  useEffect(() => {
    api.get("/admin/directory")
      .then((cfg) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
      })
      .catch(() => toast.show("Could not load the Directory section", "bad"))
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

  const patchRole = useCallback((i, values) => {
    setDraft((d) => ({ ...d, roles: d.roles.map((r, n) => (n === i ? { ...r, ...values } : r)) }));
  }, []);

  const moveRole = useCallback((i, delta) => {
    setDraft((d) => {
      const list = [...d.roles];
      const to = i + delta;
      if (to < 0 || to >= list.length) return d;
      [list[i], list[to]] = [list[to], list[i]];
      return { ...d, roles: list };
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
        const res = await api.put("/admin/directory/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/directory/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.success("Published — the website is updated");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/directory");
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
      const res = await api.post("/admin/directory/discard");
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
        Loading Directory section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Directory section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/directory")}>
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
          <h1 className="a-page-title a-mt-1">Edit Directory Page</h1>
          <p className="a-page-desc">
            The wording around the coordinator cards. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/directory")}>
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
          <Section title="Heading" desc="The label, title and lead at the top of the page.">
            <Bilingual label="Top label" base="badge" obj={draft.text}
                       hint="The small line above the title."
                       onPatch={(v) => patch("text", v)} max={MAX.badge} errorFor={textErr} />
            <Bilingual label="Page title" base="title" obj={draft.text} required
                       onPatch={(v) => patch("text", v)} max={MAX.title} errorFor={textErr} />
            <Bilingual label="Lead" base="lead" obj={draft.text} textarea
                       onPatch={(v) => patch("text", v)} max={MAX.lead} errorFor={textErr} />
            <Bilingual label="Breadcrumb label" base="breadcrumb" obj={draft.text}
                       hint="Screen-reader name for the trail at the very top."
                       onPatch={(v) => patch("text", v)} max={MAX.breadcrumb} errorFor={textErr} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          <Section title="Search and filter" desc="The search box and the district dropdown above the list.">
            <Bilingual label="Search label" base="search_label" obj={draft.text}
                       hint="Screen-reader name for the search box."
                       onPatch={(v) => patch("text", v)} max={MAX.searchLabel} errorFor={textErr} />
            <Bilingual label="Search placeholder" base="search_placeholder" obj={draft.text}
                       hint="The grey hint inside the empty search box."
                       onPatch={(v) => patch("text", v)} max={MAX.placeholder} errorFor={textErr} />
            <Bilingual label="District label" base="district_label" obj={draft.text}
                       hint="Screen-reader name for the dropdown."
                       onPatch={(v) => patch("text", v)} max={MAX.districtLabel} errorFor={textErr} />
            <Bilingual label="“All districts” option" base="all_districts" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.allDistricts} errorFor={textErr} />
          </Section>

          <Section
            title="Counts and paging"
            desc="These lines carry a value, so they are written with a placeholder. Keep the placeholder — without it the number disappears on the site."
          >
            <div className="a-notice a-notice-info a-notice--tight">
              <div className="a-notice-body">
                <p className="a-notice-title">Placeholders</p>
                <p>
                  <code>{"{n}"}</code> the number of contacts · <code>{"{shown}"}</code> the range on
                  this page · <code>{"{total}"}</code> the total · <code>{"{name}"}</code> the division name.
                </p>
              </div>
            </div>
            <Bilingual label="Count — exactly one" base="count_one" obj={draft.text} required
                       hint="Used when a single contact matches."
                       onPatch={(v) => patch("text", v)} max={MAX.count} errorFor={textErr} />
            <Bilingual label="Count — two or more" base="count_many" obj={draft.text} required
                       hint="Used for every other number, including zero."
                       onPatch={(v) => patch("text", v)} max={MAX.count} errorFor={textErr} />
            <Bilingual label="Paging line" base="showing" obj={draft.text} required
                       hint="Shown under the list when there is more than one page."
                       onPatch={(v) => patch("text", v)} max={MAX.showing} errorFor={textErr} />
            <Bilingual label="Division heading" base="division_label" obj={draft.text} required
                       hint="The heading over each group of cards."
                       onPatch={(v) => patch("text", v)} max={MAX.division} errorFor={textErr} />
            <Bilingual label="Pagination label" base="pagination" obj={draft.text}
                       hint="Screen-reader name for the page buttons."
                       onPatch={(v) => patch("text", v)} max={MAX.pagination} errorFor={textErr} />
          </Section>

          <Section
            title="Roles"
            desc="The badge on each card. Order here is the order the cards are sorted in, and a starred role gets the wide card at the top of its division."
            action={draft.roles.length < LIMITS.roles && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDraft((d) => ({
                ...d,
                roles: [...d.roles, { id: newRoleId(), label_mr: "", label_en: "", featured: false }],
              }))}>
                <Plus size={15} /> Add role
              </button>
            )}
          >
            {errFor("roles") && <p className="a-field-error">{errFor("roles")}</p>}

            <div className="a-notice a-notice-warn a-notice--tight">
              <div className="a-notice-body">
                <p className="a-notice-title">The id must match what the contact records store</p>
                <p>
                  A contact carries its role as an id (e.g. <code>districtManager</code>), set under
                  Content › District Contacts. Changing an id here does not rewrite those records —
                  any contact still on the old id falls back to showing the raw id on its badge.
                  Renaming the label is always safe.
                </p>
              </div>
            </div>

            {featuredCount === 0 && (
              <div className="a-notice a-notice-info a-notice--tight">
                <div className="a-notice-body">
                  <p className="a-notice-title">No role is starred</p>
                  <p>Every card renders at the same width. Star a role to give it the wide card.</p>
                </div>
              </div>
            )}

            {draft.roles.map((r, i) => (
              <Row key={i} index={i} total={draft.roles.length} title={r.label_mr}
                   badge={r.featured ? <Badge tone="ok">Featured</Badge> : null}
                   onMove={(delta) => moveRole(i, delta)}
                   onRemove={() => setDraft((d) => ({ ...d, roles: d.roles.filter((_, n) => n !== i) }))}>
                <TextField label="Role id" max={64} required
                           hint="Must match the role stored on the contact records."
                           error={errFor(`roles.${i}.id`)}
                           value={r.id} onChange={(v) => patchRole(i, { id: v })} />
                <Bilingual label="Badge label" base="label" obj={r} required
                           errorFor={(k) => errFor(`roles.${i}.${k}`)}
                           onPatch={(v) => patchRole(i, v)} max={MAX.roleLabel} />
                <label className="a-checkbox-label">
                  <input type="checkbox" className="a-checkbox" checked={!!r.featured}
                         onChange={(e) => patchRole(i, { featured: e.target.checked })} />
                  <Star size={14} /> Give this role the wide card at the top of its division
                </label>
              </Row>
            ))}
          </Section>

          <Section title="Card labels" desc="Wording inside each coordinator card.">
            <Bilingual label="Whole-division note" base="whole_division" obj={draft.text}
                       hint="Shown instead of districts when someone covers a whole division."
                       onPatch={(v) => patch("text", v)} max={MAX.wholeDivision} errorFor={textErr} />
            <Bilingual label="Call label" base="call" obj={draft.text}
                       hint="Screen-reader name for the phone button."
                       onPatch={(v) => patch("text", v)} max={MAX.action} errorFor={textErr} />
            <Bilingual label="Email label" base="email" obj={draft.text}
                       hint="Screen-reader name for the email button."
                       onPatch={(v) => patch("text", v)} max={MAX.action} errorFor={textErr} />
          </Section>

          <Section title="Empty states" desc="What the page says when a search finds nothing, or when no contacts are published at all.">
            <Bilingual label="No results" base="no_results" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.noResults} errorFor={textErr} />
            <Bilingual label="Clear filters button" base="clear_filters" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.clearFilters} errorFor={textErr} />
            <Bilingual label="Nothing published — title" base="pending_title" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.pendingTitle} errorFor={textErr} />
            <Bilingual label="Nothing published — text" base="pending_desc" obj={draft.text} textarea
                       onPatch={(v) => patch("text", v)} max={MAX.pendingDesc} errorFor={textErr} />
            <Bilingual label="Official list button" base="official" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.official} errorFor={textErr} />
          </Section>

          <Section title="Footer note and links" desc="The state coordinator line, and the two external buttons.">
            <Bilingual label="Submit-info button" base="submit_info" obj={draft.text}
                       hint="Shown only when the form address below is filled in."
                       onPatch={(v) => patch("text", v)} max={MAX.submitInfo} errorFor={textErr} />
            <Bilingual label="Footer note" base="state_note" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.stateNote} errorFor={textErr} />
            <Bilingual label="State coordinator title" base="state_role" obj={draft.text}
                       onPatch={(v) => patch("text", v)} max={MAX.stateRole} errorFor={textErr} />
            <TextField label="Official district list address" max={MAX.url}
                       hint="Opens in a new tab. Shown when no contacts are published."
                       error={errFor("links.official_url")}
                       value={draft.links.official_url}
                       onChange={(v) => patch("links", { official_url: v })} />
            <TextField label="Submit-information form address" max={MAX.url}
                       hint="Opens in a new tab. Leave empty to hide the button, as the site does today."
                       error={errFor("links.submit_form_url")}
                       value={draft.links.submit_form_url}
                       onChange={(v) => patch("links", { submit_form_url: v })} />
            <TextField label="State coordinator phone" max={15}
                       hint="10 digits, no spaces. Leave empty to drop the phone link."
                       error={errFor("links.state_phone")}
                       value={draft.links.state_phone}
                       onChange={(v) => patch("links", { state_phone: v })} />
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Preview" desc="How the page reads on the site, in Marathi.">
            {draft.text.badge_mr && (
              <p className="a-mini-eyebrow">
                {draft.text.eyebrow_dot !== false && <span className="a-mini-dot" />}
                {draft.text.badge_mr}
              </p>
            )}
            <h3 className="a-mini-title">{draft.text.title_mr || "—"}</h3>
            {draft.text.lead_mr && <p className="a-mini-desc">{draft.text.lead_mr}</p>}

            <div className="a-view-list a-mt-1">
              <div className="a-view-row">
                <span className="a-view-label">Count</span>
                <div className="a-view-value">
                  {String(draft.text.count_many_mr ?? "").replaceAll("{n}", "१०३")}
                </div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Division</span>
                <div className="a-view-value">
                  {String(draft.text.division_label_mr ?? "").replaceAll("{name}", "कोंकण")}
                </div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Paging</span>
                <div className="a-view-value">
                  {String(draft.text.showing_mr ?? "")
                    .replaceAll("{shown}", "१–८")
                    .replaceAll("{total}", "१०३")}
                </div>
              </div>
            </div>

            <ol className="a-mini-steps">
              {draft.roles.map((r, i) => (
                <li key={i}>
                  <span className="a-mini-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong className="a-mini-step-t">{r.label_mr || "—"}</strong>
                    <span className="a-mini-step-q">{r.id}</span>
                    {r.featured && <span className="a-mini-step-d">Wide card</span>}
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
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/directory")}>Cancel</button>
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
