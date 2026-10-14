import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Eye, X } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// Mirrors the backend's masters.config.js. The four masters are structurally
// identical, so one screen serves all of them.
export const MASTER_UI = {
  states: {
    key: "states", label: "State", plural: "States",
    desc: "States the programme operates in",
    parent: null, codeRequired: true, child: "Vibhags",
  },
  vibhags: {
    key: "vibhags", label: "Vibhag", plural: "Vibhags",
    desc: "Revenue divisions within a state",
    parent: { key: "states", column: "state_id", label: "State" },
    codeRequired: false, child: "Districts",
  },
  districts: {
    key: "districts", label: "District", plural: "Districts",
    desc: "Districts within a vibhag",
    parent: { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
    grand: { key: "states", column: "state_id", label: "State" },
    codeRequired: false, child: "Talukas",
  },
  talukas: {
    key: "talukas", label: "Taluka", plural: "Talukas",
    desc: "Talukas within a district",
    parent: { key: "districts", column: "district_id", label: "District" },
    grand: { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
    codeRequired: false, child: null,
  },
};

// Levels the editor asks for, outermost first. Only the LAST entry is stored on
// the record; the ones above it exist to narrow the list below, so adding a
// district means choosing State then Vibhag, and a taluka State, Vibhag then
// District.
const CHAIN = {
  states: [],
  vibhags: [{ key: "states", column: "state_id", label: "State" }],
  districts: [
    { key: "states", column: "state_id", label: "State" },
    { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
  ],
  talukas: [
    { key: "states", column: "state_id", label: "State" },
    { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
    { key: "districts", column: "district_id", label: "District" },
  ],
};

const emptyForm = (cfg) => ({
  name_mr: "", name_en: "", code: "", former_names: [],
  is_active: true, display_order: 0,
  ...(cfg.parent ? { [cfg.parent.column]: "" } : {}),
});

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

export default function Masters({ master }) {
  const cfg = MASTER_UI[master];
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [parentId, setParentId] = useState("");
  const [grandId, setGrandId] = useState("");
  const debouncedSearch = useDebounce(search);

  const [parents, setParents] = useState([]);
  // Selected id per chain level, keyed by column. The last level doubles as the
  // value submitted on the record.
  const chain = CHAIN[cfg.key];
  const [chainSel, setChainSel] = useState({});
  const [chainLists, setChainLists] = useState({});
  const [grands, setGrands] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm(cfg));
  const [errors, setErrors] = useState({});
  const [aliasDraft, setAliasDraft] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    `/admin/masters/${cfg.key}`,
    {
      page, limit, search: debouncedSearch, status,
      ...(cfg.parent ? { [cfg.parent.column]: parentId } : {}),
      ...(cfg.grand ? { [cfg.grand.column]: grandId } : {}),
    },
    [page, limit, debouncedSearch, status, parentId, grandId, cfg.key]
  );

  // Parent options for the filter and the form select.
  const loadParents = useCallback(() => {
    if (!cfg.parent) return;
    api.get(`/admin/masters/${cfg.parent.key}?limit=200&status=active`)
      .then((res) => setParents(res.data))
      .catch(() => setParents([]));
    if (cfg.grand) {
      api.get(`/admin/masters/${cfg.grand.key}?limit=200&status=active`)
        .then((res) => setGrands(res.data))
        .catch(() => setGrands([]));
    }
  }, [cfg.parent, cfg.grand]);

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
  }, [chain, chainSel, cfg.key]);

  // Choosing a level clears every level below it, so a stale combination can
  // never be saved.
  function pickChain(index, value) {
    setChainSel((prev) => {
      const next = { ...prev, [chain[index].column]: value };
      for (let i = index + 1; i < chain.length; i++) next[chain[i].column] = "";
      return next;
    });
  }

  // Walks upward from a saved record so an edit opens with its whole chain
  // already selected.
  async function resolveChain(record) {
    if (!chain.length) return {};
    const sel = {};
    const last = chain[chain.length - 1];
    sel[last.column] = record[last.column] ?? "";
    for (let i = chain.length - 2; i >= 0; i--) {
      const below = chain[i + 1];
      const id = sel[below.column];
      if (!id) break;
      try {
        const res = await api.get(`/admin/masters/${below.key}/${id}`);
        sel[chain[i].column] = res.data[chain[i].column] ?? "";
      } catch { break; }
    }
    return sel;
  }

  useEffect(() => {
    loadParents();
    // Reset view state when switching between masters.
    setPage(1); setSearch(""); setStatus(""); setParentId(""); setGrandId("");
  }, [loadParents, cfg.key]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm(cfg));
    setChainSel({});
    setErrors({});
    setAliasDraft("");
    setFormOpen(true);
  }

  async function openEdit(row) {
    const res = await api.get(`/admin/masters/${cfg.key}/${row.id}`);
    const d = res.data;
    setEditId(d.id);
    setForm({
      name_mr: d.name_mr || "", name_en: d.name_en || "", code: d.code || "",
      former_names: d.former_names || [], is_active: d.is_active ?? true,
      display_order: d.display_order || 0,
      ...(cfg.parent ? { [cfg.parent.column]: d[cfg.parent.column] ?? "" } : {}),
    });
    setChainSel(await resolveChain(d));
    setErrors({});
    setAliasDraft("");
    setFormOpen(true);
  }

  async function handleSave(e) {
    e?.preventDefault();
    setErrors({});
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
        if (editId) {
          await api.put(`/admin/masters/${cfg.key}/${editId}`, body);
          toast.show(`${cfg.label} updated`, "ok");
        } else {
          await api.post(`/admin/masters/${cfg.key}`, body);
          toast.show(`${cfg.label} created`, "ok");
        }
        setFormOpen(false);
        refetch();
        loadParents();
      } catch (err) {
        // Field-level messages land under their input; anything else is a toast.
        if (err.details?.length) {
          setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
        } else {
          toast.show(err.message, "bad");
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function handleDelete() {
    await mutate(async () => {
      try {
        await api.del(`/admin/masters/${cfg.key}/${confirmId}`);
        toast.show("Deleted", "ok");
        setConfirmId(null);
        refetch();
      } catch (err) {
        // A dependency refusal is the useful case: say what blocks it.
        toast.show(err.message, "bad");
        setConfirmId(null);
        throw err;
      }
    }).catch(() => {});
  }


  async function toggleActive(row) {
    await mutate(async () => {
      try {
        await api.put(`/admin/masters/${cfg.key}/${row.id}`, {
          name_mr: row.name_mr, name_en: row.name_en || "", code: row.code || "",
          former_names: row.former_names || [], is_active: !row.is_active,
          display_order: row.display_order || 0,
          ...(cfg.parent ? { [cfg.parent.column]: row[cfg.parent.column] } : {}),
        });
        refetch();
      } catch (err) {
        toast.show(err.message, "bad");
        throw err;
      }
    }).catch(() => {});
  }

  function addAlias() {
    const v = aliasDraft.trim();
    if (!v || form.former_names.includes(v)) return;
    setForm({ ...form, former_names: [...form.former_names, v] });
    setAliasDraft("");
  }

  const columns = [
    { key: "name_mr", label: `${cfg.label} (Marathi)`, render: (v) => <span className="td-bold">{v}</span> },
    { key: "name_en", label: `${cfg.label} (English)`, render: (v) => v || <span className="td-muted">—</span> },
    ...(cfg.grand
      ? [{ key: "grandparent_name_mr", label: cfg.grand.label, render: (v) => v || <span className="td-muted">—</span> }]
      : []),
    ...(cfg.parent
      ? [{ key: "parent_name_mr", label: cfg.parent.label, render: (v) => v || <span className="td-muted">—</span> }]
      : []),
    { key: "code", label: "Code", render: (v) => v ? <span className="a-tabular">{v}</span> : <span className="td-muted">—</span> },
    ...(cfg.child
      ? [{ key: "child_count", label: cfg.child, render: (v) => <span className="a-tabular">{v ?? 0}</span> }]
      : []),
    {
      key: "is_active", label: "Status",
      render: (v, row) => <Switch on={v} onToggle={() => toggleActive(row)} />,
    },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder={`Search ${cfg.plural.toLowerCase()}…`}
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      {cfg.grand && (
        <select className="a-select" value={grandId}
                onChange={(e) => { setGrandId(e.target.value); setPage(1); }}>
          <option value="">All {cfg.grand.label.toLowerCase()}s</option>
          {grands.map((g) => <option key={g.id} value={g.id}>{g.name_mr}</option>)}
        </select>
      )}
      {cfg.parent && (
        <select className="a-select" value={parentId}
                onChange={(e) => { setParentId(e.target.value); setPage(1); }}>
          <option value="">All {cfg.parent.label.toLowerCase()}s</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.name_mr}</option>)}
        </select>
      )}
      <select className="a-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={openNew}>
          <Plus size={16} /> Add new
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">{cfg.plural}</h1>
          <p className="a-page-desc">{cfg.desc}</p>
        </div>
      </div>

      <DataTable
        columns={columns} rows={data} loading={loading} error={error} meta={meta}
        onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => setViewRow(row)} title="View">
              <Eye size={15} />
            </button>
            <>
                <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit">
                  <Pencil size={15} />
                </button>
                <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
                  <Trash2 size={15} />
                </button>
              </>
          </>
        )}
      />

      {/* View */}
      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title={`${cfg.label} Details`} size="lg"
             footer={<button className="a-btn a-btn-ghost" onClick={() => setViewRow(null)}>Close</button>}>
        {viewRow && (
          <>
            <div className="a-view-tags">
              <Badge tone={viewRow.is_active ? "ok" : "neutral"}>{viewRow.is_active ? "Active" : "Inactive"}</Badge>
              {viewRow.deleted_at && <Badge tone="bad">In trash</Badge>}
            </div>
            <div className="a-view-list">
              <div className="a-view-row"><span className="a-view-label">{cfg.label} Name (Marathi)</span>
                <div className="a-view-value a-view-strong">{viewRow.name_mr}</div></div>
              <div className="a-view-row"><span className="a-view-label">{cfg.label} Name (English)</span>
                <div className={`a-view-value${viewRow.name_en ? "" : " is-empty"}`}>{viewRow.name_en || "—"}</div></div>
              {cfg.grand && (
                <div className="a-view-row"><span className="a-view-label">{cfg.grand.label}</span>
                  <div className="a-view-value">{viewRow.grandparent_name_mr || "—"}</div></div>
              )}
              {cfg.parent && (
                <div className="a-view-row"><span className="a-view-label">{cfg.parent.label}</span>
                  <div className="a-view-value">{viewRow.parent_name_mr || "—"}</div></div>
              )}
              <div className="a-view-row"><span className="a-view-label">{cfg.label} Code</span>
                <div className={`a-view-value${viewRow.code ? "" : " is-empty"}`}>{viewRow.code || "—"}</div></div>
              <div className="a-view-row"><span className="a-view-label">Former {cfg.label} Names</span>
                <div className={`a-view-value${viewRow.former_names?.length ? "" : " is-empty"}`}>
                  {viewRow.former_names?.length ? viewRow.former_names.join(", ") : "—"}
                </div></div>
              {cfg.child && (
                <div className="a-view-row"><span className="a-view-label">{cfg.child}</span>
                  <div className="a-view-value">{viewRow.child_count ?? 0}</div></div>
              )}
              <div className="a-view-row"><span className="a-view-label">Display order</span>
                <div className="a-view-value">{viewRow.display_order ?? 0}</div></div>
              <div className="a-view-row"><span className="a-view-label">Created</span>
                <div className="a-view-value">{fmtStamp(viewRow.created_at)}</div></div>
              <div className="a-view-row"><span className="a-view-label">Last updated</span>
                <div className="a-view-value">{fmtStamp(viewRow.updated_at)}</div></div>
            </div>
          </>
        )}
      </Modal>

      {/* Add / Edit */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
             title={editId ? `Edit ${cfg.label}` : `New ${cfg.label}`} size="lg"
             footer={
               <>
                 <button className="a-btn a-btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
                 <button className="a-btn a-btn-primary" onClick={handleSave} disabled={saving}>
                   {saving ? "Saving…" : "Save"}
                 </button>
               </>
             }>
        <form onSubmit={handleSave}>
          <div className="a-form-section">
            {chain.map((level, i) => {
              const options = chainLists[level.column] ?? [];
              const above = i > 0 ? chain[i - 1] : null;
              const waiting = above && !chainSel[above.column];
              const isStored = i === chain.length - 1;
              return (
                <div className="a-field" key={level.column}>
                  <label className="a-label a-label-required">{level.label}</label>
                  <select
                    className="a-input"
                    value={chainSel[level.column] ?? ""}
                    required
                    disabled={waiting}
                    onChange={(e) => pickChain(i, e.target.value)}
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
                  {!waiting && options.length === 0 && (
                    <span className="a-field-help">
                      No active {level.label.toLowerCase()}s here — add one in {level.label} Master.
                    </span>
                  )}
                  {isStored && errors[level.column] && (
                    <span className="a-field-error">{errors[level.column]}</span>
                  )}
                </div>
              );
            })}

            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">{cfg.label} Name (Marathi)</label>
                <input className="a-input" value={form.name_mr} maxLength={120} required
                       onChange={(e) => setForm({ ...form, name_mr: e.target.value })} />
                {errors.name_mr && <span className="a-field-error">{errors.name_mr}</span>}
              </div>
              <div className="a-field">
                <label className="a-label">{cfg.label} Name (English)</label>
                <input className="a-input" value={form.name_en} maxLength={120}
                       onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
              </div>
            </div>

            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className={`a-label ${cfg.codeRequired ? "a-label-required" : ""}`}>{cfg.label} Code</label>
                <input className="a-input" value={form.code} maxLength={20} required={cfg.codeRequired}
                       onChange={(e) => setForm({ ...form, code: e.target.value })} />
                {errors.code && <span className="a-field-error">{errors.code}</span>}
              </div>
              <div className="a-field">
                <label className="a-label">Display order</label>
                <input className="a-input" type="number" value={form.display_order}
                       onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              </div>
            </div>

            <div className="a-field">
              <label className="a-label">Former {cfg.label} Names</label>
              <span className="a-field-help">
                Earlier or alternative spellings. Records saved under an old name keep
                resolving to this {cfg.label.toLowerCase()} without being rewritten.
              </span>
              <div className="a-chip-row">
                {form.former_names.map((n) => (
                  <span key={n} className="a-chip">
                    {n}
                    <button type="button" aria-label={`Remove ${n}`}
                            onClick={() => setForm({ ...form, former_names: form.former_names.filter((x) => x !== n) })}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="a-flex a-gap-2">
                <input className="a-input" value={aliasDraft} placeholder={`Add a former ${cfg.label.toLowerCase()} name…`}
                       onChange={(e) => setAliasDraft(e.target.value)}
                       onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }} />
                <button type="button" className="a-btn a-btn-secondary" onClick={addAlias}>Add</button>
              </div>
            </div>

            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={form.is_active}
                     onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active — available in dropdowns on the website
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title={`Delete ${cfg.label}`}
        message={`Delete this ${cfg.label.toLowerCase()}?`}
        subMessage={`Refused if anything still references it${cfg.child ? ` or if it has ${cfg.child.toLowerCase()}` : ""}.`}
      />
    </>
  );
}
