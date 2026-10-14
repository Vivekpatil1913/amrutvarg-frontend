import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const ROLES = [
  { value: "divisionalManager", label: "Divisional Manager" },
  { value: "districtManager", label: "District Manager" },
  { value: "dataEntry", label: "Data Entry" },
  { value: "sakhi", label: "Sakhi" },
  { value: "mitra", label: "Mitra" },
  { value: "amrutMitra", label: "Amrut Mitra" },
];

const DIVISIONS = ["कोकण", "पुणे", "नाशिक", "छत्रपती संभाजीनगर", "अमरावती", "नागपूर"];

const EMPTY = { division_mr: "", division_en: "", role: "divisionalManager", districts: [], name: "", email: "", phone: "", is_active: true, display_order: 0 };

export default function Contacts() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const [trash, setTrash] = useState(false);
  const debouncedSearch = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/contacts",
    { page, limit, search: debouncedSearch, division, trash: String(trash) },
    [page, limit, debouncedSearch, division, trash]
  );

  function openNew() { setEditId(null); setForm(EMPTY); setFormOpen(true); }

  async function openEdit(row) {
    const res = await api.get(`/admin/contacts/${row.id}`);
    const d = res.data;
    setEditId(d.id);
    setForm({ division_mr: d.division_mr, division_en: d.division_en || "", role: d.role, districts: d.districts || [], name: d.name, email: d.email || "", phone: d.phone || "", is_active: d.is_active ?? true, display_order: d.display_order || 0 });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    await mutate(async () => {
      const body = { ...form, display_order: Number(form.display_order) || 0 };
      if (editId) { await api.put(`/admin/contacts/${editId}`, body); toast.show("Contact updated", "ok"); }
      else { await api.post("/admin/contacts", body); toast.show("Contact created", "ok"); }
      setFormOpen(false);
      refetch();
    });
  }

  const columns = [
    { key: "name", label: "Name", render: (v) => <span className="td-bold">{v}</span> },
    { key: "role", label: "Role", render: (v) => <Badge tone="neutral">{ROLES.find((r) => r.value === v)?.label || v}</Badge> },
    { key: "division_mr", label: "Division" },
    { key: "phone", label: "Phone", render: (v) => v || <span className="td-muted">—</span> },
    { key: "email", label: "Email", render: (v) => v ? <span className="td-truncate">{v}</span> : <span className="td-muted">—</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search contacts…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={division} onChange={(e) => { setDivision(e.target.value); setPage(1); }}>
        <option value="">All divisions</option>
        {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
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
          <h1 className="a-page-title">District Contacts</h1>
          <p className="a-page-desc">Regional team contacts across Maharashtra</p>
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
              <button className="a-action-btn success" onClick={async () => { await mutate(async () => { await api.post(`/admin/contacts/${row.id}/restore`); toast.show("Restored", "ok"); refetch(); }); }} title="Restore"><RotateCcw size={15} /></button>
            ) : (
              <>
                <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
                <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
              </>
            )}
          </>
        )}
      />
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "Edit Contact" : "New Contact"} size="lg"
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
                <select className="a-input" value={form.division_mr} onChange={(e) => setForm({ ...form, division_mr: e.target.value })} required>
                  <option value="">Select division</option>
                  {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="a-field">
                <label className="a-label">Division (English)</label>
                <input className="a-input" value={form.division_en} onChange={(e) => setForm({ ...form, division_en: e.target.value })} />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">Name</label>
                <input className="a-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="a-field">
                <label className="a-label a-label-required">Role</label>
                <select className="a-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Phone</label>
                <input className="a-input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="a-field">
                <label className="a-label">Email</label>
                <input className="a-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="a-field">
              <label className="a-label">Districts (comma-separated)</label>
              <input className="a-input" value={form.districts.join(", ")}
                onChange={(e) => setForm({ ...form, districts: e.target.value.split(",").map((d) => d.trim()).filter(Boolean) })}
                placeholder="पुणे, सातारा, सोलापूर" />
            </div>
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={async () => { await mutate(async () => { await api.del(`/admin/contacts/${confirmId}`); toast.show("Moved to trash", "ok"); setConfirmId(null); refetch(); }); }} loading={saving} title="Delete Contact" message="Delete this contact?" />
    </>
  );
}
