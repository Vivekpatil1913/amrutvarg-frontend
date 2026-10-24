import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, X } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { CHAIN, MASTER_UI, emptyMaster } from "../lib/masters.js";

// One master record — a state, vibhag, district or taluka — added or edited on
// its own page rather than in a dialog. The fields, the cascading parent
// selects and the request bodies are exactly what the list screen sent before;
// only the surface changed.

const MAX = { name: 120, code: 20 };

function Section({ title, desc, children }) {
  return (
    <section className="a-card a-panel">
      <header className="a-panel-head">
        <h2 className="a-panel-title">{title}</h2>
        {desc && <p className="a-panel-desc">{desc}</p>}
      </header>
      <div className="a-panel-body">{children}</div>
    </section>
  );
}

// A field shows its error once it has been touched or once a save was
// attempted, so a fresh empty form is not covered in red before anything is
// typed.
function Field({ label, required, error, show, hint, children }) {
  const visible = show ? error : null;
  return (
    <div className={`a-field ${visible ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {children}
      {visible
        ? <span className="a-field-error">{visible}</span>
        : hint ? <span className="a-field-help">{hint}</span> : null}
    </div>
  );
}

function validate(form, cfg, chain, chainSel) {
  const e = {};
  const nameMr = form.name_mr.trim();
  if (!nameMr) e.name_mr = `A ${cfg.label.toLowerCase()} name in Marathi is required`;
  else if (nameMr.length > MAX.name) e.name_mr = `Cannot exceed ${MAX.name} characters`;

  if (form.name_en.trim().length > MAX.name) e.name_en = `Cannot exceed ${MAX.name} characters`;

  const code = form.code.trim();
  if (cfg.codeRequired && !code) e.code = `A ${cfg.label.toLowerCase()} code is required`;
  else if (code.length > MAX.code) e.code = `Cannot exceed ${MAX.code} characters`;

  // Every level has to be chosen: the ones above the stored column are what
  // narrow the list below them.
  chain.forEach((level) => {
    if (!chainSel[level.column]) e[level.column] = `Choose a ${level.label.toLowerCase()}`;
  });

  const order = Number(form.display_order);
  if (!Number.isInteger(order)) e.display_order = "Enter a whole number";

  return e;
}

// An unknown :master would otherwise change the hook order below, so it is
// turned away before the real form mounts.
export default function MasterForm() {
  const { master, id } = useParams();
  const cfg = MASTER_UI[master];
  if (!cfg) return <Navigate to="/admin/dashboard" replace />;
  return <MasterFormInner key={master} cfg={cfg} id={id} />;
}

function MasterFormInner({ cfg, id }) {
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;
  const chain = CHAIN[cfg.key];

  const [form, setForm] = useState(() => emptyMaster(cfg));
  const [chainSel, setChainSel] = useState({});
  const [chainLists, setChainLists] = useState({});
  const [aliasDraft, setAliasDraft] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const back = () => navigate(`/admin/masters/${cfg.key}`);

  const errors = useMemo(
    () => validate(form, cfg, chain, chainSel),
    [form, cfg, chain, chainSel]
  );
  const invalid = Object.keys(errors).length > 0;

  // A server message outranks the local one: it knows things the browser
  // cannot, such as whether a code is already taken.
  const errFor = (k) => serverErrors[k] ?? errors[k];
  const showFor = (k) => Boolean(serverErrors[k]) || submitted || touched[k];

  // Editing a field clears the server's verdict on it — that verdict was about
  // the old value, and leaving it would argue with what is now on screen.
  const set = (values, field) => {
    setForm((f) => ({ ...f, ...values }));
    if (field) setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
  };
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // Each level's options depend on the level above it, so they load in sequence
  // and a level with no parent chosen yet stays empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lists = {};
      for (let i = 0; i < chain.length; i++) {
        const level = chain[i];
        const above = i > 0 ? chain[i - 1] : null;
        const aboveId = above ? chainSel[above.column] : null;
        if (above && !aboveId) { lists[level.column] = []; continue; }
        const qs = above ? `&${above.column}=${aboveId}` : "";
        try {
          const res = await api.get(`/admin/masters/${level.key}?limit=500&status=active${qs}`);
          lists[level.column] = res.data;
        } catch {
          lists[level.column] = [];
        }
      }
      if (!cancelled) setChainLists(lists);
    })();
    return () => { cancelled = true; };
  }, [chain, chainSel]);

  // Walks upward from a saved record so an edit opens with its whole chain
  // already selected.
  async function resolveChain(record) {
    if (!chain.length) return {};
    const sel = {};
    const last = chain[chain.length - 1];
    sel[last.column] = record[last.column] ?? "";
    for (let i = chain.length - 2; i >= 0; i--) {
      const below = chain[i + 1];
      const rowId = sel[below.column];
      if (!rowId) break;
      try {
        const res = await api.get(`/admin/masters/${below.key}/${rowId}`);
        sel[chain[i].column] = res.data[chain[i].column] ?? "";
      } catch { break; }
    }
    return sel;
  }

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/admin/masters/${cfg.key}/${id}`);
        const d = res.data;
        const sel = await resolveChain(d);
        if (cancelled) return;
        setForm({
          name_mr: d.name_mr || "", name_en: d.name_en || "", code: d.code || "",
          former_names: d.former_names || [], is_active: d.is_active ?? true,
          display_order: d.display_order || 0,
          ...(cfg.parent ? { [cfg.parent.column]: d[cfg.parent.column] ?? "" } : {}),
        });
        setChainSel(sel);
      } catch {
        if (cancelled) return;
        toast.show(`That ${cfg.label.toLowerCase()} could not be loaded`, "bad");
        navigate(`/admin/masters/${cfg.key}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // resolveChain closes over `chain`, which is stable for a given master.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.key, id, isNew]);

  // Choosing a level clears every level below it, so a stale combination can
  // never be saved.
  function pickChain(index, value) {
    setChainSel((prev) => {
      const next = { ...prev, [chain[index].column]: value };
      for (let i = index + 1; i < chain.length; i++) next[chain[i].column] = "";
      return next;
    });
    touch(chain[index].column);
    setServerErrors((s) => (s[chain[index].column] ? { ...s, [chain[index].column]: undefined } : s));
  }

  function addAlias() {
    const v = aliasDraft.trim();
    if (!v || form.former_names.includes(v)) return;
    set({ former_names: [...form.former_names, v] });
    setAliasDraft("");
  }

  async function save(e) {
    e?.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      const body = {
        ...form,
        name_mr: form.name_mr.trim(),
        name_en: form.name_en.trim(),
        code: form.code.trim(),
        display_order: Number(form.display_order) || 0,
        // Only the deepest level is stored; the levels above it were navigation.
        ...(cfg.parent
          ? { [cfg.parent.column]: Number(chainSel[cfg.parent.column]) || 0 }
          : {}),
      };
      try {
        if (isNew) {
          await api.post(`/admin/masters/${cfg.key}`, body);
          toast.success(`${cfg.label} created successfully`);
        } else {
          await api.put(`/admin/masters/${cfg.key}/${id}`, body);
          toast.success(`${cfg.label} updated successfully`);
        }
        back();
      } catch (err) {
        // Field-level messages land under their input; anything else is a toast.
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

  async function remove() {
    await mutate(async () => {
      try {
        await api.del(`/admin/masters/${cfg.key}/${id}`);
        toast.success(`${cfg.label} moved to trash`);
        back();
      } catch (err) {
        // A dependency refusal is the useful case: say what blocks it.
        toast.error(errorMessage(err, `Could not delete that ${cfg.label.toLowerCase()}`));
        setConfirmDelete(false);
        throw err;
      }
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="a-spinner">
        <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading…
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">
            {isNew ? `Add ${cfg.label}` : `Edit ${cfg.label}`}
          </h1>
          <p className="a-page-desc">{isNew ? cfg.desc : form.name_mr || cfg.desc}</p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={back}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>

      {submitted && invalid && (
        <div className="a-notice a-notice-warn">
          <div className="a-notice-body">
            <p className="a-notice-title">{errorCount} field(s) need attention</p>
            <p>Saving is blocked until the highlighted fields are corrected.</p>
          </div>
        </div>
      )}

      <form onSubmit={save} noValidate>
        <div className="a-form-layout">
          <div className="a-form-main">
            {chain.length > 0 && (
              <Section
                title="Where it sits"
                desc={`The ${chain[chain.length - 1].label.toLowerCase()} this ${cfg.label.toLowerCase()} belongs to. Only the last choice is stored; the ones above it narrow the list.`}
              >
                {chain.map((level, i) => {
                  const options = chainLists[level.column] ?? [];
                  const above = i > 0 ? chain[i - 1] : null;
                  const waiting = above && !chainSel[above.column];
                  return (
                    <Field
                      key={level.column}
                      label={level.label}
                      required
                      error={errFor(level.column)}
                      show={showFor(level.column)}
                      hint={!waiting && options.length === 0
                        ? `No active ${level.label.toLowerCase()}s here — add one in ${level.label} Master.`
                        : undefined}
                    >
                      <select
                        className="a-input"
                        value={chainSel[level.column] ?? ""}
                        disabled={waiting}
                        onChange={(e) => pickChain(i, e.target.value)}
                        onBlur={() => touch(level.column)}
                      >
                        <option value="">
                          {waiting
                            ? `Select ${above.label.toLowerCase()} first…`
                            : `Select ${level.label.toLowerCase()}…`}
                        </option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name_en ? `${o.name_mr} — ${o.name_en}` : o.name_mr}
                          </option>
                        ))}
                      </select>
                    </Field>
                  );
                })}
              </Section>
            )}

            <Section title="Name and code" desc={`How this ${cfg.label.toLowerCase()} is written and referred to.`}>
              <div className="a-form-grid a-form-grid-2">
                <Field label={`${cfg.label} Name (Marathi)`} required
                       error={errFor("name_mr")} show={showFor("name_mr")}>
                  <input className="a-input" maxLength={MAX.name} value={form.name_mr}
                         onChange={(e) => set({ name_mr: e.target.value }, "name_mr")}
                         onBlur={() => touch("name_mr")} />
                </Field>
                <Field label={`${cfg.label} Name (English)`}
                       error={errFor("name_en")} show={showFor("name_en")}>
                  <input className="a-input" maxLength={MAX.name} value={form.name_en}
                         onChange={(e) => set({ name_en: e.target.value }, "name_en")}
                         onBlur={() => touch("name_en")} />
                </Field>
              </div>

              <Field label={`${cfg.label} Code`} required={cfg.codeRequired}
                     error={errFor("code")} show={showFor("code")}>
                <input className="a-input" maxLength={MAX.code} value={form.code}
                       onChange={(e) => set({ code: e.target.value }, "code")}
                       onBlur={() => touch("code")} />
              </Field>
            </Section>

            <Section
              title={`Former ${cfg.label.toLowerCase()} names`}
              desc={`Earlier or alternative spellings. Records saved under an old name keep resolving to this ${cfg.label.toLowerCase()} without being rewritten.`}
            >
              <div className="a-chip-row">
                {form.former_names.map((n) => (
                  <span key={n} className="a-chip">
                    {n}
                    <button type="button" aria-label={`Remove ${n}`}
                            onClick={() => set({ former_names: form.former_names.filter((x) => x !== n) })}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="a-flex a-gap-2">
                <input className="a-input" value={aliasDraft}
                       placeholder={`Add a former ${cfg.label.toLowerCase()} name…`}
                       onChange={(e) => setAliasDraft(e.target.value)}
                       onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }} />
                <button type="button" className="a-btn a-btn-secondary" onClick={addAlias}>Add</button>
              </div>
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Listing" desc="Whether this record is offered, and where in the order.">
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.is_active}
                       onChange={(e) => set({ is_active: e.target.checked })} />
                Active — available in dropdowns on the website
              </label>
              <Field label="Display order" error={errFor("display_order")} show={showFor("display_order")}
                     hint="Lower numbers come first.">
                <input className="a-input" type="number" value={form.display_order}
                       onChange={(e) => set({ display_order: e.target.value }, "display_order")}
                       onBlur={() => touch("display_order")} />
              </Field>
              {!isNew && (
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-mt-1"
                        onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Delete this {cfg.label.toLowerCase()}
                </button>
              )}
            </Section>
          </aside>
        </div>

        <div className="a-save-bar">
          <span className="a-save-bar-state">
            {submitted && invalid ? `${errorCount} field(s) need attention` : "Ready to save"}
          </span>
          <div className="a-flex a-gap-2">
            <button type="button" className="a-btn a-btn-ghost" onClick={back}>Cancel</button>
            <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? "Saving…" : isNew ? `Create ${cfg.label.toLowerCase()}` : `Save ${cfg.label.toLowerCase()}`}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title={`Delete ${cfg.label}`}
        message={`Delete this ${cfg.label.toLowerCase()}?`}
        subMessage={`It will be moved to the trash and can be restored later. Refused if anything still references it${cfg.child ? ` or if it has ${cfg.child.toLowerCase()}` : ""}.`}
      />
    </>
  );
}
