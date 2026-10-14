import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "personality", label: "Personality" },
  { value: "confidence", label: "Confidence" },
  { value: "communication", label: "Communication" },
  { value: "leadership", label: "Leadership" },
  { value: "creativity", label: "Creativity" },
  { value: "discipline", label: "Discipline" },
  { value: "learning", label: "Learning" },
  { value: "social", label: "Social" },
  { value: "community", label: "Community" },
  { value: "challenges", label: "Challenges" },
  { value: "habits", label: "Habits" },
  { value: "group", label: "Group" },
];

const EMPTY = {
  slug: "", category: "personality", title_mr: "", title_en: "",
  short_mr: "", short_en: "", featured: false, published: false, display_order: 0,
  content: { mr: { intro: "", challenge: "", journey: "", change: "", lessons: "", conclusion: "" }, en: { intro: "", challenge: "", journey: "", change: "", lessons: "", conclusion: "" } },
};

function toSlug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function Stories() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState("");
  const debouncedSearch = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/stories",
    { page, limit, search: debouncedSearch, category, published },
    [page, limit, debouncedSearch, category, published]
  );

  function openNew() { setEditId(null); setForm(EMPTY); setFormOpen(true); }

  async function openEdit(row) {
    const res = await api.get(`/admin/stories/${row.id}`);
    const d = res.data;
    setEditId(d.id);
    setForm({
      slug: d.slug, category: d.category,
      title_mr: d.title_mr, title_en: d.title_en || "",
      short_mr: d.short_mr || "", short_en: d.short_en || "",
      featured: d.featured, published: d.published,
      display_order: d.display_order || 0,
      content: d.content || EMPTY.content,
    });
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    await mutate(async () => {
      const body = { ...form, display_order: Number(form.display_order) || 0 };
      if (editId) {
        await api.put(`/admin/stories/${editId}`, body);
        toast.show("Story updated", "ok");
      } else {
        await api.post("/admin/stories", body);
        toast.show("Story created", "ok");
      }
      setFormOpen(false);
      refetch();
    });
  }

  const columns = [
    { key: "title_mr", label: "Title (Marathi)", render: (v) => <span className="td-bold td-truncate">{v}</span> },
    { key: "category", label: "Category", render: (v) => <Badge tone="neutral">{v}</Badge> },
    {
      key: "featured", label: "Featured",
      render: (v) => v ? <Badge tone="warn">Featured</Badge> : <span className="td-muted">—</span>,
    },
    {
      key: "published", label: "Published",
      render: (v) => v ? <Badge tone="ok">Published</Badge> : <Badge tone="neutral">Draft</Badge>,
    },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search stories…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select className="a-select" value={published} onChange={(e) => { setPublished(e.target.value); setPage(1); }}>
        <option value="">All</option>
        <option value="true">Published</option>
        <option value="false">Drafts</option>
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={openNew}><Plus size={16} /> Add new</button>
      </div>
    </>
  );

  function setContent(lang, field, val) {
    setForm((f) => ({
      ...f,
      content: { ...f.content, [lang]: { ...f.content[lang], [field]: val } },
    }));
  }

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Yashogatha Stories</h1>
          <p className="a-page-desc">Manage success stories for the website</p>
        </div>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} meta={meta} onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            <>
                <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
                <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
              </>
          </>
        )}
      />
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "Edit Story" : "New Story"} size="xl"
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
                <label className="a-label a-label-required">Title (Marathi)</label>
                <input className="a-input" value={form.title_mr} onChange={(e) => setForm({ ...form, title_mr: e.target.value })} required />
              </div>
              <div className="a-field">
                <label className="a-label">Title (English)</label>
                <input className="a-input" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label a-label-required">Slug</label>
                <input className="a-input" value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: toSlug(e.target.value) })}
                  onBlur={(e) => { if (!form.slug && form.title_en) setForm({ ...form, slug: toSlug(form.title_en) }); }}
                  placeholder="my-story-slug" required />
              </div>
              <div className="a-field">
                <label className="a-label">Category</label>
                <select className="a-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.slice(1).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Short Description (Marathi)</label>
                <textarea className="a-input a-textarea" rows={2} value={form.short_mr} onChange={(e) => setForm({ ...form, short_mr: e.target.value })} />
              </div>
              <div className="a-field">
                <label className="a-label">Short Description (English)</label>
                <textarea className="a-input a-textarea" rows={2} value={form.short_en} onChange={(e) => setForm({ ...form, short_en: e.target.value })} />
              </div>
            </div>

            <hr className="a-form-divider" />
            <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--a-content-soft)" }}>STORY CONTENT (Marathi)</p>

            {["intro", "challenge", "journey", "change", "lessons", "conclusion"].map((field) => (
              <div className="a-field" key={`mr-${field}`}>
                <label className="a-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <textarea className="a-input a-textarea" rows={3} value={form.content?.mr?.[field] || ""} onChange={(e) => setContent("mr", field, e.target.value)} />
              </div>
            ))}

            <hr className="a-form-divider" />
            <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--a-content-soft)" }}>STORY CONTENT (English)</p>

            {["intro", "challenge", "journey", "change", "lessons", "conclusion"].map((field) => (
              <div className="a-field" key={`en-${field}`}>
                <label className="a-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <textarea className="a-input a-textarea" rows={3} value={form.content?.en?.[field] || ""} onChange={(e) => setContent("en", field, e.target.value)} />
              </div>
            ))}

            <hr className="a-form-divider" />
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Featured
              </label>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                Published
              </label>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={async () => { await mutate(async () => { await api.del(`/admin/stories/${confirmId}`); toast.show("Deleted", "ok"); setConfirmId(null); refetch(); }); }} loading={saving} title="Delete Story" message="Delete this story?" />
    </>
  );
}
