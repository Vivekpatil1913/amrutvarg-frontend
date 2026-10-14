import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "info", label: "Info" },
  { value: "comingSoon", label: "Coming Soon" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_TONE = { new: "info", info: "neutral", comingSoon: "warn", urgent: "bad" };

const EMPTY_FORM = {
  title_mr: "", title_en: "", desc_mr: "", desc_en: "",
  link: "", link_label: "", date: "", until_date: "",
  status: "info", pinned: false, is_active: true, display_order: 0,
};

export default function Announcements() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [trash, setTrash] = useState(false);
  const debouncedSearch = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/announcements",
    { page, limit, search: debouncedSearch, status, trash: String(trash) },
    [page, limit, debouncedSearch, status, trash]
  );

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  async function openEdit(row) {
    const res = await api.get(`/admin/announcements/${row.id}`);
    setEditId(row.id);
    const d = res.data;
    setForm({
      title_mr: d.title_mr || "", title_en: d.title_en || "",
      desc_mr: d.desc_mr || "", desc_en: d.desc_en || "",
      link: d.link || "", link_label: d.link_label || "",
      date: d.date?.slice(0, 10) || "", until_date: d.until_date?.slice(0, 10) || "",
      status: d.status || "info", pinned: d.pinned || false,
      is_active: d.is_active ?? true, display_order: d.display_order || 0,
    });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    await mutate(async () => {
      const body = {
        ...form,
        link: form.link || null,
        link_label: form.link_label || null,
        date: form.date || null,
        until_date: form.until_date || null,
        display_order: Number(form.display_order) || 0,
      };
      if (editId) {
        await api.put(`/admin/announcements/${editId}`, body);
        toast.show("Announcement updated", "ok");
      } else {
        await api.post("/admin/announcements", body);
        toast.show("Announcement created", "ok");
      }
      setFormOpen(false);
      refetch();
    });
  }

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/announcements/${confirmId}`);
      toast.show("Moved to trash", "ok");
      setConfirmId(null);
      refetch();
    });
  }

  async function handleRestore(id) {
    await mutate(async () => {
      await api.post(`/admin/announcements/${id}/restore`);
      toast.show("Restored", "ok");
      refetch();
    });
  }

  const columns = [
    {
      key: "title_mr",
      label: "Title (Marathi)",
      render: (v) => <span className="td-bold td-truncate">{v}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge tone={STATUS_TONE[v] || "neutral"}>{v}</Badge>,
    },
    {
      key: "pinned",
      label: "Pinned",
      render: (v) => v ? <Badge tone="info">Pinned</Badge> : <span className="td-muted">—</span>,
    },
    {
      key: "is_active",
      label: "Active",
      render: (v, row) => !trash && (
        <Switch on={v} onToggle={() => toggleActive(row)} />
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : <span className="td-muted">—</span>,
    },
  ];

  async function toggleActive(row) {
    await mutate(async () => {
      await api.put(`/admin/announcements/${row.id}`, {
        ...row, is_active: !row.is_active,
        display_order: row.display_order || 0,
      });
      refetch();
    });
  }

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input
          className="a-search"
          placeholder="Search announcements…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <select className="a-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
          <h1 className="a-page-title">Announcements</h1>
          <p className="a-page-desc">Manage website announcements and notices</p>
        </div>
      </div>

      <div className="a-tabs">
        <button className={`a-tab ${!trash ? "active" : ""}`} onClick={() => { setTrash(false); setPage(1); }}>
          Active
        </button>
        <button className={`a-tab ${trash ? "active" : ""}`} onClick={() => { setTrash(true); setPage(1); }}>
          Trash
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        meta={meta}
        onPage={setPage}
        onPageSize={(n) => { setLimit(n); setPage(1); }}
        toolbar={toolbar}
        actions={(row) => (
          <>
            {trash ? (
              <button className="a-action-btn success" onClick={() => handleRestore(row.id)} title="Restore">
                <RotateCcw size={15} />
              </button>
            ) : (
              <>
                <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit">
                  <Pencil size={15} />
                </button>
                <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Edit Announcement" : "New Announcement"}
        size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="a-btn a-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="a-form-section">
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">Title (Marathi)</label>
                <input className="a-input" value={form.title_mr} onChange={(e) => setForm({ ...form, title_mr: e.target.value })} required maxLength={300} />
              </div>
              <div className="a-field">
                <label className="a-label">Title (English)</label>
                <input className="a-input" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} maxLength={300} />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Description (Marathi)</label>
                <textarea className="a-input a-textarea" value={form.desc_mr} onChange={(e) => setForm({ ...form, desc_mr: e.target.value })} rows={3} />
              </div>
              <div className="a-field">
                <label className="a-label">Description (English)</label>
                <textarea className="a-input a-textarea" value={form.desc_en} onChange={(e) => setForm({ ...form, desc_en: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Link URL</label>
                <input className="a-input" type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
              </div>
              <div className="a-field">
                <label className="a-label">Link Label</label>
                <input className="a-input" value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="Download PDF" />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-3">
              <div className="a-field">
                <label className="a-label">Date</label>
                <input className="a-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="a-field">
                <label className="a-label">Valid Until</label>
                <input className="a-input" type="date" value={form.until_date} onChange={(e) => setForm({ ...form, until_date: e.target.value })} />
              </div>
              <div className="a-field">
                <label className="a-label">Status</label>
                <select className="a-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.slice(1).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                Pin to top
              </label>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Announcement"
        message="Delete this announcement?"
      />
    </>
  );
}
