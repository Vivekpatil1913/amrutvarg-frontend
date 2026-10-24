import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal, useConfirm } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { MASTER_UI } from "../lib/masters.js";

// The four masters are structurally identical, so one screen serves all of
// them. Adding and editing happen on their own page — see MasterForm.jsx.

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

export default function Masters({ master }) {
  const cfg = MASTER_UI[master];
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [parentId, setParentId] = useState("");
  const [grandId, setGrandId] = useState("");
  const debouncedSearch = useDebounce(search);

  const [parents, setParents] = useState([]);
  const [grands, setGrands] = useState([]);
  const [viewRow, setViewRow] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();
  const confirm = useConfirm();

  const { data, meta, loading, error, refetch } = useList(
    `/admin/masters/${cfg.key}`,
    {
      page, limit, search: debouncedSearch, status,
      ...(cfg.parent ? { [cfg.parent.column]: parentId } : {}),
      ...(cfg.grand ? { [cfg.grand.column]: grandId } : {}),
    },
    [page, limit, debouncedSearch, status, parentId, grandId, cfg.key]
  );

  // Parent options for the filters.
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

  useEffect(() => {
    loadParents();
    // Reset view state when switching between masters.
    setPage(1); setSearch(""); setStatus(""); setParentId(""); setGrandId("");
  }, [loadParents, cfg.key]);

  async function handleDelete() {
    await mutate(async () => {
      try {
        await api.del(`/admin/masters/${cfg.key}/${confirmId}`);
        toast.success(`${cfg.label} moved to trash`);
        setConfirmId(null);
        refetch();
      } catch (err) {
        // A dependency refusal is the useful case: say what blocks it.
        toast.error(errorMessage(err, `Could not delete that ${cfg.label.toLowerCase()}`));
        setConfirmId(null);
        throw err;
      }
    }).catch(() => {});
  }

  function toggleActive(row) {
    const activating = !row.is_active;
    const label = cfg.label.toLowerCase();
    confirm({
      title: `${activating ? "Activate" : "Deactivate"} ${cfg.label}`,
      message: `${activating ? "Activate" : "Deactivate"} ${label} "${row.name_mr}"?`,
      subMessage: activating
        ? "It will be available again in dropdowns and filters."
        : "It will no longer be offered in dropdowns. Existing records keep it.",
      tone: activating ? "primary" : "warning",
      confirmLabel: activating ? "Activate" : "Deactivate",
      errorText: `Could not change the ${label} status`,
      onConfirm: async () => {
        await api.put(`/admin/masters/${cfg.key}/${row.id}`, {
          name_mr: row.name_mr, name_en: row.name_en || "", code: row.code || "",
          former_names: row.former_names || [], is_active: activating,
          display_order: row.display_order || 0,
          ...(cfg.parent ? { [cfg.parent.column]: row[cfg.parent.column] } : {}),
        });
        toast.success(`${cfg.label} "${row.name_mr}" ${activating ? "activated" : "deactivated"}`);
        refetch();
      },
    });
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
        <button className="a-btn a-btn-primary" onClick={() => navigate(`/admin/masters/${cfg.key}/new`)}>
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
            <button className="a-action-btn"
                    onClick={() => navigate(`/admin/masters/${cfg.key}/${row.id}/edit`)} title="Edit">
              <Pencil size={15} />
            </button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      {/* View */}
      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title={`${cfg.label} Details`} size="lg"
             footer={
               <>
                 <button className="a-btn a-btn-ghost" onClick={() => setViewRow(null)}>Close</button>
                 <button className="a-btn a-btn-primary"
                         onClick={() => navigate(`/admin/masters/${cfg.key}/${viewRow.id}/edit`)}>
                   <Pencil size={15} /> Edit
                 </button>
               </>
             }>
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

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title={`Delete ${cfg.label}`}
        message={`Delete this ${cfg.label.toLowerCase()}?`}
        subMessage={`It will be moved to the trash and can be restored later. Refused if anything still references it${cfg.child ? ` or if it has ${cfg.child.toLowerCase()}` : ""}.`}
      />
    </>
  );
}
