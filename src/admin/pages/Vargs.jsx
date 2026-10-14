import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const VIBHAGS = ["", "कोकण", "पुणे", "नाशिक", "छत्रपती संभाजीनगर", "अमरावती", "नागपूर"];

const EMPTY = {
  vibhag_mr: "", vibhag_en: "", district_mr: "", district_en: "",
  taluka: "", school_name: "", varg_name: "", coordinator_name: "",
  enrollment_count: 0, is_active: true, display_order: 0,
};

export default function Vargs() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [vibhag, setVibhag] = useState("");
  const [trash, setTrash] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();
  const debouncedSearch = useDebounce(search);

  const { data, meta, loading, error, refetch } = useList(
    "/admin/vargs",
    { page, limit, search: debouncedSearch, vibhag, trash: String(trash) },
    [page, limit, debouncedSearch, vibhag, trash]
  );

  function openNew() { setEditId(null); setForm(EMPTY); setFormOpen(true); }

  async function openEdit(row) {
    const res = await api.get(`/admin/vargs/${row.id}`);
    const d = res.data;
    setEditId(d.id);
    setForm({
      vibhag_mr: d.vibhag_mr || "", vibhag_en: d.vibhag_en || "",
      district_mr: d.district_mr || "", district_en: d.district_en || "",
      taluka: d.taluka || "", school_name: d.school_name || "",
      varg_name: d.varg_name || "", coordinator_name: d.coordinator_name || "",
      enrollment_count: d.enrollment_count || 0, is_active: d.is_active ?? true,
      display_order: d.display_order || 0,
    });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    await mutate(async () => {
      const body = { ...form, enrollment_count: Number(form.enrollment_count) || 0, display_order: Number(form.display_order) || 0 };
      if (editId) {
        await api.put(`/admin/vargs/${editId}`, body);
        toast.show("Varg updated", "ok");
      } else {
        await api.post("/admin/vargs", body);
        toast.show("Varg created", "ok");
      }
      setFormOpen(false);
      refetch();
    });
  }

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/vargs/${confirmId}`);
      toast.show("Moved to trash", "ok");
      setConfirmId(null);
      refetch();
    });
  }

  const columns = [
    { key: "vibhag_mr", label: "Division", render: (v) => <span className="td-bold">{v}</span> },
    { key: "district_mr", label: "District" },
    { key: "school_name", label: "School / Location", className: "td-truncate" },
    { key: "taluka", label: "Taluka", render: (v) => v || <span className="td-muted">—</span> },
    { key: "enrollment_count", label: "Enrolled", className: "td-muted a-tabular" },
    {
      key: "is_active", label: "Active",
      render: (v, row) => !trash && (
        <Switch on={v} onToggle={async () => {
          await mutate(async () => { await api.put(`/admin/vargs/${row.id}`, { ...row, is_active: !v }); refetch(); });
        }} />
      ),
    },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search vargs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={vibhag} onChange={(e) => { setVibhag(e.target.value); setPage(1); }}>
        <option value="">All divisions</option>
        {VIBHAGS.slice(1).map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={openNew}><Plus size={16} /> Add new</button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Amrut Vargs</h1>
          <p className="a-page-desc">Manage active classes across Maharashtra</p>
        </div>
      </div>
      <div className="a-tabs">
        <button className={`a-tab ${!trash ? "active" : ""}`} onClick={() => { setTrash(false); setPage(1); }}>Active</button>
        <button className={`a-tab ${trash ? "active" : ""}`} onClick={() => { setTrash(true); setPage(1); }}>Trash</button>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} meta={meta} onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            {trash ? (
              <button className="a-action-btn success" onClick={async () => { await mutate(async () => { await api.post(`/admin/vargs/${row.id}/restore`); toast.show("Restored", "ok"); refetch(); }); }} title="Restore"><RotateCcw size={15} /></button>
            ) : (
              <>
                <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
                <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
              </>
            )}
          </>
        )}
      />
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "Edit Varg" : "New Varg"} size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="a-btn a-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="a-form-section">
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">Division (Marathi)</label>
                <select className="a-input" value={form.vibhag_mr} onChange={(e) => setForm({ ...form, vibhag_mr: e.target.value })} required>
                  <option value="">Select division</option>
                  {VIBHAGS.slice(1).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="a-field">
                <label className="a-label">Division (English)</label>
                <input className="a-input" value={form.vibhag_en} onChange={(e) => setForm({ ...form, vibhag_en: e.target.value })} />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">District (Marathi)</label>
                <input className="a-input" value={form.district_mr} onChange={(e) => setForm({ ...form, district_mr: e.target.value })} required />
              </div>
              <div className="a-field">
                <label className="a-label">District (English)</label>
                <input className="a-input" value={form.district_en} onChange={(e) => setForm({ ...form, district_en: e.target.value })} />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Taluka</label>
                <input className="a-input" value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} />
              </div>
              <div className="a-field">
                <label className="a-label">Enrollment Count</label>
                <input className="a-input" type="number" min="0" value={form.enrollment_count} onChange={(e) => setForm({ ...form, enrollment_count: e.target.value })} />
              </div>
            </div>
            <div className="a-field">
              <label className="a-label a-label-required">School / Location Name</label>
              <input className="a-input" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} required />
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Varg Name</label>
                <input className="a-input" value={form.varg_name} onChange={(e) => setForm({ ...form, varg_name: e.target.value })} />
              </div>
              <div className="a-field">
                <label className="a-label">Coordinator Name</label>
                <input className="a-input" value={form.coordinator_name} onChange={(e) => setForm({ ...form, coordinator_name: e.target.value })} />
              </div>
            </div>
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={handleDelete} loading={saving} title="Delete Varg" message="Delete this varg?" />
    </>
  );
}
