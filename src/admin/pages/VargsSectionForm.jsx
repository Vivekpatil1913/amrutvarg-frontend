import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Rocket, Undo2, Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// The whole "कार्यरत अमृत वर्ग" section on one page, grouped into cards.
//
// Only the wording and layout live here. The vargs themselves are records with
// their own list, and the district and vibhag figures are counted from the
// masters — which is why the statistics strip offers a source rather than a
// number to type.
//
// Limits mirror src/modules/vargs/section.schema.js exactly. The browser
// catches mistakes early; the server is still what decides, and its field-level
// errors are shown against the same inputs.

const MAX = {
  badge: 80, title: 120, lead: 400, empty: 300,
  atlasTitle: 120, atlasNote: 300, allDivisions: 80, phrase: 160,
  placeholder: 160, label: 120, viewing: 80, message: 300,
  clear: 80, cardLabel: 60, suffix: 80,
};
const LIMITS = { stats: 4, pageMin: 3, pageMax: 24, manual: 1_000_000 };

const blank = (v) => !String(v ?? "").trim();

// Checks a phrase's placeholders the way the server does, so a typo is caught
// before the request rather than printed to a visitor as literal braces.
function templateError(value, allowed, required) {
  const v = String(value ?? "");
  if (!v.trim()) return null;
  for (const m of v.matchAll(/\{([^}]*)\}/g)) {
    if (!allowed.includes(m[1])) {
      return `Unknown placeholder {${m[1]}} — use ${allowed.map((a) => `{${a}}`).join(", ")}`;
    }
  }
  if (required && !v.includes(`{${required}}`)) {
    return `Must include {${required}}, which is replaced at display time`;
  }
  return null;
}

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

