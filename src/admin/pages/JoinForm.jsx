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
import { errorMessage } from "../lib/errors.js";

// The whole Join section on one page, grouped into cards.
//
// Limits here mirror src/modules/join/join.schema.js exactly. The browser
// catches mistakes early; the server is still what decides, and its field-level
// errors are shown against the same inputs.
//
// The icon and action lists come from /admin/join/options rather than being
// retyped here, so the picker cannot offer something the server would reject.

const MAX = {
  badge: 80, title: 160, lead: 400, needsLabel: 80,
  cardTitle: 120, cardDesc: 600, note: 400, linkLabel: 80, linkUrl: 300,
  action: 80, chip: 60,
};
const LIMITS = { cards: 6, chips: 8 };

const newCardId = () => `join-${Math.random().toString(36).slice(2, 8)}`;
const newChipId = () => `need-${Math.random().toString(36).slice(2, 8)}`;
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

export default function JoinForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [options, setOptions] = useState({ icons: [], actions: [] });
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
    if (draft.cards.length === 0) e["cards"] = "At least one card is required";
    draft.cards.forEach((c, i) => {
      if (blank(c.title_mr)) e[`cards.${i}.title_mr`] = "A Marathi title is required";
      if (blank(c.action_mr)) e[`cards.${i}.action_mr`] = "A Marathi button label is required";
      const url = String(c.link_url ?? "").trim();
      if (url && !/^https?:\/\/\S+$/i.test(url)) {
        e[`cards.${i}.link_url`] = "Enter a full http:// or https:// address";
      } else if (url && blank(c.link_label_mr)) {
        e[`cards.${i}.link_label_mr`] = "A link address needs a Marathi link label";
      } else if (!url && !blank(c.link_label_mr)) {
        e[`cards.${i}.link_url`] = "A link label needs a link address";
      }
      (c.needs ?? []).forEach((n, k) => {
        if (blank(n.label_mr)) e[`cards.${i}.needs.${k}.label_mr`] = "A Marathi label is required";
      });
    });
    return e;
  }, [draft]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  // Each action is wired to one handler on the homepage, so two cards claiming
  // the same one means the second is unreachable from the navigation. Shown as
  // guidance rather than a blocker — the server allows it.
  const duplicateActions = useMemo(() => {
    const seen = new Map();
    (draft?.cards ?? []).filter((c) => c.enabled !== false)
      .forEach((c) => seen.set(c.action, (seen.get(c.action) ?? 0) + 1));
    return [...seen.entries()].filter(([, n]) => n > 1).map(([a]) => a);
  }, [draft]);

  useEffect(() => {
    Promise.all([api.get("/admin/join"), api.get("/admin/join/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setOptions(opt.data);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
      })
      .catch(() => toast.show("Could not load the Join section", "bad"))
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

  const patchCard = useCallback((i, values) => {
    setDraft((d) => ({ ...d, cards: d.cards.map((c, n) => (n === i ? { ...c, ...values } : c)) }));
  }, []);

  const moveCard = useCallback((i, delta) => {
    setDraft((d) => {
      const list = [...d.cards];
      const to = i + delta;
      if (to < 0 || to >= list.length) return d;
      [list[i], list[to]] = [list[to], list[i]];
      return { ...d, cards: list };
    });
  }, []);

  const patchChip = useCallback((cardIndex, chipIndex, values) => {
    setDraft((d) => ({
      ...d,
      cards: d.cards.map((c, n) => (n === cardIndex
        ? { ...c, needs: c.needs.map((x, k) => (k === chipIndex ? { ...x, ...values } : x)) }
        : c)),
    }));
  }, []);

  async function save({ thenPublish = false } = {}) {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const res = await api.put("/admin/join/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/join/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.success("Published — the website is updated");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/join");
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
      const res = await api.post("/admin/join/discard");
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
        Loading Join section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Join section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/join")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const actionLabel = (value) =>
    options.actions.find((a) => a.value === value)?.label ?? value;

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone={dirty ? "warn" : meta.has_unpublished_changes ? "info" : "ok"}>
            {dirty ? "Unsaved changes" : meta.has_unpublished_changes ? "Draft" : "Published"}
          </Badge>
          <h1 className="a-page-title a-mt-1">Edit Join Section</h1>
          <p className="a-page-desc">
            “अमृत वर्गात सहभागी व्हा” in full. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/join")}>
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
            <Bilingual label="Required-details label" base="needs_label" obj={draft.text}
                       hint="The caption over the chips on each card."
                       onPatch={(v) => patch("text", v)} max={MAX.needsLabel} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          <Section
            title="Registration cards"
            desc="One card per registration route. Numbering follows this order, and each card's button opens the flow chosen below."
            action={draft.cards.length < LIMITS.cards && (
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={() => setDraft((d) => ({
                ...d,
                cards: [...d.cards, {
                  id: newCardId(), action: options.actions[0]?.value ?? "varg",
                  icon: "graduation", action_icon: "userPlus",
                  title_mr: "", title_en: "", desc_mr: "", desc_en: "",
                  needs: [], note_mr: "", note_en: "",
                  link_note_mr: "", link_note_en: "", link_label_mr: "", link_label_en: "", link_url: "",
                  action_mr: "", action_en: "", enabled: true,
                }],
              }))}>
                <Plus size={15} /> Add card
              </button>
            )}
          >
            {errFor("cards") && <p className="a-field-error">{errFor("cards")}</p>}

            {duplicateActions.length > 0 && (
              <div className="a-notice a-notice-warn a-notice--tight">
                <div className="a-notice-body">
                  <p className="a-notice-title">Two cards open the same flow</p>
                  <p>
                    {duplicateActions.map(actionLabel).join(", ")} — the section anchor
                    (#participant, #organizer, #leader) points at only one of them, so the
                    navigation will reach the first. Allowed, but rarely intended.
                  </p>
                </div>
              </div>
            )}

            {draft.cards.map((c, i) => (
              <Row key={c.id} index={i} total={draft.cards.length} title={c.title_mr}
                   onMove={(d) => moveCard(i, d)}
                   onRemove={() => setDraft((d) => ({ ...d, cards: d.cards.filter((_, n) => n !== i) }))}>
                <Bilingual label="Card title" base="title" obj={c} required
                           error={errFor(`cards.${i}.title_mr`)}
                           onPatch={(v) => patchCard(i, v)} max={MAX.cardTitle} />
                <Bilingual label="Description" base="desc" obj={c} textarea
                           onPatch={(v) => patchCard(i, v)} max={MAX.cardDesc} />

                <div className="a-form-grid a-form-grid-2">
                  <div className={`a-field ${errFor(`cards.${i}.action`) ? "has-error" : ""}`}>
                    <label className="a-label a-label-required">Button opens</label>
                    <select className="a-select" value={c.action}
                            onChange={(e) => patchCard(i, { action: e.target.value })}>
                      {options.actions.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    {errFor(`cards.${i}.action`)
                      ? <span className="a-field-error">{errFor(`cards.${i}.action`)}</span>
                      : <span className="a-field-note">Also sets the anchor the menu links to.</span>}
                  </div>
                  <div className="a-field">
                    <label className="a-label">Card icon</label>
                    <select className="a-select" value={c.icon}
                            onChange={(e) => patchCard(i, { icon: e.target.value })}>
                      {options.icons.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <span className="a-field-note">Drawn in the circle at the top of the card.</span>
                  </div>
                </div>

                <Bilingual label="Button label" base="action" obj={c} required
                           error={errFor(`cards.${i}.action_mr`)}
                           onPatch={(v) => patchCard(i, v)} max={MAX.action} />

                <div className="a-form-grid a-form-grid-2">
                  <div className="a-field">
                    <label className="a-label">Button icon</label>
                    <select className="a-select" value={c.action_icon}
                            onChange={(e) => patchCard(i, { action_icon: e.target.value })}>
                      {options.icons.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <span className="a-field-note">Drawn inside the button, before the label.</span>
                  </div>
                  <label className="a-checkbox-label">
                    <input type="checkbox" className="a-checkbox" checked={c.enabled !== false}
                           onChange={(e) => patchCard(i, { enabled: e.target.checked })} />
                    Show this card
                  </label>
                </div>

                <div className="a-field">
                  <label className="a-label">Required-detail chips</label>
                  <span className="a-field-note">
                    The small pills under “{draft.text.needs_label_mr || "आवश्यक माहिती"}”.
                    Leave empty to hide the block, as the Leader card does.
                  </span>
                  {(c.needs ?? []).map((n, k) => (
                    <div key={n.id} className="a-form-grid a-form-grid-2 a-mt-1">
                      <TextField label={`Chip ${k + 1} (Marathi)`} required max={MAX.chip}
                                 error={errFor(`cards.${i}.needs.${k}.label_mr`)}
                                 value={n.label_mr} onChange={(v) => patchChip(i, k, { label_mr: v })} />
                      <div className="a-flex a-gap-2">
                        <TextField label={`Chip ${k + 1} (English)`} max={MAX.chip}
                                   value={n.label_en} onChange={(v) => patchChip(i, k, { label_en: v })} />
                        <button type="button" className="a-action-btn danger"
                                title="Remove chip"
                                onClick={() => patchCard(i, { needs: c.needs.filter((_, x) => x !== k) })}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(c.needs?.length ?? 0) < LIMITS.chips && (
                    <button type="button" className="a-btn a-btn-secondary a-btn-sm a-mt-1"
                            onClick={() => patchCard(i, {
                              needs: [...(c.needs ?? []), { id: newChipId(), label_mr: "", label_en: "" }],
                            })}>
                      <Plus size={15} /> Add chip
                    </button>
                  )}
                </div>

                <Bilingual label="Note" base="note" obj={c} textarea
                           hint="The italic line with the ⓘ mark."
                           onPatch={(v) => patchCard(i, v)} max={MAX.note} />

                <Bilingual label="Link note" base="link_note" obj={c} textarea
                           hint="A second ⓘ line ending in a link. Leave the address empty to hide it."
                           onPatch={(v) => patchCard(i, v)} max={MAX.note} />
                <Bilingual label="Link label" base="link_label" obj={c}
                           error={errFor(`cards.${i}.link_label_mr`)}
                           hint="The clickable words."
                           onPatch={(v) => patchCard(i, v)} max={MAX.linkLabel} />
                <TextField label="Link address" max={MAX.linkUrl}
                           hint="Opens in a new tab. Must start with http:// or https://."
                           error={errFor(`cards.${i}.link_url`)}
                           value={c.link_url} onChange={(v) => patchCard(i, { link_url: v })} />
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

            <ol className="a-mini-steps">
              {draft.cards.filter((x) => x.enabled !== false).map((x, i) => (
                <li key={x.id}>
                  <span className="a-mini-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong className="a-mini-step-t">{x.title_mr || "—"}</strong>
                    {x.desc_mr && <span className="a-mini-step-d">{x.desc_mr}</span>}
                    {(x.needs?.length ?? 0) > 0 && (
                      <span className="a-mini-step-q">
                        {x.needs.map((n) => n.label_mr).filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {x.action_mr && <span className="a-mini-step-q">▸ {x.action_mr}</span>}
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
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/join")}>Cancel</button>
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