function Bilingual({ label, base, obj, onPatch, max, textarea, required, hint, error, errorEn }) {
  return (
    <div className="a-form-grid a-form-grid-2">
      <TextField label={`${label} (Marathi)`} required={required} hint={hint} max={max}
                 textarea={textarea} error={error}
                 value={obj[`${base}_mr`]} onChange={(v) => onPatch({ [`${base}_mr`]: v })} />
      <TextField label={`${label} (English)`} max={max} textarea={textarea} error={errorEn}
                 value={obj[`${base}_en`]} onChange={(v) => onPatch({ [`${base}_en`]: v })} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint, error, required }) {
  return (
    <div className={`a-field ${error ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      <select className="a-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error ? <span className="a-field-error">{error}</span>
             : hint && <span className="a-field-note">{hint}</span>}
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

export default function VargsSectionForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [options, setOptions] = useState({
    stat_sources: [], stat_icons: [], order_sources: [], counts: {},
  });
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
    const need = (key, value, message) => { if (blank(value)) e[key] = message; };
    const tpl = (key, value, allowed, required) => {
      const msg = templateError(value, allowed, required);
      if (msg) e[key] = msg;
    };

    need("text.title_mr", draft.text.title_mr, "A Marathi heading is required");
    tpl("text.lead_mr", draft.text.lead_mr, ["count"]);
    tpl("text.lead_en", draft.text.lead_en, ["count"]);

    need("atlas.title_mr", draft.atlas.title_mr, "A Marathi heading is required");
    need("atlas.all_divisions_mr", draft.atlas.all_divisions_mr, "A Marathi label is required");
    tpl("atlas.all_districts_mr", draft.atlas.all_districts_mr, ["count"], "count");
    tpl("atlas.all_districts_en", draft.atlas.all_districts_en, ["count"]);
    tpl("atlas.districts_in_mr", draft.atlas.districts_in_mr, ["name"], "name");
    tpl("atlas.districts_in_en", draft.atlas.districts_in_en, ["name"]);

    need("search.placeholder_mr", draft.search.placeholder_mr, "A Marathi placeholder is required");
    need("search.label_mr", draft.search.label_mr, "A Marathi label is required");
    need("search.viewing_mr", draft.search.viewing_mr, "A Marathi label is required");
    tpl("search.results_count_mr", draft.search.results_count_mr, ["count"], "count");
    tpl("search.results_count_en", draft.search.results_count_en, ["count"]);
    tpl("search.none_in_district_mr", draft.search.none_in_district_mr, ["name"]);
    tpl("search.none_in_district_en", draft.search.none_in_district_en, ["name"]);

    need("card.pass_label_mr", draft.card.pass_label_mr, "A Marathi label is required");
    need("card.cta_mr", draft.card.cta_mr, "A Marathi button label is required");
    need("card.read_more_mr", draft.card.read_more_mr, "A Marathi label is required");
    need("card.read_less_mr", draft.card.read_less_mr, "A Marathi label is required");
    tpl("card.division_suffix_mr", draft.card.division_suffix_mr, ["name"], "name");
    tpl("card.division_suffix_en", draft.card.division_suffix_en, ["name"]);

    const seen = new Set();
    draft.stats.items.forEach((s, i) => {
      if (blank(s.key)) e[`stats.items.${i}.key`] = "A key is required";
      else if (!/^[a-z0-9_-]+$/.test(s.key))
        e[`stats.items.${i}.key`] = "Lowercase letters, numbers, hyphen and underscore only";
      else if (seen.has(s.key.toLowerCase()))
        e[`stats.items.${i}.key`] = "Another statistic already uses this key";
      seen.add(s.key?.toLowerCase());

      if (blank(s.label_mr)) e[`stats.items.${i}.label_mr`] = "A Marathi label is required";

      if (s.source === "manual") {
        const n = Number(s.manual_value);
        if (!Number.isInteger(n) || n < 0)
          e[`stats.items.${i}.manual_value`] = "Enter a whole number, zero or more";
        else if (n > LIMITS.manual)
          e[`stats.items.${i}.manual_value`] = "That number is too large";
      }
    });
    if (draft.stats.items.length > LIMITS.stats)
      e["stats.items"] = `At most ${LIMITS.stats} statistics fit across the strip`;

    const size = Number(draft.list.page_size);
    if (!Number.isInteger(size) || size < LIMITS.pageMin)
      e["list.page_size"] = `Show at least ${LIMITS.pageMin} cards a page`;
    else if (size > LIMITS.pageMax)
      e["list.page_size"] = `At most ${LIMITS.pageMax} cards a page`;

    return e;
  }, [draft]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  useEffect(() => {
    Promise.all([api.get("/admin/vargs-section"), api.get("/admin/vargs-section/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setMeta({
          published_at: cfg.data.published_at,
          has_unpublished_changes: cfg.data.has_unpublished_changes,
        });
        setOptions(opt.data);
      })
      .catch(() => toast.show("Could not load the Amrut Varg section", "bad"))
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

  const patchStat = useCallback((i, values) => {
    setDraft((d) => {
      const items = d.stats.items.map((s, idx) => (idx === i ? { ...s, ...values } : s));
      return { ...d, stats: { ...d.stats, items } };
    });
  }, []);

  const moveStat = useCallback((i, delta) => {
    setDraft((d) => {
      const items = [...d.stats.items];
      const j = i + delta;
      if (j < 0 || j >= items.length) return d;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...d, stats: { ...d.stats, items } };
    });
  }, []);

  const removeStat = useCallback((i) => {
    setDraft((d) => ({ ...d, stats: { ...d.stats, items: d.stats.items.filter((_, idx) => idx !== i) } }));
  }, []);

  const addStat = useCallback(() => {
    setDraft((d) => ({
      ...d,
      stats: {
        ...d.stats,
        items: [...d.stats.items, {
          key: `stat${d.stats.items.length + 1}`, icon: "building",
          label_mr: "", label_en: "", source: "vargs_count", manual_value: 0,
        }],
      },
    }));
  }, []);

  // What a counted statistic will actually show, read back from the server so
  // the editor sees the real figure rather than a guess.
  const valueOf = (stat) =>
    stat.source === "manual" ? Number(stat.manual_value) || 0 : options.counts?.[stat.source] ?? "—";

  async function save({ thenPublish = false } = {}) {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const res = await api.put("/admin/vargs-section/draft", draft);
        setSaved(res.data.draft);
        setDraft(res.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));

        if (thenPublish) {
          const pub = await api.post("/admin/vargs-section/publish");
          setMeta({ published_at: pub.data.published_at, has_unpublished_changes: false });
          toast.show("Published — the website is updated", "ok");
        } else {
          toast.show("Draft saved — not yet live", "ok");
        }
        navigate("/admin/vargs");
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
      const res = await api.post("/admin/vargs-section/discard");
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
        Loading Amrut Varg section…
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Amrut Varg section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/vargs")}>
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
          <h1 className="a-page-title a-mt-1">Edit Amrut Varg Section</h1>
          <p className="a-page-desc">
            “कार्यरत अमृत वर्ग” in full. Changes stay in the draft until you publish.
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/vargs")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>

      {invalid && (
        <div className="a-notice a-notice-warn">
          <div className="a-notice-body">
            <p className="a-notice-title">{Object.keys(errors).length} field(s) need attention</p>
            <p>Saving is blocked until the highlighted fields are corrected.</p>
          </div>
        </div>
      )}

      <div className="a-form-layout">
        <div className="a-form-main">
          <Section title="Heading" desc="The label, title and lead shown above the listing.">
            <Bilingual label="Top label" base="badge" obj={draft.text}
                       hint="The small line above the heading."
                       onPatch={(v) => patch("text", v)} max={MAX.badge} />
            <Bilingual label="Heading" base="title" obj={draft.text} required
                       error={errFor("text.title_mr")}
                       onPatch={(v) => patch("text", v)} max={MAX.title} />
            <Bilingual label="Lead" base="lead" obj={draft.text} textarea
                       hint="Write {count} where the number of vargs should appear."
                       error={errFor("text.lead_mr")} errorEn={errFor("text.lead_en")}
                       onPatch={(v) => patch("text", v)} max={MAX.lead} />
            <Bilingual label="Empty-state message" base="empty" obj={draft.text} textarea
                       hint="Shown when no varg is listed."
                       onPatch={(v) => patch("text", v)} max={MAX.empty} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.text.eyebrow_dot !== false}
                     onChange={(e) => patch("text", { eyebrow_dot: e.target.checked })} />
              Show the emblem dot beside the top label
            </label>
          </Section>

          <Section
            title="Statistics strip"
            desc="The figures beside the heading. Each is counted live, so it cannot drift from the data."
            action={
              <button className="a-btn a-btn-secondary a-btn-sm" onClick={addStat}
                      disabled={draft.stats.items.length >= LIMITS.stats}>
                <Plus size={15} /> Add statistic
              </button>
            }
          >
            {errFor("stats.items") && <p className="a-field-error">{errFor("stats.items")}</p>}
            {draft.stats.items.length === 0 ? (
              <p className="a-field-note">No statistics — the strip will not be shown.</p>
            ) : (
              draft.stats.items.map((s, i) => (
                <Row key={i} index={i} total={draft.stats.items.length}
                     title={s.label_mr || s.key}
                     onMove={(d) => moveStat(i, d)} onRemove={() => removeStat(i)}>
                  <Bilingual label="Label" base="label" obj={s} required
                             error={errFor(`stats.items.${i}.label_mr`)}
                             onPatch={(v) => patchStat(i, v)} max={MAX.cardLabel} />
                  <div className="a-form-grid a-form-grid-2">
                    <SelectField label="Number comes from" required value={s.source}
                                 onChange={(v) => patchStat(i, { source: v })}
                                 options={options.stat_sources}
                                 hint={`Shows ${valueOf(s)} right now.`} />
                    <SelectField label="Icon" required value={s.icon}
                                 onChange={(v) => patchStat(i, { icon: v })}
                                 options={options.stat_icons.map((n) => ({ value: n, label: n }))} />
                  </div>
                  <div className="a-form-grid a-form-grid-2">
                    <div className={`a-field ${errFor(`stats.items.${i}.key`) ? "has-error" : ""}`}>
                      <label className="a-label a-label-required">Key</label>
                      <input className="a-input" value={s.key ?? ""}
                             onChange={(e) => patchStat(i, { key: e.target.value })} />
                      {errFor(`stats.items.${i}.key`)
                        ? <span className="a-field-error">{errFor(`stats.items.${i}.key`)}</span>
                        : <span className="a-field-note">Internal name; not shown on the site.</span>}
                    </div>
                    {s.source === "manual" && (
                      <div className={`a-field ${errFor(`stats.items.${i}.manual_value`) ? "has-error" : ""}`}>
                        <label className="a-label a-label-required">Number</label>
                        <input className="a-input" type="number" min="0"
                               value={s.manual_value ?? 0}
                               onChange={(e) => patchStat(i, {
                                 manual_value: e.target.value === "" ? 0 : Number(e.target.value),
                               })} />
                        {errFor(`stats.items.${i}.manual_value`)
                          ? <span className="a-field-error">{errFor(`stats.items.${i}.manual_value`)}</span>
                          : <span className="a-field-note">Typed by hand; nothing counts it.</span>}
                      </div>
                    )}
                  </div>
                </Row>
              ))
            )}
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.stats.enabled !== false}
                     onChange={(e) => patch("stats", { enabled: e.target.checked })} />
              Show the statistics strip
            </label>
          </Section>

          <Section title="Division atlas" desc="The ring and district chips on the left of the listing.">
            <Bilingual label="Heading" base="title" obj={draft.atlas} required
                       error={errFor("atlas.title_mr")}
                       onPatch={(v) => patch("atlas", v)} max={MAX.atlasTitle} />
            <Bilingual label="Note" base="note" obj={draft.atlas} textarea
                       hint="The line under the heading."
                       onPatch={(v) => patch("atlas", v)} max={MAX.atlasNote} />
            <Bilingual label="All-divisions label" base="all_divisions" obj={draft.atlas} required
                       hint="The ring's centre when no division is picked."
                       error={errFor("atlas.all_divisions_mr")}
                       onPatch={(v) => patch("atlas", v)} max={MAX.allDivisions} />
            <Bilingual label="All-districts line" base="all_districts" obj={draft.atlas} required
                       hint="Write {count} where the number of districts should appear."
                       error={errFor("atlas.all_districts_mr")} errorEn={errFor("atlas.all_districts_en")}
                       onPatch={(v) => patch("atlas", v)} max={MAX.phrase} />
            <Bilingual label="Districts-in line" base="districts_in" obj={draft.atlas} required
                       hint="Write {name} where the chosen division's name should appear."
                       error={errFor("atlas.districts_in_mr")} errorEn={errFor("atlas.districts_in_en")}
                       onPatch={(v) => patch("atlas", v)} max={MAX.phrase} />
            <div className="a-form-grid a-form-grid-2">
              <SelectField label="Division order" required value={draft.atlas.division_order}
                           onChange={(v) => patch("atlas", { division_order: v })}
                           options={options.order_sources}
                           hint="How the ring's arcs are ordered." />
              <SelectField label="District order" required value={draft.atlas.district_order}
                           onChange={(v) => patch("atlas", { district_order: v })}
                           options={options.order_sources}
                           hint="How the district chips are ordered." />
            </div>
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.atlas.show_district_chips !== false}
                     onChange={(e) => patch("atlas", { show_district_chips: e.target.checked })} />
              Show the district chips under the ring
            </label>
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.atlas.enabled !== false}
                     onChange={(e) => patch("atlas", { enabled: e.target.checked })} />
              Show the atlas (switched off, the cards take the full width)
            </label>
          </Section>

          <Section title="Search and results" desc="The search bar above the cards and the lines beside it.">
            <Bilingual label="Search placeholder" base="placeholder" obj={draft.search} required
                       error={errFor("search.placeholder_mr")}
                       onPatch={(v) => patch("search", v)} max={MAX.placeholder} />
            <Bilingual label="Search label" base="label" obj={draft.search} required
                       hint="Read aloud by screen readers; not shown on screen."
                       error={errFor("search.label_mr")}
                       onPatch={(v) => patch("search", v)} max={MAX.label} />
            <Bilingual label="Viewing label" base="viewing" obj={draft.search} required
                       hint="Before the chosen division and district."
                       error={errFor("search.viewing_mr")}
                       onPatch={(v) => patch("search", v)} max={MAX.viewing} />
            <Bilingual label="Result count" base="results_count" obj={draft.search} required
                       hint="Write {count} where the number of matches should appear."
                       error={errFor("search.results_count_mr")} errorEn={errFor("search.results_count_en")}
                       onPatch={(v) => patch("search", v)} max={MAX.phrase} />
            <Bilingual label="No-match message" base="no_match" obj={draft.search} textarea
                       onPatch={(v) => patch("search", v)} max={MAX.message} />
            <Bilingual label="Empty-district message" base="none_in_district" obj={draft.search} textarea
                       hint="Write {name} where the district's name should appear."
                       error={errFor("search.none_in_district_mr")}
                       errorEn={errFor("search.none_in_district_en")}
                       onPatch={(v) => patch("search", v)} max={MAX.message} />
            <Bilingual label="Clear-filters button" base="clear_filters" obj={draft.search}
                       onPatch={(v) => patch("search", v)} max={MAX.clear} />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.search.enabled !== false}
                     onChange={(e) => patch("search", { enabled: e.target.checked })} />
              Show the search bar
            </label>
          </Section>

          <Section title="Varg card" desc="The wording on each card in the listing.">
            <Bilingual label="Card label" base="pass_label" obj={draft.card} required
                       hint="Beside the dot at the foot of a card."
                       error={errFor("card.pass_label_mr")}
                       onPatch={(v) => patch("card", v)} max={MAX.cardLabel} />
            <Bilingual label="Button" base="cta" obj={draft.card} required
                       error={errFor("card.cta_mr")}
                       onPatch={(v) => patch("card", v)} max={MAX.cardLabel} />
            <Bilingual label="Division line" base="division_suffix" obj={draft.card} required
                       hint="Write {name} where the division's name should appear."
                       error={errFor("card.division_suffix_mr")} errorEn={errFor("card.division_suffix_en")}
                       onPatch={(v) => patch("card", v)} max={MAX.suffix} />
            <Bilingual label="Read-more link" base="read_more" obj={draft.card} required
                       hint="On a card whose place name is too long to fit."
                       error={errFor("card.read_more_mr")}
                       onPatch={(v) => patch("card", v)} max={MAX.cardLabel} />
            <Bilingual label="Read-less link" base="read_less" obj={draft.card} required
                       error={errFor("card.read_less_mr")}
                       onPatch={(v) => patch("card", v)} max={MAX.cardLabel} />
          </Section>

          <Section title="Listing" desc="How many cards a page, and the note beneath them.">
            <div className="a-form-grid a-form-grid-2">
              <div className={`a-field ${errFor("list.page_size") ? "has-error" : ""}`}>
                <label className="a-label a-label-required">Cards a page</label>
                <input className="a-input" type="number" min={LIMITS.pageMin} max={LIMITS.pageMax}
                       value={draft.list.page_size}
                       onChange={(e) => patch("list", {
                         page_size: e.target.value === "" ? LIMITS.pageMin : Number(e.target.value),
                       })} />
                {errFor("list.page_size")
                  ? <span className="a-field-error">{errFor("list.page_size")}</span>
                  : <span className="a-field-note">Between {LIMITS.pageMin} and {LIMITS.pageMax}.</span>}
              </div>
            </div>
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.list.show_source_note !== false}
                     onChange={(e) => patch("list", { show_source_note: e.target.checked })} />
              Show the “this list reflects…” note under the cards
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
            {draft.text.lead_mr && (
              <p className="a-mini-desc">
                {draft.text.lead_mr.replace("{count}", options.counts?.vargs_count ?? 0)}
              </p>
            )}

            {draft.stats.enabled !== false && draft.stats.items.length > 0 && (
              <div className="a-mini-stats">
                {draft.stats.items.map((s, i) => (
                  <div key={i} className="a-mini-stat">
                    <strong className="a-mini-stat-v">{valueOf(s)}</strong>
                    <span className="a-mini-stat-l">{s.label_mr || "—"}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="a-mini-cards">
              <div className="a-mini-card">
                <strong className="a-mini-card-t">अकोला</strong>
                <span className="a-mini-card-l">
                  {(draft.card.division_suffix_mr || "{name}").replace("{name}", "अमरावती")}
                </span>
                <span className="a-mini-tags">
                  <span className="a-chip">{draft.card.pass_label_mr || "—"}</span>
                </span>
              </div>
            </div>
            <div className="a-preview-actions a-mt-1">
              <span className="a-preview-btn is-primary">{draft.card.cta_mr || "—"}</span>
            </div>
          </Section>

          <Section title="Where the numbers come from" desc="Counted at the moment the page is served.">
            <div className="a-view-list">
              <div className="a-view-row">
                <span className="a-view-label">Active vargs</span>
                <div className="a-view-value">{options.counts?.vargs_count ?? "—"}</div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Districts (master)</span>
                <div className="a-view-value">{options.counts?.districts_count ?? "—"}</div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Vibhags (master)</span>
                <div className="a-view-value">{options.counts?.divisions_count ?? "—"}</div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Districts with a varg</span>
                <div className="a-view-value">{options.counts?.listed_districts_count ?? "—"}</div>
              </div>
              <div className="a-view-row">
                <span className="a-view-label">Vibhags with a varg</span>
                <div className="a-view-value">{options.counts?.listed_divisions_count ?? "—"}</div>
              </div>
            </div>
            <p className="a-field-note a-mt-1">
              Add a district or vibhag in Master Management and these figures follow.
            </p>
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
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/vargs")}>Cancel</button>
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
